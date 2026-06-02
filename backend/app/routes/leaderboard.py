from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.models.user import User
from app.models.coding import CodingProgress
from app.models.pomodoro import PomodoroSession
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["Weekly Leaderboard"])

@router.get("")
async def get_weekly_leaderboard(user: User = Depends(get_current_user)):
    # 1. Fetch all users
    users = await User.find_all().to_list()
    
    # Calculate date 7 days ago
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    leaderboard_data = []
    
    for u in users:
        # Get coding progress
        coding_progress = await CodingProgress.find_one(CodingProgress.user_id == u.id)
        problems_solved = 0
        if coding_progress:
            # Self-healing backfill: sync checklist solves with daily_solved_count
            topic_names = {
                "Arrays", "Strings", "Linked Lists", "Stack", "Queue", "Trees", "Graphs", 
                "Heap", "Recursion", "Backtracking", "Greedy", "Dynamic Programming"
            }
            checklist_solved = sum(
                1 for k, v in coding_progress.dsa_progress.items()
                if k not in topic_names and v == "completed"
            )
            total_daily_solved = sum(coding_progress.daily_solved_count.values()) if coding_progress.daily_solved_count else 0
            
            if checklist_solved > total_daily_solved:
                diff = checklist_solved - total_daily_solved
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
                if not coding_progress.daily_solved_count:
                    coding_progress.daily_solved_count = {}
                coding_progress.daily_solved_count[today_str] = coding_progress.daily_solved_count.get(today_str, 0) + diff
                await coding_progress.save()

            # Sum solved in the last 7 days from daily_solved_count
            for day_offset in range(7):
                day_str = (datetime.utcnow() - timedelta(days=day_offset)).strftime("%Y-%m-%d")
                problems_solved += coding_progress.daily_solved_count.get(day_str, 0)
                
        # Get focus hours (pomodoro sessions) in the last 7 days
        sessions = await PomodoroSession.find(
            PomodoroSession.user_id == u.id,
            PomodoroSession.completed == True,
            PomodoroSession.created_at >= seven_days_ago
        ).to_list()
        focus_mins = sum(s.duration for s in sessions)
        focus_hours = round(focus_mins / 60.0, 1)
        
        # Calculate Leaderboard score
        # Formula: Solved problems * 10 + focus hours * 5
        score = (problems_solved * 10) + int(focus_hours * 5)
        
        leaderboard_data.append({
            "user_id": str(u.id),
            "name": u.name,
            "email": u.email,
            "avatar": u.avatar,
            "target_role": u.target_role or "Software Engineer",
            "college": u.college or "N/A",
            "weekly_problems_solved": problems_solved,
            "weekly_focus_hours": focus_hours,
            "score": score
        })
        
    # Sort by score descending
    leaderboard_data.sort(key=lambda x: x["score"], reverse=True)
    
    # Assign ranks
    for index, item in enumerate(leaderboard_data):
        item["rank"] = index + 1
        
    return leaderboard_data
