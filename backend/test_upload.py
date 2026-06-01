import asyncio
import httpx
from app.config.db import init_db
from app.models.user import User
from app.utils.security import create_access_token

async def test():
    # Init DB to query a user
    await init_db()
    
    user = await User.find_one()
    if not user:
        print("No user found in database.")
        return
        
    print(f"Testing with user: {user.email} (ID: {user.id})")
    
    token = create_access_token(user.id)
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Send request to port 8001
    async with httpx.AsyncClient() as client:
        # Create a mock file
        files = {
            "file": ("resume.txt", b"This is a mock resume text with Python, React, and MongoDB experience. Built multiple web apps.", "text/plain")
        }
        res = await client.post("http://localhost:8002/api/placement/resume/analyze", headers=headers, files=files)
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")

asyncio.run(test())
