from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    EXECUTIVE = "executive"
    DECISION_MAKER = "decision_maker"
    EVENT_ORGANIZER = "event_organizer"
    OPERATOR = "operator"

class CompanySize(str, Enum):
    STARTUP = "startup"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    ENTERPRISE = "enterprise"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    company: str
    position: str
    role: UserRole
    industry: str
    location: str
    company_size: CompanySize
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    role: Optional[UserRole] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[CompanySize] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True

class UserPublic(BaseModel):
    id: str
    full_name: str
    company: str
    position: str
    role: UserRole
    industry: str
    location: str
    company_size: CompanySize
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None

class UserResponse(BaseModel):
    user: User
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
