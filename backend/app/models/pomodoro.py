from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class PomodoroSession(Document):
    user_id: PydanticObjectId
    duration: int  # in minutes
    mode: str = "25/5"  # "25/5", "50/10", "custom"
    completed: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "pomodoro_sessions"
