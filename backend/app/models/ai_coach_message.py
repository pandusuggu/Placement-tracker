from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class AICoachMessage(Document):
    user_id: PydanticObjectId
    role: str  # "user" or "assistant"
    content: str
    chat_type: str = "coach"  # "coach" or "prep"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ai_coach_messages"
