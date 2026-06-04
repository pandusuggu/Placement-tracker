from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.models.ai_log import AIRequestLog
from app.utils.auth import get_current_user

async def verify_ai_rate_limit(user: User = Depends(get_current_user)):
    # Admins are exempt from rate limits
    if getattr(user, "role", "user") == "admin":
        return user

    # 1. 2 requests per minute limit
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    minute_count = await AIRequestLog.find(
        AIRequestLog.user_id == user.id,
        AIRequestLog.created_at >= one_minute_ago
    ).count()
    if minute_count >= 2:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: Maximum 2 AI requests per minute allowed."
        )

    # 2. 100 requests per day limit
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    daily_count = await AIRequestLog.find(
        AIRequestLog.user_id == user.id,
        AIRequestLog.created_at >= one_day_ago
    ).count()
    if daily_count >= 100:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily limit exceeded: Maximum 100 AI requests per day allowed."
        )

    return user
