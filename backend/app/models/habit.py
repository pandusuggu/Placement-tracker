from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class Habit(Document):
    user_id: PydanticObjectId
    title: str
    description: Optional[str] = None
    frequency: str = "daily"  # "daily", "weekly"
    streak: int = 0
    longest_streak: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "habits"


class HabitLog(Document):
    user_id: PydanticObjectId
    habit_id: PydanticObjectId
    date: str  # Format: "YYYY-MM-DD"
    completed: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "habit_logs"
