from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, File, UploadFile, Form, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Optional
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

app.router.redirect_slashes = False

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logging.exception("Validation error occurred: %s", exc)
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error occurred"}
    )

ALLOWED_ORIGINS = [
    "https://cheery-dango-2fd190.netlify.app",  # prod
    "http://localhost:3000",
    "http://localhost:3001",
]
ALLOW_ORIGIN_REGEX = r"^https://deploy-preview-\d+--cheery-dango-2fd190\.netlify\.app$"

logging.info(f"CORS Configuration - ALLOWED_ORIGINS: {ALLOWED_ORIGINS}")
logging.info(f"CORS Configuration - ALLOW_ORIGIN_REGEX: {ALLOW_ORIGIN_REGEX}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOW_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["authorization", "content-type", "accept"],
    allow_credentials=False,
    max_age=600,
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-App-Commit"] = os.environ.get("FLY_MACHINE_VERSION", "dev")
    return response

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

@app.options("/{path:path}")
def _preflight_ok(path: str):
    return Response(status_code=204)

@app.get("/server-time", summary="Get Server Time", description="Get current server time in JST")
async def get_server_time():
    from .time_utils import get_jst_time
    from fastapi import Response
    import json
    
    current_jst = get_jst_time()
    return Response(
        content=json.dumps({
            "current_time": current_jst.isoformat(),
            "timezone": "Asia/Tokyo"
        }),
        media_type="application/json",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"}
    )

@app.get("/auth/whoami")
async def whoami(admin: dict = Depends(auth.get_current_admin)):
    return {
        "sub": admin.get("sub"),
        "role": admin.get("role"), 
        "iss": admin.get("iss"),
        "aud": admin.get("aud"),
        "exp": admin.get("exp")
    }

@app.get("/auth/login")
async def login_redirect(redirect_uri: str, state: str = None):
    import logging
    import re
    import secrets
    import hmac
    import hashlib
    import time
    from urllib.parse import urlparse
    from fastapi.responses import RedirectResponse
    from datetime import timedelta
    
    try:
        parsed_uri = urlparse(redirect_uri)
        normalized_netloc = parsed_uri.netloc.encode('idna').decode('ascii').lower()
        normalized_path = parsed_uri.path.rstrip('/')
        
        if parsed_uri.scheme not in ["https", "http"]:
            raise ValueError("Invalid protocol")
        
        if parsed_uri.scheme == "http" and not normalized_netloc.startswith("localhost"):
            raise ValueError("HTTP only allowed for localhost")
        
        if ':' in normalized_netloc and not normalized_netloc.startswith("localhost"):
            raise ValueError("Custom ports not allowed")
        
        if parsed_uri.query or parsed_uri.fragment:
            raise ValueError("Query parameters and fragments not allowed")
        
        if normalized_path != "/admin/callback":
            raise ValueError("Invalid callback path")
        
        ALLOWED_HOSTS = {
            "cheery-dango-2fd190.netlify.app"
        }
        
        LOCALHOST_HOSTS = {
            "localhost:3000",
            "localhost:3001"
        }
        
        PREVIEW_PATTERN = re.compile(r"^deploy-preview-\d+--cheery-dango-2fd190\.netlify\.app$")
        
        host_allowed = (
            normalized_netloc in ALLOWED_HOSTS or 
            normalized_netloc in LOCALHOST_HOSTS or
            PREVIEW_PATTERN.match(normalized_netloc)
        )
        
        if not host_allowed:
            raise ValueError("Host not allowed")
            
    except (ValueError, UnicodeError) as e:
        logging.warning({
            "event": "admin_login_blocked",
            "reason": "redirect_uri_validation_failed",
            "redirect_uri": redirect_uri,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "redirect_uri_not_allowed", "message": f"Redirect URI validation failed: {str(e)}"}
        )
    
    if not state:
        state = secrets.token_urlsafe(32)
    
    state_exp = int(time.time()) + 900  # 15 minutes
    state_data = f"{state}:{state_exp}"
    
    redirect_origin = f"{parsed_uri.scheme}://{normalized_netloc}"
    hmac_input = f"{state_data}:{redirect_origin}".encode('utf-8')
    state_sig = hmac.new(
        auth.SECRET_KEY.encode('utf-8'), 
        hmac_input, 
        hashlib.sha256
    ).hexdigest()
    
    import time
    now = int(time.time())
    
    admin_token = auth.create_access_token(
        data={
            "sub": "admin@example.com",
            "role": "admin",
            "iss": auth.JWT_ISS,
            "aud": auth.JWT_AUD,
            "iat": now,
            "exp": now + 15*60,
        }
    )
    
    logging.info({
        "event": "admin_login_redirect",
        "redirect_origin": redirect_origin,
        "sub": "admin@example.com",
        "exp": now + 15*60,
        "state_exp": state_exp
    })
    
    redirect_url = f"{redirect_uri}#token={admin_token}&state={state_data}&state_sig={state_sig}"
    
    return RedirectResponse(
        url=redirect_url,
        status_code=302,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/weekly-menus", response_model=List[schemas.WeeklyMenuResponse])
async def get_weekly_menus(db: Session = Depends(get_db)):
    from datetime import timezone, timedelta as td
    jst = timezone(td(hours=9))
    today = datetime.now(jst).date()
    start_date = today - timedelta(days=1)  # Include yesterday to show 8/6
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


@app.get("/public/menus", response_model=List[schemas.MenuSQLAlchemyResponse])
async def get_public_menus_by_date(
    date: date = None,
    db: Session = Depends(get_db),
):
    from fastapi.responses import JSONResponse
    import os
    
    menus = crud.get_menus_sqlalchemy(db, date)
    
    is_preview = os.getenv("FLY_APP_NAME", "").endswith("-preview") or os.getenv("ENVIRONMENT") == "preview"
    
    if is_preview:
        headers = {
            "Cache-Control": "no-store",  # CDN/browser cache disabled for preview
        }
    else:
        headers = {
            "Cache-Control": "public, max-age=0, must-revalidate",  # Production revalidation
        }
    
    menu_data = []
    for menu in menus:
        menu_dict = {
            "id": menu.id,
            "title": menu.title,
            "price": menu.price,
            "max_qty": menu.max_qty,
            "serve_date": menu.serve_date.isoformat() if menu.serve_date else None,
            "cafe_time_available": menu.cafe_time_available,
            "created_at": menu.created_at.isoformat() if menu.created_at else None,
            "img_url": menu.img_url
        }
        menu_data.append(menu_dict)
    
    return JSONResponse(content=menu_data, headers=headers)


@app.get("/public/menus-range")
async def get_public_menus_range(
    start: date,
    end: date,
    db: Session = Depends(get_db),
):
    """Get menus for a date range (inclusive boundaries)"""
    from datetime import timezone, timedelta as td
    from fastapi.responses import JSONResponse
    import os
    
    if (end - start).days > 14:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 14 days")
    
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
    
    menus = crud.get_weekly_menus(db, start, end)
    
    days = {}
    current_date = start
    while current_date <= end:
        date_str = current_date.strftime('%Y-%m-%d')
        days[date_str] = []
        current_date += timedelta(days=1)
    
    for menu in menus:
        serve_date = menu['serve_date']
        if serve_date in days:
            days[serve_date].append(menu)
    
    response_data = {
        "range": {
            "start": start.strftime('%Y-%m-%d'),
            "end": end.strftime('%Y-%m-%d'),
            "tz": "Asia/Tokyo"
        },
        "days": days
    }
    
    is_preview = os.getenv("FLY_APP_NAME", "").endswith("-preview") or os.getenv("ENVIRONMENT") == "preview"
    
    if is_preview:
        headers = {
            "Cache-Control": "no-store",  # CDN/browser cache disabled for preview
        }
    else:
        headers = {
            "Cache-Control": "public, max-age=0, must-revalidate",  # Production revalidation
        }
    
    return JSONResponse(content=response_data, headers=headers)

@app.get("/menus", response_model=List[schemas.MenuSQLAlchemyResponse])
async def get_menus_by_date(
    date: date = None,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db),
):
    menus = crud.get_menus_sqlalchemy(db, date)
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
    from .logging import log_order_event
    from datetime import time
    
    if os.getenv("TESTING") != "true":
        from .time_utils import get_jst_time, convert_to_pickup_at, validate_pickup_at
        current_jst = get_jst_time()
        
        log_order_event("order_attempt", user_id=current_user.id, time=current_jst.isoformat(), serve_date=str(order.serve_date))
        
        if order.pickup_at:
            pickup_at = order.pickup_at
        elif order.request_time:
            pickup_at = convert_to_pickup_at(order.serve_date, order.request_time)
        else:
            log_order_event("reject", code="invalid_timeslot", user_id=current_user.id, now=current_jst.isoformat())
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_timeslot", "message": "配達時間が指定されていません"}
            )
        
        is_valid, error_code = validate_pickup_at(pickup_at)
        if not is_valid:
            log_order_event("reject", code=error_code, user_id=current_user.id, now=current_jst.isoformat())
            error_messages = {
                "cafe_time_closed": "本日のカフェタイム受付は18:14で終了しました",
                "invalid_timeslot": "選択した時間が有効範囲外です"
            }
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": error_code, "message": error_messages[error_code]}
            )
        
        if pickup_at.hour >= 14:
            for item in order.items:
                menu = crud.get_menu_by_id(db, item.menu_id)
                if menu and not menu.cafe_time_available:
                    log_order_event("reject", code="menu_not_available", menu_id=item.menu_id, user_id=current_user.id, now=current_jst.isoformat())
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail={"code": "menu_not_available", "message": "このメニューはカフェタイムでは注文できません"}
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
    from .logging import log_order_event
    from datetime import time
    
    if os.getenv("TESTING") != "true":
        from .time_utils import get_jst_time, convert_to_pickup_at, validate_pickup_at
        current_jst = get_jst_time()
        
        log_order_event("guest_order_attempt", department=order.department, name=order.name, time=current_jst.isoformat(), serve_date=str(order.serve_date))
        
        if order.pickup_at:
            pickup_at = order.pickup_at
        elif order.request_time:
            pickup_at = convert_to_pickup_at(order.serve_date, order.request_time)
        else:
            log_order_event("reject", code="invalid_timeslot", department=order.department, name=order.name, now=current_jst.isoformat())
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "invalid_timeslot", "message": "配達時間が指定されていません"}
            )
        
        is_valid, error_code = validate_pickup_at(pickup_at)
        if not is_valid:
            log_order_event("reject", code=error_code, department=order.department, name=order.name, now=current_jst.isoformat())
            error_messages = {
                "cafe_time_closed": "本日のカフェタイム受付は18:14で終了しました",
                "invalid_timeslot": "選択した時間が有効範囲外です"
            }
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": error_code, "message": error_messages[error_code]}
            )
        
        if pickup_at.hour >= 14:
            for item in order.items:
                menu = crud.get_menu_by_id(db, item.menu_id)
                if menu and not menu.cafe_time_available:
                    log_order_event("reject", code="menu_not_available", menu_id=item.menu_id, department=order.department, name=order.name, now=current_jst.isoformat())
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail={"code": "menu_not_available", "message": "このメニューはカフェタイムでは注文できません"}
                    )
    
    db_order = crud.create_guest_order(db, order)
    
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
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
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
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
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
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    target_date = date_filter or date.today()
    orders = crud.get_today_orders(db, target_date)
    
    
    return orders

@app.get("/orders", response_model=List[schemas.Order],
        summary="Get Orders by Date (Requires Bearer Token)",
        description="Retrieve orders for a specific date. **Authentication required**: Include Bearer token in Authorization header.")
async def get_orders_by_date(
    date: date,
    status: Optional[str] = None,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    orders = crud.get_today_orders(db, date, status_filter=status)
    
    
    return orders

@app.get("/admin/menus", response_model=List[schemas.MenuResponse])
async def get_menus(
    date_filter: date = None,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    menus = crud.get_menus(db, date_filter)
    return menus

@app.post("/admin/menus", response_model=schemas.MenuResponse)
async def create_menu(
    menu: schemas.MenuCreate,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    db_menu = crud.create_menu(db, menu)
    return db_menu

@app.patch("/admin/menus/{menu_id}", response_model=schemas.MenuResponse)
async def update_menu(
    menu_id: int,
    menu_update: schemas.MenuUpdate,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    db_menu = crud.update_menu(db, menu_id, menu_update)
    if not db_menu:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    return db_menu

@app.delete("/admin/menus/{menu_id}")
async def delete_menu(
    menu_id: int,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    success = crud.delete_menu(db, menu_id)
    if not success:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    return {"message": "メニューが削除されました"}

@app.post("/admin/menus/{menu_id}/items", response_model=schemas.MenuItemResponse)
async def create_menu_item(
    menu_id: int,
    item: schemas.MenuItemCreate,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    db_item = crud.create_menu_item(db, menu_id, item)
    return db_item

@app.patch("/admin/menu-items/{item_id}", response_model=schemas.MenuItemResponse)
async def update_menu_item(
    item_id: int,
    item_update: schemas.MenuItemUpdate,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    db_item = crud.update_menu_item(db, item_id, item_update)
    if not db_item:
        raise HTTPException(status_code=404, detail="メニューアイテムが見つかりません")
    
    return db_item

@app.delete("/admin/menu-items/{item_id}")
async def delete_menu_item(
    item_id: int,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    success = crud.delete_menu_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="メニューアイテムが見つかりません")
    
    return {"message": "メニューアイテムが削除されました"}

@app.post("/admin/fix-delivery-locations")
async def fix_delivery_locations(
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    """Fix existing orders with NULL delivery_location values"""
    
    
    null_delivery_orders = db.query(models.OrderSQLAlchemy).filter(
        models.OrderSQLAlchemy.delivery_location.is_(None)
    ).all()
    
    
    updated_count = 0
    for order in null_delivery_orders:
        if order.department:
            if "営業" in order.department:
                default_location = "3F"
            elif "開発" in order.department or "エンジニア" in order.department:
                default_location = "4F"
            elif "管理" in order.department or "総務" in order.department:
                default_location = "2F"
            else:
                default_location = "オフィス内"
        else:
            default_location = "オフィス内"
        
        order.delivery_location = default_location
        updated_count += 1
    
    db.commit()
    
    return {"message": f"Updated {updated_count} orders with delivery_location values"}

@app.post("/menus",
    response_model=schemas.MenuSQLAlchemyResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_menu_by_date(
    serve_date: date = Form(...),
    title: str = Form(...),
    price: int = Form(...),
    max_qty: int = Form(...),
    cafe_time_available: bool = Form(False),
    image: UploadFile | None = File(None),
    admin: dict = Depends(auth.get_current_admin),
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
        img_url=img_url,
        cafe_time_available=cafe_time_available
    )
    db_menu = crud.create_menu_sqlalchemy(db, menu_data)
    return db_menu

@app.put("/menus/{menu_id}", response_model=schemas.MenuSQLAlchemyResponse)
async def update_menu_by_date(
    menu_id: int,
    title: str = Form(None),
    price: int = Form(None),
    max_qty: int = Form(None),
    cafe_time_available: bool = Form(None),
    image: UploadFile | None = File(None),
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    from .logging import log_audit
    from .time_utils import get_jst_time
    import logging
    logger = logging.getLogger(__name__)
    current_jst = get_jst_time()
    
    logger.info(f"PUT /menus/{menu_id} - Request arrived at {current_jst.isoformat()}")
    logger.info(f"PUT /menus/{menu_id} - Admin: {admin.get('sub')}, Data: title={title}, price={price}, max_qty={max_qty}, cafe_time_available={cafe_time_available}")
    
    current_menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == menu_id).first()
    if not current_menu:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    if cafe_time_available is not None and cafe_time_available != current_menu.cafe_time_available:
        log_audit("menu_toggle", 
                 actor_id=admin.get('sub'), 
                 menu_id=menu_id, 
                 menu_title=current_menu.title,
                 from_value=current_menu.cafe_time_available, 
                 to_value=cafe_time_available)
    
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
        img_url=img_url,
        cafe_time_available=cafe_time_available
    )
    try:
        db_menu = crud.update_menu_sqlalchemy(db, menu_id, menu_update)
        if not db_menu:
            logger.warning(f"PUT /menus/{menu_id} - Menu not found (404)")
            raise HTTPException(status_code=404, detail="メニューが見つかりません")
        
        logger.info(f"PUT /menus/{menu_id} - Success (200) - Updated menu: {db_menu.title}")
        return db_menu
        
    except HTTPException as e:
        logger.error(f"PUT /menus/{menu_id} - HTTP Error {e.status_code}: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"PUT /menus/{menu_id} - Server Error (500): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.delete("/menus/{menu_id}")
async def delete_menu_by_date(
    menu_id: int,
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
    success = crud.delete_menu_sqlalchemy(db, menu_id)
    if not success:
        raise HTTPException(status_code=404, detail="メニューが見つかりません")
    
    return {"message": "メニューが削除されました"}

@app.post("/menus/background")
async def upload_background_image(
    date: date,
    file: UploadFile = File(...),
    admin: dict = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    
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
