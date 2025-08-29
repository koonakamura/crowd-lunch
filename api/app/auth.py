from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .schemas import User as UserSchema
import logging
import time

import os

SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

JWT_ISS = "crowd-lunch"
JWT_AUD = "admin"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
oauth2 = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if "exp" not in to_encode:
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": int(expire.timestamp())})
    
    if "iat" not in to_encode:
        to_encode.update({"iat": int(time.time())})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin(cred: HTTPAuthorizationCredentials = Depends(oauth2)):
    if cred is None:
        logging.warning({
            "event": "admin_auth_failed",
            "reason": "missing_token",
            "code": "missing_token"
        })
        raise HTTPException(401, detail={"code": "missing_token"})

    try:
        payload = jwt.decode(
            cred.credentials, SECRET_KEY,
            algorithms=["HS256"], 
            audience=JWT_AUD, 
            issuer=JWT_ISS, 
            options={"require": ["exp","iat","iss","aud"]}
        )
    except ExpiredSignatureError:
        logging.warning({
            "event": "admin_auth_failed",
            "reason": "token_expired",
            "code": "token_expired"
        })
        raise HTTPException(401, detail={"code": "token_expired"})
    except JWTClaimsError as e:
        if "Invalid audience" in str(e):
            logging.warning({
                "event": "admin_auth_failed",
                "reason": "aud_mismatch",
                "code": "aud_mismatch"
            })
            raise HTTPException(401, detail={"code": "aud_mismatch"})
        elif "Invalid issuer" in str(e):
            logging.warning({
                "event": "admin_auth_failed",
                "reason": "iss_mismatch", 
                "code": "iss_mismatch"
            })
            raise HTTPException(401, detail={"code": "iss_mismatch"})
        else:
            logging.warning({
                "event": "admin_auth_failed",
                "reason": "invalid_claims",
                "code": "invalid_token"
            })
            raise HTTPException(401, detail={"code": "invalid_token"})
    except JWTError:
        logging.warning({
            "event": "admin_auth_failed",
            "reason": "jwt_decode_error",
            "code": "invalid_token"
        })
        raise HTTPException(401, detail={"code": "invalid_token"})

    if payload.get("role") != "admin":
        logging.warning({
            "event": "admin_auth_failed",
            "reason": "insufficient_role",
            "code": "forbidden",
            "role": payload.get("role")
        })
        raise HTTPException(403, detail={"code":"forbidden"})
    
    logging.info({
        "event": "admin_auth_success",
        "sub": payload.get("sub"),
        "role": payload.get("role"),
        "iss": payload.get("iss"),
        "aud": payload.get("aud"),
        "exp": payload.get("exp")
    })
    return payload

def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), db: Session = Depends(get_db)):
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
