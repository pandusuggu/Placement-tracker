import asyncio
import os
import sys
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.config.db import init_db
from app.models.user import User
from app.models.chat import ChatMessage
from app.models.coding import CodingProgress

async def run_private_chat_tests():
    await init_db()
    
    email_a = "student.a@example.com"
    email_b = "student.b@example.com"
    email_c = "student.c@example.com"
    email_admin = "chat.admin@example.com"
    
    # Cleanup pre-existing
    for email in [email_a, email_b, email_c, email_admin]:
        u = await User.find_one(User.email == email)
        if u:
            await CodingProgress.find(CodingProgress.user_id == u.id).delete()
            await ChatMessage.find({"$or": [{"user_id": u.id}, {"recipient_id": u.id}]}).delete()
            await u.delete()

            
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("1. Registering test accounts...")
        # A
        reg_a = await client.post("/api/auth/register", json={"name": "Student A", "email": email_a, "password": "password", "role": "user"})
        token_a = reg_a.json()["access_token"]
        id_a = reg_a.json()["user"]["id"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        
        # B
        reg_b = await client.post("/api/auth/register", json={"name": "Student B", "email": email_b, "password": "password", "role": "user"})
        token_b = reg_b.json()["access_token"]
        id_b = reg_b.json()["user"]["id"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        
        # C
        reg_c = await client.post("/api/auth/register", json={"name": "Student C", "email": email_c, "password": "password", "role": "user"})
        token_c = reg_c.json()["access_token"]
        id_c = reg_c.json()["user"]["id"]
        headers_c = {"Authorization": f"Bearer {token_c}"}
        
        # Admin
        reg_admin = await client.post("/api/auth/register", json={"name": "Admin", "email": email_admin, "password": "password", "role": "admin", "admin_passcode": "admin123"})
        token_admin = reg_admin.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {token_admin}"}

        print("2. A sends a global room message...")
        send_g = await client.post("/api/chat/send", json={"message": "Hello global room!"}, headers=headers_a)
        assert send_g.status_code == 200
        msg_g_id = send_g.json()["id"]

        print("3. A sends a private message to B...")
        send_p = await client.post("/api/chat/send", json={"message": "Hey B, this is private!", "recipient_id": id_b}, headers=headers_a)
        assert send_p.status_code == 200
        msg_p_id = send_p.json()["id"]
        assert send_p.json()["recipient_id"] == id_b
        assert send_p.json()["recipient_name"] == "Student B"

        print("4. Verifying history segregation...")
        # Global history should have the global message, but NOT the private message
        hist_g = await client.get("/api/chat/history", headers=headers_c)
        assert hist_g.status_code == 200
        assert len(hist_g.json()) == 1
        assert hist_g.json()[0]["id"] == msg_g_id
        assert all(m["id"] != msg_p_id for m in hist_g.json()), "Private message should not leak to global history"
        print("   Success! Private message did not leak into global chat history.")

        # Private history between A and B should contain the private message
        hist_p_a = await client.get(f"/api/chat/private/history/{id_b}", headers=headers_a)
        assert hist_p_a.status_code == 200
        assert len(hist_p_a.json()) == 1
        assert hist_p_a.json()[0]["id"] == msg_p_id
        print("   Success! A can see the private message in private chat history with B.")
        
        hist_p_b = await client.get(f"/api/chat/private/history/{id_a}", headers=headers_b)
        assert hist_p_b.status_code == 200
        assert len(hist_p_b.json()) == 1
        assert hist_p_b.json()[0]["id"] == msg_p_id
        print("   Success! B can see the private message in private chat history with A.")

        # User C should NOT be able to view private history between A and B (private history with B for C is empty)
        hist_p_c = await client.get(f"/api/chat/private/history/{id_b}", headers=headers_c)
        assert hist_p_c.status_code == 200
        assert len(hist_p_c.json()) == 0, "C should not see A and B's private messages"
        print("   Success! C cannot view B's private messages with A.")

        print("5. Testing private message deletion by Admin...")
        del_p = await client.delete(f"/api/chat/delete/{msg_p_id}", headers=headers_admin)
        assert del_p.status_code == 200
        
        db_check = await ChatMessage.get(msg_p_id)
        assert db_check is None
        print("   Success! Admin moderated and deleted private message successfully.")

        # Clean up
        for email in [email_a, email_b, email_c, email_admin]:
            u = await User.find_one(User.email == email)
            if u:
                await CodingProgress.find(CodingProgress.user_id == u.id).delete()
                await ChatMessage.find({"$or": [{"user_id": u.id}, {"recipient_id": u.id}]}).delete()
                await u.delete()

        print("   Cleaned up test accounts.")

if __name__ == "__main__":
    asyncio.run(run_private_chat_tests())
