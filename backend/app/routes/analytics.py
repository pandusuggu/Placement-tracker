from datetime import datetime, timedelta
from typing import List, Dict
from fastapi import APIRouter, Depends
from app.models.user import User
from app.models.task import Task
from app.models.habit import Habit, HabitLog
from app.models.pomodoro import PomodoroSession
from app.models.coding import CodingProgress
from app.models.analytics import Analytics
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics Engine"])

@router.get("")
async def get_analytics_report(user: User = Depends(get_current_user)):
    """
    Computes and returns daily stats for the last 7 days for frontend chart plotting.
    Also returns aggregated weekly scores.
    """
    now = datetime.utcnow()
    last_7_days = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        last_7_days.append(day.strftime("%Y-%m-%d"))

    daily_chart_data = []
    
    # Pre-fetch elements to optimize
    all_tasks = await Task.find(Task.user_id == user.id).to_list()
    all_sessions = await PomodoroSession.find(PomodoroSession.user_id == user.id, PomodoroSession.completed == True).to_list()
    all_habits = await Habit.find(Habit.user_id == user.id).to_list()
    all_logs = await HabitLog.find(HabitLog.user_id == user.id, HabitLog.completed == True).to_list()
    
    coding_progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)

    total_focus_min = 0
    total_tasks_done = 0
    total_habits_done = 0

    for day_str in last_7_days:
        # 1. Parse tasks completed/total on this day
        # For simplicity, filter tasks created on or before this day, and due or completed on this day
        # Let's count tasks completed on this day or due today
        day_date = datetime.strptime(day_str, "%Y-%m-%d").date()
        
        # Approximate task totals
        tasks_on_day = [t for t in all_tasks if (t.due_date and t.due_date.date() == day_date) or (not t.due_date and t.created_at.date() == day_date)]
        tasks_total = len(tasks_on_day)
        tasks_completed = sum(1 for t in tasks_on_day if t.status == "completed")
        
        # 2. Parse habits ticked on this day
        habits_completed = sum(1 for log in all_logs if log.date == day_str)
        habits_total = len(all_habits)

        # 3. Parse focus minutes logged on this day
        focus_sessions = [s for s in all_sessions if s.created_at.strftime("%Y-%m-%d") == day_str]
        focus_min = sum(s.duration for s in focus_sessions)

        # 4. Coding solved on this day
        coding_solved = 0
        if coding_progress:
            coding_solved = coding_progress.daily_solved_count.get(day_str, 0)

        # Calculate a daily productivity score: (completed tasks / total)*40 + (habits / total)*30 + min(focus, 120)/120 * 30
        task_ratio = tasks_completed / max(tasks_total, 1)
        habit_ratio = habits_completed / max(habits_total, 1)
        focus_ratio = min(focus_min, 120) / 120.0
        
        prod_score = int((task_ratio * 40) + (habit_ratio * 30) + (focus_ratio * 30))
        prod_score = max(min(prod_score, 100), 10 if (tasks_total > 0 or habits_total > 0 or focus_min > 0) else 0)

        total_focus_min += focus_min
        total_tasks_done += tasks_completed
        total_habits_done += habits_completed

        daily_chart_data.append({
            "date": day_str,
            "tasks_completed": tasks_completed,
            "tasks_total": tasks_total,
            "habits_completed": habits_completed,
            "habits_total": habits_total,
            "focus_minutes": focus_min,
            "coding_solved": coding_solved,
            "productivity_score": prod_score
        })

    # Summary calculations
    dsa_count = sum(1 for val in coding_progress.dsa_progress.values() if val == "completed") if coding_progress else 0
    
    return {
        "weekly_metrics": {
            "total_focus_minutes": total_focus_min,
            "tasks_completed_count": total_tasks_done,
            "habits_completed_count": total_habits_done,
            "average_productivity_score": int(sum(d["productivity_score"] for d in daily_chart_data) / len(daily_chart_data))
        },
        "daily_chart": daily_chart_data
    }
