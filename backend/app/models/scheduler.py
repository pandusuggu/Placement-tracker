from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class Goal(Document):
    user_id: PydanticObjectId
    title: str
    target_date: Optional[datetime] = None
    category: str = "study"  # "study", "projects", "interview_preparation"
    completed: bool = False
    progress: float = 0.0  # 0.0 to 100.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "goals"


class Schedule(Document):
    user_id: PydanticObjectId
    title: str
    day_of_week: int  # 0 = Monday, 6 = Sunday
    start_time: str  # "HH:MM"
    end_time: str  # "HH:MM"
    category: str = "study"  # "study", "coding", "personal"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "schedules"
