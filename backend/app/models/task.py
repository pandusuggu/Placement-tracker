from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class Task(Document):
    user_id: PydanticObjectId
    title: str
    description: Optional[str] = None
    status: str = "pending"  # "pending", "completed"
    priority: str = "medium"  # "low", "medium", "high", "urgent"
    category: str = "study"  # "study", "health", "personal", "projects", "interview_preparation", "work"
    due_date: Optional[datetime] = None
    recurring: str = "none"  # "none", "daily", "weekly"
    rescheduled_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tasks"
