from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class Notification(Document):
    user_id: PydanticObjectId
    title: str
    message: str
    notification_type: str = "reminder"  # "reminder", "habit", "study", "deadline", "alert"
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"
