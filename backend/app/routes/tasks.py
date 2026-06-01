from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.task import Task
from app.models.calendar import CalendarEvent
from app.utils.auth import get_current_user
from app.services.scheduler_service import SchedulerService

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

class TaskCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # "low", "medium", "high", "urgent"
    category: str = "study"  # "study", "health", "personal", "projects", "interview_preparation", "work"
    due_date: Optional[datetime] = None
    recurring: str = "none"  # "none", "daily", "weekly"

class TaskUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None  # "pending", "completed"
    due_date: Optional[datetime] = None
    recurring: Optional[str] = None

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreateSchema, user: User = Depends(get_current_user)):
    # Validate priorities & categories
    if data.priority not in ["low", "medium", "high", "urgent"]:
        raise HTTPException(status_code=400, detail="Invalid priority level")
        
    task = Task(
        user_id=user.id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        category=data.category,
        due_date=data.due_date,
        recurring=data.recurring
    )
    await task.create()

    # Synchronously generate corresponding calendar event for unified scheduling
    if data.due_date:
        from datetime import timedelta
        event = CalendarEvent(
            user_id=user.id,
            title=f"Task: {task.title}",
            description=task.description or "No description",
            start_time=data.due_date,
            end_time=data.due_date + timedelta(hours=1),
            event_type="task",
            reference_id=task.id
        )
        await event.create()
        
    return {"message": "Task created successfully", "task_id": str(task.id)}

@router.get("", response_model=List[dict])
async def list_tasks(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "due_date",  # "due_date", "priority", "created_at"
    user: User = Depends(get_current_user)
):
    query = Task.user_id == user.id
    
    # Building query checks
    filters = [Task.user_id == user.id]
    if status:
        filters.append(Task.status == status)
    if category:
        filters.append(Task.category == category)
    if priority:
        filters.append(Task.priority == priority)
        
    tasks_query = Task.find(*filters)
    
    # Retrieve all matches and filter in-memory for simple search
    tasks = await tasks_query.to_list()
    
    if search:
        search_lower = search.lower()
        tasks = [t for t in tasks if search_lower in t.title.lower() or (t.description and search_lower in t.description.lower())]
        
    # Sort
    if sort == "due_date":
        tasks.sort(key=lambda t: t.due_date if t.due_date else datetime.max)
    elif sort == "priority":
        priority_map = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        tasks.sort(key=lambda t: priority_map.get(t.priority, 2))
    elif sort == "created_at":
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        
    # Convert ObjectIds to strings
    result = []
    for t in tasks:
        item = t.model_dump()
        item["id"] = str(t.id)
        item["user_id"] = str(t.user_id)
        result.append(item)
        
    return result

@router.put("/{task_id}")
async def update_task(task_id: str, data: TaskUpdateSchema, user: User = Depends(get_current_user)):
    try:
        task = await Task.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Task ID format")
        
    if not task or task.user_id != user.id:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.priority is not None:
        task.priority = data.priority
    if data.category is not None:
        task.category = data.category
    if data.status is not None:
        task.status = data.status
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.recurring is not None:
        task.recurring = data.recurring
        
    await task.save()
    
    # Update linked calendar event if exists
    event = await CalendarEvent.find_one(CalendarEvent.reference_id == task.id)
    if event:
        event.title = f"Task: {task.title}"
        event.description = task.description or ""
        if data.due_date:
            from datetime import timedelta
            event.start_time = data.due_date
            event.end_time = data.due_date + timedelta(hours=1)
        await event.save()
    elif data.due_date and task.status != "completed":
        # Create a new event if it didn't exist before but due_date is now present
        from datetime import timedelta
        event = CalendarEvent(
            user_id=user.id,
            title=f"Task: {task.title}",
            description=task.description or "",
            start_time=data.due_date,
            end_time=data.due_date + timedelta(hours=1),
            event_type="task",
            reference_id=task.id
        )
        await event.create()
        
    # Delete calendar event if task is completed
    if task.status == "completed" and event:
        await event.delete()
        
    return {"message": "Task updated successfully", "task": {"id": str(task.id), "status": task.status}}

@router.delete("/{task_id}")
async def delete_task(task_id: str, user: User = Depends(get_current_user)):
    try:
        task = await Task.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Task ID format")
        
    if not task or task.user_id != user.id:
        raise HTTPException(status_code=404, detail="Task not found")
        
    await task.delete()
    
    # Delete corresponding calendar event
    event = await CalendarEvent.find_one(CalendarEvent.reference_id == task.id)
    if event:
        await event.delete()
        
    return {"message": "Task deleted successfully"}

@router.post("/reschedule")
async def trigger_smart_rescheduling(user: User = Depends(get_current_user)):
    rescheduled_count = await SchedulerService.smart_reschedule_missed_tasks(user.id)
    return {
        "message": f"Smart rescheduling evaluation complete. Overdue tasks updated.",
        "rescheduled_tasks_count": rescheduled_count
    }
