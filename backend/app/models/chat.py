from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class ChatMessage(Document):
    user_id: PydanticObjectId
    user_name: str
    user_role: str = "user"
    recipient_id: Optional[PydanticObjectId] = None
    recipient_name: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


    class Settings:
        name = "chat_messages"
