import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, status
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.config.settings import settings
from app.models.user import User
from app.models.task import Task
from app.models.habit import Habit, HabitLog
from app.models.pomodoro import PomodoroSession
from app.models.coding import CodingProgress
from app.models.recommendation import AIRecommendation
from app.models.roadmap import StudyRoadmap
from app.utils.auth import get_current_user
from app.utils.rate_limit import verify_ai_rate_limit
from app.services.ai_service import AIService

logger = logging.getLogger("codepilot")

router = APIRouter(prefix="/api/coach", tags=["AI Productivity Coach"])

@router.get("/diagnostic")
async def get_coach_diagnostic(user: User = Depends(get_current_user)):
    # 1. Gather stats for today / last 5 days
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    five_days_ago = datetime.utcnow() - timedelta(days=5)

    # Tasks stats for today
    tasks_today = await Task.find(
        Task.user_id == user.id,
        Task.created_at >= today_start
    ).to_list()
    tasks_total = len(tasks_today)
    tasks_completed = sum(1 for t in tasks_today if t.status == "completed")

    # Habits stats for today
    habits = await Habit.find(Habit.user_id == user.id).to_list()
    habits_total = len(habits)
    habits_completed = 0
    for h in habits:
        log = await HabitLog.find_one(
            HabitLog.habit_id == h.id,
            HabitLog.date == today_str,
            HabitLog.completed == True
        )
        if log:
            habits_completed += 1

    # Focus Sessions today
    pomodoro_sessions = await PomodoroSession.find(
        PomodoroSession.user_id == user.id,
        PomodoroSession.created_at >= today_start,
        PomodoroSession.completed == True
    ).to_list()
    focus_minutes = sum(s.duration for s in pomodoro_sessions)

    # Coding Solved today
    coding_progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    coding_solved_today = 0
    if coding_progress:
        coding_solved_today = coding_progress.daily_solved_count.get(today_str, 0)

    # 2. Call AI productivity analyst
    analysis = await AIService.analyze_productivity(
        tasks_completed=tasks_completed,
        tasks_total=tasks_total,
        habits_completed=habits_completed,
        habits_total=habits_total,
        focus_minutes=focus_minutes,
        coding_solved=coding_solved_today
    )

    # 3. Check for Burnout Indicators
    # Missed tasks in last 5 days
    missed_tasks = await Task.find(
        Task.user_id == user.id,
        Task.status == "pending",
        Task.due_date >= five_days_ago,
        Task.due_date < datetime.utcnow()
    ).to_list()
    
    # Assess if focus hours are declining (compare yesterday to today, or general dummy flags)
    focus_hours_decline = False
    yesterday_start = today_start - timedelta(days=1)
    yesterday_pomodoro = await PomodoroSession.find(
        PomodoroSession.user_id == user.id,
        PomodoroSession.created_at >= yesterday_start,
        PomodoroSession.created_at < today_start,
        PomodoroSession.completed == True
    ).to_list()
    yesterday_minutes = sum(s.duration for s in yesterday_pomodoro)
    
    if yesterday_minutes > 60 and focus_minutes < 15:
        focus_hours_decline = True

    # Call AI Burnout Engine
    burnout_results = await AIService.evaluate_burnout(
        missed_tasks_count=len(missed_tasks),
        focus_hours_decline=focus_hours_decline,
        consistency_drop=(len(missed_tasks) > 2),
        user_target=user.target_role or "Software Developer"
    )

    # 4. Save Insights to Recommendations collection (limit duplicates)
    # Delete old recommendations of same types to keep it clean
    await AIRecommendation.find(
        AIRecommendation.user_id == user.id,
        {"recommendation_type": {"$in": ["productivity", "burnout_alert"]}}
    ).delete()

    rec_prod = AIRecommendation(
        user_id=user.id,
        recommendation_type="productivity",
        title="AI Coaching Diagnostic 🧠",
        content=f"Productivity Score: {analysis['productivity_score']}/100. Insight: {analysis['insights']} Tomorrow's optimization tip: {analysis['optimization']}"
    )
    await rec_prod.create()

    if burnout_results["burnout_detected"]:
        rec_burnout = AIRecommendation(
            user_id=user.id,
            recommendation_type="burnout_alert",
            title="Burnout Warning Alert ⚠️",
            content=burnout_results["recovery_plan"],
            severity="critical"
        )
        await rec_burnout.create()

    # 5. Compile payload
    return {
        "productivity_score": analysis["productivity_score"],
        "insights": analysis["insights"],
        "optimization_suggestion": analysis["optimization"],
        "burnout": {
            "detected": burnout_results["burnout_detected"],
            "percentage": burnout_results["burnout_percentage"],
            "recovery_plan": burnout_results["recovery_plan"],
            "schedule_adjustments": burnout_results["schedule_adjustments"]
        }
    }

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class CoachChatInput(BaseModel):
    message: str
    history: List[ChatMessage] = []
    chat_type: Optional[str] = "coach"

@router.post("/chat")
async def coach_chat(data: CoachChatInput, user: User = Depends(verify_ai_rate_limit)):
    chat_type = data.chat_type or "coach"

    # 1. Fetch current study roadmap
    roadmap = await StudyRoadmap.find(StudyRoadmap.user_id == user.id).sort(-StudyRoadmap.created_at).first_or_none()
    
    # 2. Fetch tasks
    tasks = await Task.find(Task.user_id == user.id).to_list()
    tasks_str = "\n".join([f"- {t.title} ({t.status}, priority: {t.priority})" for t in tasks]) if tasks else "No tasks scheduled."
    
    # 3. Fetch habits
    habits = await Habit.find(Habit.user_id == user.id).to_list()
    habits_str = "\n".join([f"- {h.title} (streak: {h.streak} days)" for h in habits]) if habits else "No habits configured."

    # Build context prompt
    context = f"""
    You are the user's personal AI Productivity Coach.
    User Profile:
    - Target Role: {user.target_role or 'Not specified'}
    - Daily Available Hours: {user.daily_available_hours or 'Not specified'}
    
    Current Study Roadmap:
    """
    if roadmap:
        context += f"""
        - Topics to Master: {", ".join(roadmap.topics_to_learn)}
        - Daily Study Checklist:
        {roadmap.daily_plan}
        - Weekly Roadmap:
        {roadmap.weekly_roadmap}
        """
    else:
        context += "- No study roadmap generated yet.\n"
        
    context += f"""
    Current Tasks List:
    {tasks_str}
    
    Current Habits List:
    {habits_str}
    
    Answer the user's questions about their schedule, tasks, habits, or study plan. Be supportive, motivating, and highly actionable. Keep your responses concise (maximum 400-500 words) and formatted in readable markdown.
    Avoid any unnecessary introductory or concluding text (like greetings, pleasantries, or wrapping up statements) to save tokens.
    
    CRITICAL FORMATTING INSTRUCTIONS:
    - If the user's query is about a CODING PROBLEM, you MUST format your response EXACTLY as follows:
      1. Intuition
      2. Approach
      3. Java Solution
      4. Time Complexity
      5. Space Complexity
      Keep the explanation concise and under 500 words.
      
    - If the user's query is about any OTHER SUBJECT (e.g., core CS subjects like DBMS, OS, Networking, OOP, or aptitude/verbal topics), you MUST format your response EXACTLY as follows:
      1. Definition
      2. Key Concepts
      3. Interview Explanation
      4. Example
      5. Important Points
      Keep the answer concise and under 500 words.
    """

    # OPTIMIZING GROQ TOKEN USAGE WITH PERSISTENT CHAT HISTORY:
    # Limiting the context sent to Groq to only the last 2 messages (one user question and one assistant response)
    # drastically reduces token usage. Groq charges/limits are heavily influenced by prompt token count (TPM).
    # By only keeping the immediate previous Q&A turn, the LLM retains enough short-term memory to resolve
    # pronouns and follow-up context (e.g. "Give Java code for that solution", where "that" refers to the previous answer),
    # while preventing the payload from growing linearly with the conversation length.
    from app.models.ai_coach_message import AICoachMessage
    db_messages = await AICoachMessage.find(
        AICoachMessage.user_id == user.id,
        AICoachMessage.chat_type == chat_type
    ).sort(-AICoachMessage.created_at).limit(2).to_list()
    # Since they are fetched in descending order, we must reverse them to maintain chronological order
    db_messages.reverse()

    # Formulate messages for Groq API
    messages = [{"role": "system", "content": context}]
    for msg in db_messages:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": data.message})

    # Call central key-rotating LLM service
    response_text = "Sorry, I am unable to connect to the AI Coach service right now."
    try:
        response_text = await AIService.call_llm(
            messages=messages,
            user_id=user.id,
            temperature=0.3,
            max_tokens=700
        )
        # Store both user question and AI response in MongoDB
        try:
            user_msg_doc = AICoachMessage(
                user_id=user.id,
                role="user",
                content=data.message,
                chat_type=chat_type
            )
            await user_msg_doc.create()
            
            assistant_msg_doc = AICoachMessage(
                user_id=user.id,
                role="assistant",
                content=response_text,
                chat_type=chat_type
            )
            await assistant_msg_doc.create()
        except Exception as me:
            logger.error(f"Failed to persist chat messages in MongoDB: {me}")

        # Log AI Request in database
        try:
            from app.models.ai_log import AIRequestLog
            log_doc = AIRequestLog(user_id=user.id, request_type="coach_chat")
            await log_doc.create()
        except Exception as le:
            logger.error(f"Failed to log AI coach chat request: {le}")

    except Exception as e:
        logger.exception("AI Coach Chat invocation failed.")
            
    return {"response": response_text}

@router.get("/chat/history")
async def get_ai_chat_history(chat_type: str = "coach", user: User = Depends(get_current_user)):
    from app.models.ai_coach_message import AICoachMessage
    messages = await AICoachMessage.find(
        AICoachMessage.user_id == user.id,
        AICoachMessage.chat_type == chat_type
    ).sort(+AICoachMessage.created_at).to_list()
    return {
        "messages": [
            {
                "role": m.role,
                "content": m.content
            } for m in messages
        ]
    }

@router.delete("/chat/history")
async def clear_ai_chat_history(chat_type: str = "coach", user: User = Depends(get_current_user)):
    from app.models.ai_coach_message import AICoachMessage
    await AICoachMessage.find(
        AICoachMessage.user_id == user.id,
        AICoachMessage.chat_type == chat_type
    ).delete()
    return {"message": f"Successfully cleared chat history for {chat_type}."}

@router.get("/chat/limit-stats")
async def get_limit_stats(user: User = Depends(get_current_user)):
    from app.models.ai_log import AIRequestLog
    from datetime import datetime, timedelta
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    daily_count = await AIRequestLog.find(
        AIRequestLog.user_id == user.id,
        AIRequestLog.created_at >= one_day_ago
    ).count()
    remaining_today = max(0, 100 - daily_count)
    return {
        "remaining_today": remaining_today,
        "daily_count": daily_count,
        "daily_limit": 100
    }
