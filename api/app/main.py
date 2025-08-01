from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List
import json
import os
import uuid
from pathlib import Path
import logging

from .database import get_db, engine, create_db_and_tables
from .models import Base
from . import crud, schemas, auth, models
from .time_utils import validate_delivery_time

app = FastAPI(title="Crowd Lunch API", version="1.0.0")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logging.exception("Validation error occurred: %s", exc)
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error occurred"}
    )

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

Base.metadata.create_all(bind=engine)
create_db_and_tables()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
    from datetime import timezone, timedelta as td
    jst = timezone(td(hours=9))
    today = datetime.now(jst).date()
    start_date = today
    end_date = today + timedelta(days=6)
    
    menus = crud.get_weekly_menus(db, start_date, end_date)
    
    weekly_menus = {}
    for menu in menus:
        serve_date = menu['serve_date']
        if serve_date not in weekly_menus:
            weekly_menus[serve_date] = []
        weekly_menus[serve_date].append(menu)
    
    result = []
    for date_key, menu_list in weekly_menus.items():
        result.append({
            "date": date_key,
            "menus": menu_list
        })
    
    return result


@app.get("/menus", response_model=List[schemas.MenuSQLAlchemyResponse])
async def get_menus_by_date(
    date: date = None,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    menus = crud.get_menus_sqlalchemy(db, date)
    if not menus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    return menus

@app.post("/orders", response_model=schemas.Order, 
         summary="Create Order (Requires Bearer Token)",
         description="Create a new order. **Authentication required**: Include Bearer token in Authorization header.")
async def create_order(
    order: schemas.OrderCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    import os
    if os.getenv("TESTING") != "true":
        if order.request_time and not validate_delivery_time(order.request_time):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"配達時間「{order.request_time}」の受付時間を過ぎています"
            )
    
    db_order = crud.create_order(db, order, current_user.id)
    
    await manager.broadcast(json.dumps({
        "type": "order_created",
        "order_id": db_order.id,
        "user_id": current_user.id
    }))
    
    return db_order

@app.post("/orders/guest", response_model=schemas.Order,
         summary="Create Guest Order (No Authentication Required)", 
         description="Create a guest order with department and name. No authentication required.")
async def create_guest_order(
    order: schemas.OrderCreateWithDepartmentName,
    db: Session = Depends(get_db)
):
    import os
    if os.getenv("TESTING") != "true":
        if order.request_time and not validate_delivery_time(order.request_time):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"配達時間「{order.request_time}」の受付時間を過ぎています"
            )
    
    db_order = crud.create_guest_order(db, order)
    
    db_order.order_id = crud.generate_order_id(db, db_order.serve_date)
    
    await manager.broadcast(json.dumps({
        "type": "order_created",
        "order_id": db_order.id,
        "customer_name": f"{order.department}／{order.name}"
    }))
    
    return db_order

@app.get("/orders/{order_id}", response_model=schemas.Order,
        summary="Get Order (Requires Bearer Token)",
        description="Retrieve a specific order by ID. **Authentication required**: Include Bearer token in Authorization header.")
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

@app.patch("/admin/orders/{order_id}/delivery-completion", response_model=schemas.Order)
async def toggle_delivery_completion(
    order_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    order = db.query(models.OrderSQLAlchemy).filter(models.OrderSQLAlchemy.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="注文が見つかりません")
    
    from .time_utils import get_jst_time
    
    if order.delivered_at:
        order.delivered_at = None
        order.status = models.OrderStatus.ready
    else:
        order.delivered_at = get_jst_time()
        order.status = models.OrderStatus.delivered
    
    db.commit()
    db.refresh(order)
    
    await manager.broadcast(json.dumps({
        "type": "delivery_completed",
        "order_id": order.id,
        "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None
    }))
    
    return order

@app.get("/admin/orders/today", response_model=List[schemas.Order])
async def get_today_orders(
    date_filter: date = None,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    target_date = date_filter or date.today()
    orders = crud.get_today_orders(db, target_date)
    return orders

@app.get("/orders", response_model=List[schemas.Order],
        summary="Get Orders by Date (Requires Bearer Token)",
        description="Retrieve orders for a specific date. **Authentication required**: Include Bearer token in Authorization header.")
async def get_orders_by_date(
    date: date,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    orders = crud.get_today_orders(db, date)
    return orders

@app.get("/admin/menus", response_model=List[schemas.MenuResponse])
async def get_menus(
    date_filter: date = None,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    menus = crud.get_menus(db, date_filter)
    return menus

@app.post("/admin/menus", response_model=schemas.MenuResponse)
async def create_menu(
    menu: schemas.MenuCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    db_menu = crud.create_menu(db, menu)
    return db_menu

@app.patch("/admin/menus/{menu_id}", response_model=schemas.MenuResponse)
async def update_menu(
    menu_id: int,
    menu_update: schemas.MenuUpdate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    db_menu = crud.update_menu(db, menu_id, menu_update)
    if not db_menu:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    return db_menu

@app.delete("/admin/menus/{menu_id}")
async def delete_menu(
    menu_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    success = crud.delete_menu(db, menu_id)
    if not success:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    return {"message": "メニューが削除されました"}

@app.post("/admin/menus/{menu_id}/items", response_model=schemas.MenuItemResponse)
async def create_menu_item(
    menu_id: int,
    item: schemas.MenuItemCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    db_item = crud.create_menu_item(db, menu_id, item)
    return db_item

@app.patch("/admin/menu-items/{item_id}", response_model=schemas.MenuItemResponse)
async def update_menu_item(
    item_id: int,
    item_update: schemas.MenuItemUpdate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    db_item = crud.update_menu_item(db, item_id, item_update)
    if not db_item:
        raise HTTPException(status_code=404, detail="メニューアイテムが見つかりません")
    
    return db_item

@app.delete("/admin/menu-items/{item_id}")
async def delete_menu_item(
    item_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    success = crud.delete_menu_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="メニューアイテムが見つかりません")
    
    return {"message": "メニューアイテムが削除されました"}

@app.post("/menus",
    response_model=schemas.MenuSQLAlchemyResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_menu_by_date(
    serve_date: date = Form(...),
    title: str = Form(...),
    price: int = Form(...),
    max_qty: int = Form(...),
    image: UploadFile | None = File(None),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    img_url = None
    if image:
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if image.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="JPEG、PNG、WebP画像のみアップロード可能です")
        
        content = await image.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="画像ファイルサイズは5MB以下にしてください")
        
        file_extension = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_filename = f"{serve_date}_{uuid.uuid4().hex}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        img_url = f"/uploads/{unique_filename}"
    
    menu_data = schemas.MenuSQLAlchemyCreate(
        serve_date=serve_date,
        title=title,
        price=price,
        max_qty=max_qty,
        img_url=img_url
    )
    db_menu = crud.create_menu_sqlalchemy(db, menu_data)
    return db_menu

@app.put("/menus/{menu_id}", response_model=schemas.MenuSQLAlchemyResponse)
async def update_menu_by_date(
    menu_id: int,
    title: str = Form(None),
    price: int = Form(None),
    max_qty: int = Form(None),
    image: UploadFile | None = File(None),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    current_menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == menu_id).first()
    if not current_menu:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    img_url = None
    if image:
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if image.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="JPEG、PNG、WebP画像のみアップロード可能です")
        
        content = await image.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="画像ファイルサイズは5MB以下にしてください")
        
        if current_menu.img_url:
            old_filename = current_menu.img_url.replace("/uploads/", "")
            old_path = UPLOAD_DIR / old_filename
            if old_path.exists():
                os.remove(old_path)
        
        file_extension = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        unique_filename = f"{current_menu.serve_date}_{uuid.uuid4().hex}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        img_url = f"/uploads/{unique_filename}"
    
    menu_update = schemas.MenuSQLAlchemyUpdate(
        title=title,
        price=price,
        max_qty=max_qty,
        img_url=img_url
    )
    db_menu = crud.update_menu_sqlalchemy(db, menu_id, menu_update)
    if not db_menu:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    return db_menu

@app.delete("/menus/{menu_id}")
async def delete_menu_by_date(
    menu_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    success = crud.delete_menu_sqlalchemy(db, menu_id)
    if not success:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    return {"message": "メニューが削除されました"}

@app.post("/menus/background")
async def upload_background_image(
    date: date,
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="画像ファイルのみアップロード可能です")
    
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{date}_{uuid.uuid4().hex}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    img_url = f"/uploads/{unique_filename}"
    
    return {
        "message": "背景画像がアップロードされました",
        "img_url": img_url,
        "date": date
    }

@app.websocket("/ws/orders")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
