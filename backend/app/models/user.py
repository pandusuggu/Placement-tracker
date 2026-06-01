from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import EmailStr, Field

class User(Document):
    name: str
    email: EmailStr
    hashed_password: str
    avatar: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    target_role: Optional[str] = "Software Engineer"
    daily_available_hours: Optional[float] = 4.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Jane Doe",
                "email": "jane@example.com",
                "college": "State University",
                "branch": "Computer Science",
                "graduation_year": 2027,
                "target_role": "Full Stack Developer",
                "daily_available_hours": 6.0
            }
        }
