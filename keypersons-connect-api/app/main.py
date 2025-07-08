from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
import os

from . import auth, firestore_db, schemas

app = FastAPI(title="Keypersons Connect API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

security = HTTPBearer()

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/auth/register", response_model=schemas.UserResponse)
async def register(user_data: schemas.UserCreate):
    try:
        user = await firestore_db.create_user(user_data)
        access_token = auth.create_access_token(data={"sub": user.email})
        return schemas.UserResponse(
            user=user,
            access_token=access_token,
            token_type="bearer"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login", response_model=schemas.UserResponse)
async def login(login_data: schemas.LoginRequest):
    user = await firestore_db.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return schemas.UserResponse(
        user=user,
        access_token=access_token,
        token_type="bearer"
    )

@app.get("/users/me", response_model=schemas.User)
async def get_current_user_profile(
    current_user: schemas.User = Depends(auth.get_current_user)
):
    return current_user

@app.put("/users/me", response_model=schemas.User)
async def update_user_profile(
    user_update: schemas.UserUpdate,
    current_user: schemas.User = Depends(auth.get_current_user)
):
    updated_user = await firestore_db.update_user(current_user.id, user_update)
    return updated_user

@app.get("/users/search", response_model=List[schemas.UserPublic])
async def search_users(
    query: Optional[str] = None,
    industry: Optional[str] = None,
    location: Optional[str] = None,
    current_user: schemas.User = Depends(auth.get_current_user)
):
    users = await firestore_db.search_users(query, industry, location)
    return users
