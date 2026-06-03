from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from app.models.user import User
from app.models.task import Task
from app.models.habit import Habit, HabitLog
from app.models.scheduler import Goal, Schedule
from app.models.calendar import CalendarEvent
from app.models.pomodoro import PomodoroSession
from app.models.coding import CodingProgress
from app.models.roadmap import StudyRoadmap
from app.models.recommendation import AIRecommendation
from app.models.reflection import DailyReflection
from app.models.notification import Notification
from app.models.analytics import Analytics, PlacementScore
from app.models.chat import ChatMessage
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin Control Panel"])

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if getattr(user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access only."
        )
    return user

@router.get("/stats")
async def get_admin_stats(admin: User = Depends(require_admin)):
    # 1. Total users count
    total_users = await User.count()
    
    # 2. Active users calculation
    # Online Now (active in the last 5 minutes)
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    online_now = await User.find(User.last_active >= five_mins_ago).count()
    
    # Active Today (active in the last 24 hours)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    active_today = await User.find(User.last_active >= one_day_ago).count()
    
    # 3. Tasks Created
    total_tasks = await Task.count()
    
    # 4. AI Queries Generated (Reflections + Study Plans + AI Coach suggestions)
    total_ai_queries = (
        await DailyReflection.count() +
        await StudyRoadmap.count() +
        await AIRecommendation.count()
    )
    
    # 5. Messages Sent
    total_messages = await ChatMessage.count()
    
    # 6. Study Plans Generated
    total_study_plans = await StudyRoadmap.count()
    
    # 7. Fetch all users list with their profiles and activity timestamps
    users = await User.find_all().to_list()
    users_list = []
    for u in users:
        users_list.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "college": u.college or "N/A",
            "branch": u.branch or "N/A",
            "target_role": u.target_role or "Software Engineer",
            "role": getattr(u, "role", "user"),
            "created_at": u.created_at,
            "last_active": getattr(u, "last_active", u.created_at)
        })
        
    return {
        "total_users": total_users,
        "online_now": online_now,
        "active_today": active_today,
        "total_tasks": total_tasks,
        "total_ai_queries": total_ai_queries,
        "total_messages": total_messages,
        "total_study_plans": total_study_plans,
        "users": users_list
    }

@router.delete("/users/{user_id}")
async def delete_student_user(user_id: str, admin: User = Depends(require_admin)):
    try:
        user_oid = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
        
    # Check if user exists
    user = await User.get(user_oid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Prevent admins from deleting themselves to avoid locking themselves out
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account."
        )
        
    # Perform cascading deletes
    await Task.find(Task.user_id == user_oid).delete()
    await Habit.find(Habit.user_id == user_oid).delete()
    await HabitLog.find(HabitLog.user_id == user_oid).delete()
    await Goal.find(Goal.user_id == user_oid).delete()
    await Schedule.find(Schedule.user_id == user_oid).delete()
    await CalendarEvent.find(CalendarEvent.user_id == user_oid).delete()
    await PomodoroSession.find(PomodoroSession.user_id == user_oid).delete()
    await CodingProgress.find(CodingProgress.user_id == user_oid).delete()
    await StudyRoadmap.find(StudyRoadmap.user_id == user_oid).delete()
    await AIRecommendation.find(AIRecommendation.user_id == user_oid).delete()
    await DailyReflection.find(DailyReflection.user_id == user_oid).delete()
    await Notification.find(Notification.user_id == user_oid).delete()
    await Analytics.find(Analytics.user_id == user_oid).delete()
    await PlacementScore.find(PlacementScore.user_id == user_oid).delete()
    
    # Delete the user document itself
    await user.delete()
    
    return {"message": f"Successfully deleted user '{user.name}' and all associated dashboard records."}
