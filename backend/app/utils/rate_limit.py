from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from app.config.settings import settings
from app.models.user import User
from app.models.ai_log import AIRequestLog
from app.utils.auth import get_current_user

async def verify_ai_rate_limit(user: User = Depends(get_current_user)):
    # Admins are exempt from rate limits
    if getattr(user, "role", "user") == "admin":
        return user

    # 1. Minute-based rate limit
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    minute_count = await AIRequestLog.find(
        AIRequestLog.user_id == user.id,
        AIRequestLog.created_at >= one_minute_ago
    ).count()
    if minute_count >= settings.ai_rate_limit_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: Maximum {settings.ai_rate_limit_minute} AI requests per minute allowed."
        )

    # 2. Daily rate limit
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    daily_count = await AIRequestLog.find(
        AIRequestLog.user_id == user.id,
        AIRequestLog.created_at >= one_day_ago
    ).count()
    if daily_count >= settings.ai_rate_limit_daily:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit exceeded: Maximum {settings.ai_rate_limit_daily} AI requests per day allowed."
        )

    return user
