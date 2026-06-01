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

@router.post("/chat")
async def coach_chat(data: CoachChatInput, user: User = Depends(get_current_user)):
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
    
    Answer the user's questions about their schedule, tasks, habits, or study plan. Be supportive, motivating, and highly actionable. Keep your responses concise and formatted in readable markdown.
    """

    # Formulate messages for Groq API
    messages = [{"role": "system", "content": context}]
    for msg in data.history[-10:]:  # Keep last 10 messages for context
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": data.message})

    # Call Groq API
    response_text = "Sorry, I am unable to connect to the AI Coach service right now."
    if settings.groq_api_key:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": messages,
                "temperature": 0.4
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                if response.status_code == 200:
                    res_json = response.json()
                    response_text = res_json["choices"][0]["message"]["content"].strip()
                else:
                    logger.error(f"Groq API chat failed: {response.text}")
        except Exception as e:
            logger.exception("AI Coach Chat invocation failed.")
            
    return {"response": response_text}
