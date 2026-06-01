from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.calendar import CalendarEvent
from app.models.task import Task
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

class EventCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: str = "custom"  # "task", "habit", "study_session", "custom"

class EventUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    event_type: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(data: EventCreateSchema, user: User = Depends(get_current_user)):
    if data.end_time < data.start_time:
        raise HTTPException(status_code=400, detail="End time cannot be prior to start time")
        
    event = CalendarEvent(
        user_id=user.id,
        title=data.title,
        description=data.description,
        start_time=data.start_time,
        end_time=data.end_time,
        event_type=data.event_type
    )
    await event.create()
    return {"message": "Calendar event created successfully", "event_id": str(event.id)}

@router.get("", response_model=List[dict])
async def list_calendar_events(user: User = Depends(get_current_user)):
    # 1. Fetch custom events
    events = await CalendarEvent.find(CalendarEvent.user_id == user.id).to_list()
    
    result = []
    for e in events:
        item = e.model_dump()
        item["id"] = str(e.id)
        item["user_id"] = str(e.user_id)
        if e.reference_id:
            item["reference_id"] = str(e.reference_id)
        result.append(item)

    # 2. To ensure tasks with due_dates appear in the calendar even if event sync was skipped,
    # let's merge tasks that have due_date on-the-fly, ensuring they don't double count if already in events.
    seen_refs = {e.reference_id for e in events if e.reference_id}
    
    tasks = await Task.find(
        Task.user_id == user.id,
        Task.due_date != None,
        Task.status == "pending"
    ).to_list()
    
    for t in tasks:
        if t.id not in seen_refs:
            result.append({
                "id": f"task-virtual-{str(t.id)}",
                "user_id": str(user.id),
                "title": f"Task: {t.title}",
                "description": t.description or "No description provided.",
                "start_time": t.due_date,
                "end_time": t.due_date + timedelta(hours=1),
                "event_type": "task",
                "reference_id": str(t.id)
            })
            
    return result

@router.put("/{event_id}")
async def update_event(event_id: str, data: EventUpdateSchema, user: User = Depends(get_current_user)):
    try:
        event_oid = PydanticObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Event ID")
        
    event = await CalendarEvent.get(event_oid)
    if not event or event.user_id != user.id:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if data.title is not None:
        event.title = data.title
    if data.description is not None:
        event.description = data.description
    if data.start_time is not None:
        event.start_time = data.start_time
    if data.end_time is not None:
        event.end_time = data.end_time
    if data.event_type is not None:
        event.event_type = data.event_type
        
    if event.end_time < event.start_time:
        raise HTTPException(status_code=400, detail="End time cannot be prior to start time")
        
    await event.save()
    
    # If this is linked to a task, update the task's due date
    if event.reference_id and event.event_type == "task":
        task = await Task.get(event.reference_id)
        if task:
            task.title = event.title.replace("Task: ", "")
            task.due_date = event.start_time
            await task.save()
            
    return {"message": "Event updated successfully", "event": {"id": str(event.id)}}

@router.delete("/{event_id}")
async def delete_event(event_id: str, user: User = Depends(get_current_user)):
    try:
        event_oid = PydanticObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Event ID")
        
    event = await CalendarEvent.get(event_oid)
    if not event or event.user_id != user.id:
        raise HTTPException(status_code=404, detail="Event not found")
        
    await event.delete()
    return {"message": "Calendar event deleted successfully"}
