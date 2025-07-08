from typing import Optional, List
from datetime import datetime
import os
import uuid

from . import schemas, auth

users_db = {}

USERS_COLLECTION = "users"

async def create_user(user_data: schemas.UserCreate) -> schemas.User:
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise ValueError("User with this email already exists")
    
    hashed_password = auth.get_password_hash(user_data.password)
    
    user_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "company": user_data.company,
        "position": user_data.position,
        "role": user_data.role.value,
        "industry": user_data.industry,
        "location": user_data.location,
        "company_size": user_data.company_size.value,
        "bio": user_data.bio,
        "linkedin_url": user_data.linkedin_url,
        "website_url": user_data.website_url,
        "phone": user_data.phone,
        "password_hash": hashed_password,
        "created_at": now,
        "updated_at": now,
        "is_active": True
    }
    
    users_db[user_id] = user_doc
    
    user_doc_copy = user_doc.copy()
    user_doc_copy.pop("password_hash")
    return schemas.User(**user_doc_copy)

async def get_user_by_email(email: str) -> Optional[schemas.User]:
    for user_data in users_db.values():
        if user_data["email"] == email:
            user_data_copy = user_data.copy()
            user_data_copy.pop("password_hash", None)
            return schemas.User(**user_data_copy)
    
    return None

async def get_user_by_id(user_id: str) -> Optional[schemas.User]:
    if user_id in users_db:
        user_data = users_db[user_id].copy()
        user_data.pop("password_hash", None)
        return schemas.User(**user_data)
    
    return None

async def authenticate_user(email: str, password: str) -> Optional[schemas.User]:
    for user_data in users_db.values():
        if user_data["email"] == email:
            if auth.verify_password(password, user_data["password_hash"]):
                user_data_copy = user_data.copy()
                user_data_copy.pop("password_hash")
                return schemas.User(**user_data_copy)
    
    return None

async def update_user(user_id: str, user_update: schemas.UserUpdate) -> schemas.User:
    if user_id not in users_db:
        raise ValueError("User not found")
    
    user_data = users_db[user_id]
    for field, value in user_update.dict(exclude_unset=True).items():
        if value is not None:
            if hasattr(value, 'value'):  # Handle enum values
                user_data[field] = value.value
            else:
                user_data[field] = value
    
    user_data["updated_at"] = datetime.utcnow()
    
    user_data_copy = user_data.copy()
    user_data_copy.pop("password_hash", None)
    return schemas.User(**user_data_copy)

async def search_users(
    query: Optional[str] = None,
    industry: Optional[str] = None,
    location: Optional[str] = None
) -> List[schemas.UserPublic]:
    users = []
    
    for user_data in users_db.values():
        if not user_data.get("is_active", True):
            continue
            
        if industry and user_data.get("industry") != industry:
            continue
        if location and user_data.get("location") != location:
            continue
            
        if query:
            search_text = f"{user_data.get('full_name', '')} {user_data.get('company', '')} {user_data.get('position', '')}".lower()
            if query.lower() not in search_text:
                continue
        
        public_user = schemas.UserPublic(
            id=user_data["id"],
            full_name=user_data["full_name"],
            company=user_data["company"],
            position=user_data["position"],
            role=user_data["role"],
            industry=user_data["industry"],
            location=user_data["location"],
            company_size=user_data["company_size"],
            bio=user_data.get("bio"),
            linkedin_url=user_data.get("linkedin_url"),
            website_url=user_data.get("website_url")
        )
        users.append(public_user)
        
        if len(users) >= 50:
            break
    
    return users
