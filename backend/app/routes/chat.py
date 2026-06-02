import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.models.user import User
from app.models.chat import ChatMessage
from app.utils.auth import get_current_user
from app.utils.security import decode_token

logger = logging.getLogger("codepilot")
router = APIRouter(prefix="/api/chat", tags=["Community Chat"])

class MessageSendSchema(BaseModel):
    message: str
    recipient_id: Optional[str] = None

class ConnectionManager:
    def __init__(self):
        # Map user ID string to list of WebSockets
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} WebSocket connected. Active users: {len(self.active_connections)}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} WebSocket disconnected. Active users: {len(self.active_connections)}")

    async def broadcast(self, message_data: dict, recipient_id: Optional[str] = None, sender_id: Optional[str] = None):
        # If recipient_id is provided, send ONLY to sender and recipient connections
        if recipient_id:
            targets = [str(recipient_id)]
            if sender_id:
                targets.append(str(sender_id))
            
            for uid in targets:
                if uid in self.active_connections:
                    for connection in list(self.active_connections[uid]):
                        try:
                            await connection.send_json(message_data)
                        except Exception as e:
                            logger.error(f"Error broadcasting private message to user {uid}: {e}")
                            self.disconnect(uid, connection)
        else:
            # Broadcast to everyone (global room chat)
            for uid in list(self.active_connections.keys()):
                for connection in list(self.active_connections[uid]):
                    try:
                        await connection.send_json(message_data)
                    except Exception as e:
                        logger.error(f"Error broadcasting global message to user {uid}: {e}")
                        self.disconnect(uid, connection)

manager = ConnectionManager()

@router.get("/history")
async def get_chat_history(user: User = Depends(get_current_user)):
    # Fetch last 50 global messages (recipient_id is null)
    messages = await ChatMessage.find(ChatMessage.recipient_id == None).sort("-created_at").limit(50).to_list()
    messages.reverse()
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "user_name": m.user_name,
            "user_role": m.user_role,
            "message": m.message,
            "created_at": m.created_at
        } for m in messages
    ]

@router.get("/private/history/{other_user_id}")
async def get_private_chat_history(other_user_id: str, user: User = Depends(get_current_user)):
    try:
        other_oid = PydanticObjectId(other_user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid other user ID format."
        )
        
    # Fetch last 50 messages exchanged between user and other_user
    messages = await ChatMessage.find({
        "$or": [
            {"user_id": user.id, "recipient_id": other_oid},
            {"user_id": other_oid, "recipient_id": user.id}
        ]
    }).sort("-created_at").limit(50).to_list()

    
    messages.reverse()
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "user_name": m.user_name,
            "user_role": m.user_role,
            "recipient_id": str(m.recipient_id),
            "recipient_name": m.recipient_name,
            "message": m.message,
            "created_at": m.created_at
        } for m in messages
    ]

@router.post("/send")
async def send_chat_message(data: MessageSendSchema, user: User = Depends(get_current_user)):
    if not data.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )
        
    recipient_oid = None
    recipient_name = None
    
    if data.recipient_id:
        try:
            recipient_oid = PydanticObjectId(data.recipient_id)
            recipient = await User.get(recipient_oid)
            if not recipient:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Recipient user not found."
                )
            recipient_name = recipient.name
        except HTTPException as he:
            raise he
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid recipient ID format."
            )
            
    msg = ChatMessage(
        user_id=user.id,
        user_name=user.name,
        user_role=getattr(user, "role", "user"),
        recipient_id=recipient_oid,
        recipient_name=recipient_name,
        message=data.message.strip()
    )
    await msg.create()
    
    payload = {
        "type": "message",
        "id": str(msg.id),
        "user_id": str(msg.user_id),
        "user_name": msg.user_name,
        "user_role": msg.user_role,
        "recipient_id": str(msg.recipient_id) if msg.recipient_id else None,
        "recipient_name": msg.recipient_name,
        "message": msg.message,
        "created_at": msg.created_at.isoformat()
    }
    
    # Broadcast (targeted if private)
    await manager.broadcast(
        payload,
        recipient_id=str(msg.recipient_id) if msg.recipient_id else None,
        sender_id=str(msg.user_id)
    )
    return payload

@router.get("/active")
async def get_active_users(user: User = Depends(get_current_user)):
    # Active in the last 5 minutes
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    active_users = await User.find(User.last_active >= five_mins_ago).to_list()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "role": getattr(u, "role", "user"),
            "college": u.college or "N/A",
            "branch": u.branch or "N/A",
            "target_role": u.target_role or "Software Engineer",
            "last_active": getattr(u, "last_active", u.created_at)
        } for u in active_users
    ]

@router.delete("/delete/{message_id}")
async def delete_chat_message(message_id: str, user: User = Depends(get_current_user)):
    # Enforce admin permission
    if getattr(user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access only."
        )
    
    try:
         msg_oid = PydanticObjectId(message_id)
    except Exception:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Invalid message ID format."
         )
         
    msg = await ChatMessage.get(msg_oid)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found."
        )
        
    await msg.delete()
    
    payload = {
        "type": "delete",
        "id": message_id
    }
    
    await manager.broadcast(
        payload,
        recipient_id=str(msg.recipient_id) if msg.recipient_id else None,
        sender_id=str(msg.user_id)
    )
    return {"message": "Message deleted successfully."}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        user = await User.get(PydanticObjectId(user_id))
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user_id_str = str(user.id)
    await manager.connect(user_id_str, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                msg_text = parsed.get("message")
                target_recipient_id = parsed.get("recipient_id")
                
                if msg_text and msg_text.strip():
                    recipient_oid = None
                    recipient_name = None
                    if target_recipient_id:
                        recipient_oid = PydanticObjectId(target_recipient_id)
                        recipient = await User.get(recipient_oid)
                        if recipient:
                            recipient_name = recipient.name
                            
                    msg = ChatMessage(
                        user_id=user.id,
                        user_name=user.name,
                        user_role=getattr(user, "role", "user"),
                        recipient_id=recipient_oid,
                        recipient_name=recipient_name,
                        message=msg_text.strip()
                    )
                    await msg.create()
                    
                    # Touch user active state
                    user.last_active = datetime.utcnow()
                    await user.save()
                    
                    broadcast_payload = {
                        "type": "message",
                        "id": str(msg.id),
                        "user_id": str(msg.user_id),
                        "user_name": msg.user_name,
                        "user_role": msg.user_role,
                        "recipient_id": str(msg.recipient_id) if msg.recipient_id else None,
                        "recipient_name": msg.recipient_name,
                        "message": msg.message,
                        "created_at": msg.created_at.isoformat()
                    }
                    
                    await manager.broadcast(
                        broadcast_payload,
                        recipient_id=str(msg.recipient_id) if msg.recipient_id else None,
                        sender_id=user_id_str
                    )
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(user_id_str, websocket)
    except Exception as e:
        logger.error(f"WebSocket execution error for user {user_id_str}: {e}")
        manager.disconnect(user_id_str, websocket)
