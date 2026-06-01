from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.pomodoro import PomodoroSession
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/pomodoro", tags=["Pomodoro"])

class PomodoroLogSchema(BaseModel):
    duration: int
    mode: str = "25/5"  # "25/5", "50/10", "custom"
    completed: bool = True

@router.post("", status_code=status.HTTP_201_CREATED)
async def log_session(data: PomodoroLogSchema, user: User = Depends(get_current_user)):
    session = PomodoroSession(
        user_id=user.id,
        duration=data.duration,
        mode=data.mode,
        completed=data.completed
    )
    await session.create()
    return {"message": "Focus session logged successfully", "session_id": str(session.id)}

@router.get("", response_model=dict)
async def get_pomodoro_history(user: User = Depends(get_current_user)):
    sessions = await PomodoroSession.find(
        PomodoroSession.user_id == user.id
    ).sort(-PomodoroSession.created_at).to_list()
    
    total_minutes = sum(s.duration for s in sessions if s.completed)
    completed_sessions = sum(1 for s in sessions if s.completed)
    
    # Calculate today's focus minutes
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = [s for s in sessions if s.created_at >= today_start and s.completed]
    today_minutes = sum(s.duration for s in today_sessions)
    
    result_sessions = []
    for s in sessions[:30]:  # Return recent 30 sessions
        item = s.model_dump()
        item["id"] = str(s.id)
        item["user_id"] = str(s.user_id)
        result_sessions.append(item)
        
    return {
        "total_minutes": total_minutes,
        "completed_count": completed_sessions,
        "today_minutes": today_minutes,
        "history": result_sessions
    }
