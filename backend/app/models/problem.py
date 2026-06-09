from datetime import datetime
from typing import Dict, List
from beanie import Document
from pydantic import Field

class ProblemDetail(Document):
    question_id: str  # e.g., "contains-duplicate"
    title: str
    difficulty: str
    description: str  # Markdown text explaining constraints & problem
    templates: Dict[str, str]  # e.g., {"python": "class Solution...", "java": "..."}
    harnesses: Dict[str, str]  # Assertion scripts to run against user code
    topics: List[str] = Field(default_factory=list)
    companies: List[str] = Field(default_factory=list)
    hints: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "problem_details"
