from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List
import json

from .database import get_db, engine
from .models import Base
from . import crud, schemas, auth

app = FastAPI(title="Crowd Lunch API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

Base.metadata.create_all(bind=engine)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/auth/login")
async def login(login_request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_or_create_user(db, login_request.email)
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/menus/weekly", response_model=List[schemas.WeeklyMenuResponse])
async def get_weekly_menus(db: Session = Depends(get_db)):
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    
    crud.create_sample_menus(db)
    
    weekly_data = []
    current_date = monday
    while current_date <= friday:
        menus = crud.get_weekly_menus(db, current_date, current_date)
        weekly_data.append({
            "date": current_date,
            "menus": menus
        })
        current_date += timedelta(days=1)
    
    return weekly_data

@app.post("/orders", response_model=schemas.Order)
async def create_order(
    order: schemas.OrderCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    import os
    if os.getenv("TESTING") != "true":
        now = datetime.now()
        if now.hour >= 12:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="注文受付時間を過ぎています"
            )
    
    db_order = crud.create_order(db, order, current_user.id)
    
    await manager.broadcast(json.dumps({
        "type": "order_created",
        "order_id": db_order.id,
        "user_id": current_user.id
    }))
    
    return db_order

@app.get("/orders/{order_id}", response_model=schemas.Order)
async def get_order(
    order_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    
    if order.user_id != current_user.id and current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    
    return order

@app.patch("/orders/{order_id}/status", response_model=schemas.Order)
async def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    order = crud.update_order_status(db, order_id, status_update.status)
    if not order:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    
    await manager.broadcast(json.dumps({
        "type": "status_updated",
        "order_id": order.id,
        "status": order.status.value
    }))
    
    return order

@app.get("/admin/orders/today", response_model=List[schemas.Order])
async def get_today_orders(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    today = date.today()
    orders = crud.get_today_orders(db, today)
    return orders

@app.websocket("/ws/orders")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
