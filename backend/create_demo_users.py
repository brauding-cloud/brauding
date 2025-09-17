#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib
import uuid
import os
from datetime import datetime, timezone

async def create_demo_users():
    # MongoDB connection
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["production_system"]
    
    def hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
    
    # Demo users
    users = [
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password": hash_password("admin123"),
            "role": "manager",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "username": "worker",
            "password": hash_password("worker123"),
            "role": "employee",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clear existing users
    await db.users.delete_many({})
    
    # Insert demo users
    await db.users.insert_many(users)
    print("✅ Demo users created successfully!")
    print("Manager: admin / admin123")
    print("Employee: worker / worker123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_demo_users())