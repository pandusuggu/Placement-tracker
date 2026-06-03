from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class AIRequestLog(Document):
    user_id: Optional[PydanticObjectId] = None
    request_type: str = "llm_call"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ai_request_logs"
