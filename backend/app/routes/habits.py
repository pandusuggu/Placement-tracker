from datetime import datetime, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.habit import Habit, HabitLog
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/habits", tags=["Habits"])

class HabitCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    frequency: str = "daily"

class CheckInSchema(BaseModel):
    date: str  # "YYYY-MM-DD"
    completed: bool = True

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_habit(data: HabitCreateSchema, user: User = Depends(get_current_user)):
    habit = Habit(
        user_id=user.id,
        title=data.title,
        description=data.description,
        frequency=data.frequency
    )
    await habit.create()
    return {"message": "Habit created successfully", "habit_id": str(habit.id)}

@router.get("", response_model=List[dict])
async def list_habits(user: User = Depends(get_current_user)):
    habits = await Habit.find(Habit.user_id == user.id).to_list()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    result = []
    for h in habits:
        # Check if completed today
        checked_today = await HabitLog.find_one(
            HabitLog.habit_id == h.id,
            HabitLog.date == today_str,
            HabitLog.completed == True
        )
        
        item = h.model_dump()
        item["id"] = str(h.id)
        item["user_id"] = str(h.user_id)
        item["completed_today"] = checked_today is not None
        result.append(item)
        
    return result

@router.post("/{habit_id}/check")
async def toggle_check_in(habit_id: str, data: CheckInSchema, user: User = Depends(get_current_user)):
    try:
        habit_oid = PydanticObjectId(habit_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Habit ID")
        
    habit = await Habit.get(habit_oid)
    if not habit or habit.user_id != user.id:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    # Check if a log already exists for this date
    log = await HabitLog.find_one(
        HabitLog.habit_id == habit.id,
        HabitLog.date == data.date
    )
    
    if data.completed:
        if not log:
            log = HabitLog(
                user_id=user.id,
                habit_id=habit.id,
                date=data.date,
                completed=True
            )
            await log.create()
        else:
            log.completed = True
            await log.save()
            
        # Recalculate streak
        # Let's count consecutive days backwards starting from the check-in date
        try:
            check_date = datetime.strptime(data.date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            
        streak = 1
        current_check = check_date - timedelta(days=1)
        
        while True:
            prev_date_str = current_check.strftime("%Y-%m-%d")
            prev_log = await HabitLog.find_one(
                HabitLog.habit_id == habit.id,
                HabitLog.date == prev_date_str,
                HabitLog.completed == True
            )
            if prev_log:
                streak += 1
                current_check -= timedelta(days=1)
            else:
                break
                
        # Update streak values
        habit.streak = max(habit.streak, streak)
        habit.longest_streak = max(habit.longest_streak, habit.streak)
        await habit.save()
    else:
        # Mark completed as False or delete
        if log:
            await log.delete()
            
        # Reset current streak to 0 if unticked for today/yesterday
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        if data.date == today_str:
            habit.streak = 0
            await habit.save()
            
    return {
        "message": "Habit check-in status toggled",
        "habit": {
            "id": str(habit.id),
            "streak": habit.streak,
            "longest_streak": habit.longest_streak
        }
    }

@router.get("/heatmap", response_model=Dict[str, int])
async def get_heatmap_stats(user: User = Depends(get_current_user)):
    """
    Returns an aggregated dictionary containing completion counts for dates:
    {"2026-05-30": 3, "2026-05-29": 1}
    """
    logs = await HabitLog.find(
        HabitLog.user_id == user.id,
        HabitLog.completed == True
    ).to_list()
    
    heatmap = {}
    for log in logs:
        heatmap[log.date] = heatmap.get(log.date, 0) + 1
        
    return heatmap

@router.delete("/{habit_id}")
async def delete_habit(habit_id: str, user: User = Depends(get_current_user)):
    try:
        habit_oid = PydanticObjectId(habit_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Habit ID")
        
    habit = await Habit.get(habit_oid)
    if not habit or habit.user_id != user.id:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    # Delete logs
    await HabitLog.find(HabitLog.habit_id == habit.id).delete()
    await habit.delete()
    
    return {"message": "Habit and its history deleted successfully"}
