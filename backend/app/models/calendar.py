from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class CalendarEvent(Document):
    user_id: PydanticObjectId
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    event_type: str = "custom"  # "task", "habit", "study_session", "custom"
    reference_id: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "calendar_events"
