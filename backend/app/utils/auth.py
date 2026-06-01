from fastapi import Depends, HTTPException, status
from beanie import PydanticObjectId
from app.utils.security import oauth2_scheme, decode_token
from app.models.user import User

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    try:
        user = await User.get(PydanticObjectId(user_id))
        if user is None:
            raise credentials_exception
        return user
    except Exception:
        raise credentials_exception
