import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    mongodb_uri: str = Field(default="mongodb://localhost:27017/codepilot", alias="MONGODB_URI")
    jwt_secret: str = Field(default="supersecretjwtkeyforcodepilotai2026", alias="JWT_SECRET")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_api_keys: str = Field(default="", alias="GEMINI_API_KEYS")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_api_keys: str = Field(default="", alias="GROQ_API_KEYS")
    port: int = Field(default=8000, alias="PORT")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    admin_passcode: str = Field(default="admin123", alias="ADMIN_PASSCODE")
    rapidapi_key: str = Field(default="", alias="RAPIDAPI_KEY")
    jdoodle_client_id: str = Field(default="", alias="JDOODLE_CLIENT_ID")
    jdoodle_client_secret: str = Field(default="", alias="JDOODLE_CLIENT_SECRET")
    onlinecompiler_api_key: str = Field(default="", alias="ONLINECOMPILER_API_KEY")
    ai_rate_limit_minute: int = Field(default=10, alias="AI_RATE_LIMIT_MINUTE")
    ai_rate_limit_daily: int = Field(default=200, alias="AI_RATE_LIMIT_DAILY")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
