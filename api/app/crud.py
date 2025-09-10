from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, datetime, time, timezone, timedelta
from typing import List, Optional
from . import models, schemas
from sqlmodel import select
import uuid

def get_menu_by_id(db: Session, menu_id: int):
    return db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == menu_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_or_create_user(db: Session, email: str, name: str = None):
    user = get_user_by_email(db, email)
    if not user:
        user_data = schemas.UserCreate(email=email, name=name or email.split('@')[0])
        user = create_user(db, user_data)
    return user

def get_menus_by_date(db: Session, serve_date: date):
    return db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.serve_date == serve_date).all()

def get_weekly_menus(db: Session, start_date: date, end_date: date):
    """Get menus for date range - serve_date は Date型なので直接比較が最適"""
    menus = db.query(models.MenuSQLAlchemy).filter(
        and_(models.MenuSQLAlchemy.serve_date >= start_date, models.MenuSQLAlchemy.serve_date <= end_date)
    ).order_by(models.MenuSQLAlchemy.serve_date.asc(), models.MenuSQLAlchemy.id.asc()).all()
    
    menu_with_remaining = []
    for menu in menus:
        ordered_qty = db.query(func.sum(models.OrderItem.qty)).join(models.OrderSQLAlchemy).filter(
            and_(
                models.OrderItem.menu_id == menu.id,
                models.OrderSQLAlchemy.serve_date == menu.serve_date,
                models.OrderSQLAlchemy.status != models.OrderStatus.new
            )
        ).scalar() or 0
        
        remaining_qty = menu.max_qty - ordered_qty
        menu_dict = menu.__dict__.copy()
        menu_dict['remaining_qty'] = max(0, remaining_qty)
        menu_with_remaining.append(menu_dict)
    
    return menu_with_remaining

def calculate_order_total(db: Session, items: List[schemas.OrderItemCreate]) -> int:
    """Calculate total price for order items"""
    total_price = 0
    for item in items:
        menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == item.menu_id).first()
        if menu:
            total_price += menu.price * item.qty
    return total_price

def create_order(db: Session, order: schemas.OrderCreate, user_id: int):
    total_price = calculate_order_total(db, order.items)
    order_id = generate_order_id(db, order.serve_date)
    
    db_order = models.OrderSQLAlchemy(
        user_id=user_id,
        serve_date=order.serve_date,
        delivery_type=order.delivery_type,
        request_time=order.request_time,
        total_price=total_price,
        status=models.OrderStatus.new,
        order_id=order_id
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    for item in order.items:
        db_item = models.OrderItem(
            order_id=db_order.id,
            menu_id=item.menu_id,
            qty=item.qty
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_order)
    return db_order

def get_order(db: Session, order_id: int):
    return db.query(models.OrderSQLAlchemy).filter(models.OrderSQLAlchemy.id == order_id).first()

def update_order_status(db: Session, order_id: int, status: models.OrderStatus):
    order = db.query(models.OrderSQLAlchemy).filter(models.OrderSQLAlchemy.id == order_id).first()
    if order:
        order.status = status
        db.commit()
        db.refresh(order)
    return order

def get_today_orders(db: Session, serve_date: date, status_filter: Optional[str] = None):
    from sqlalchemy.orm import joinedload
    
    query = db.query(models.OrderSQLAlchemy).options(
        joinedload(models.OrderSQLAlchemy.user),
        joinedload(models.OrderSQLAlchemy.order_items).joinedload(models.OrderItem.menu)
    ).filter(models.OrderSQLAlchemy.serve_date == serve_date)
    
    if status_filter:
        if status_filter == 'confirmed':
            query = query.filter(models.OrderSQLAlchemy.status != 'new')
        else:
            query = query.filter(models.OrderSQLAlchemy.status == status_filter)
    
    return query.order_by(models.OrderSQLAlchemy.created_at.asc()).all()

def create_sample_menus(db: Session):
    """Create sample menu data for testing"""
    today = date.today()
    sample_menus = [
        {
            "serve_date": today,
            "title": "カレーライス",
            "price": 800,
            "max_qty": 40,
            "img_url": "/assets/curry.jpg"
        },
        {
            "serve_date": today,
            "title": "大盛り",
            "price": 100,
            "max_qty": 40,
            "img_url": "/assets/large.jpg"
        },
        {
            "serve_date": today,
            "title": "唐揚げ弁当",
            "price": 100,
            "max_qty": 40,
            "img_url": "/assets/karaage.jpg"
        }
    ]
    
    for menu_data in sample_menus:
        existing = db.query(models.MenuSQLAlchemy).filter(
            and_(
                models.MenuSQLAlchemy.serve_date == menu_data["serve_date"],
                models.MenuSQLAlchemy.title == menu_data["title"]
            )
        ).first()
        
        if not existing:
            menu = models.MenuSQLAlchemy(**menu_data)
            db.add(menu)
    
    db.commit()

def get_menus(db: Session, date_filter: date = None):
    """Get menus with optional date filter"""
    if date_filter:
        menus = db.query(models.Menu).filter(models.Menu.date == date_filter).all()
    else:
        menus = db.query(models.Menu).all()
    
    result = []
    for menu in menus:
        menu_items = db.query(models.MenuItem).filter(models.MenuItem.menu_id == menu.id).all()
        menu_dict = {
            "id": menu.id,
            "date": menu.date,
            "title": menu.title,
            "photo_url": menu.photo_url,
            "items": menu_items
        }
        result.append(menu_dict)
    
    return result

def create_menu(db: Session, menu: schemas.MenuCreate):
    """Create a new menu"""
    db_menu = models.Menu(
        date=menu.date,
        title=menu.title,
        photo_url=menu.photo_url
    )
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    return db_menu

def update_menu(db: Session, menu_id: int, menu_update: schemas.MenuUpdate):
    """Update an existing menu"""
    menu = db.query(models.Menu).filter(models.Menu.id == menu_id).first()
    if not menu:
        return None
    
    if menu_update.title is not None:
        menu.title = menu_update.title
    if menu_update.photo_url is not None:
        menu.photo_url = menu_update.photo_url
    
    db.commit()
    db.refresh(menu)
    return menu

def delete_menu(db: Session, menu_id: int):
    """Delete a menu and its items"""
    menu = db.query(models.Menu).filter(models.Menu.id == menu_id).first()
    if not menu:
        return False
    
    db.query(models.MenuItem).filter(models.MenuItem.menu_id == menu_id).delete()
    db.delete(menu)
    db.commit()
    return True

def create_menu_item(db: Session, menu_id: int, item: schemas.MenuItemCreate):
    """Create a new menu item"""
    db_item = models.MenuItem(
        menu_id=menu_id,
        name=item.name,
        price=item.price,
        stock=item.stock
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_menu_item(db: Session, item_id: int, item_update: schemas.MenuItemUpdate):
    """Update an existing menu item"""
    item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not item:
        return None
    
    if item_update.name is not None:
        item.name = item_update.name
    if item_update.price is not None:
        item.price = item_update.price
    if item_update.stock is not None:
        item.stock = item_update.stock
    
    db.commit()
    db.refresh(item)
    return item

def delete_menu_item(db: Session, item_id: int):
    """Delete a menu item"""
    item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not item:
        return False
    
    db.delete(item)
    db.commit()
    return True

def create_guest_order(db: Session, order: schemas.OrderCreateWithDepartmentName):
    """Create an order without user authentication using customer name"""
    
    total_price = calculate_order_total(db, order.items)
    
    customer_name = f"{order.department}／{order.name}"
    guest_user = get_or_create_user(db, f"guest_{customer_name}@temp.com", customer_name)
    
    order_id = generate_order_id(db, order.serve_date)
    
    
    db_order = models.OrderSQLAlchemy(
        user_id=guest_user.id,
        serve_date=order.serve_date,
        delivery_type=order.delivery_type,
        request_time=order.request_time,
        delivery_location=order.delivery_location,
        total_price=total_price,
        status=models.OrderStatus.new,
        department=order.department,
        customer_name=order.name,
        order_id=order_id
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    
    for item in order.items:
        db_item = models.OrderItem(
            order_id=db_order.id,
            menu_id=item.menu_id,
            qty=item.qty
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_order)
    
    from sqlalchemy.orm import joinedload
    db_order_with_menus = db.query(models.OrderSQLAlchemy).options(
        joinedload(models.OrderSQLAlchemy.order_items).joinedload(models.OrderItem.menu)
    ).filter(models.OrderSQLAlchemy.id == db_order.id).first()
    
    return db_order_with_menus

def get_menus_sqlalchemy(db: Session, date_filter: Optional[date] = None):
    """Get MenuSQLAlchemy menus with optional date filter
    
    serve_date は models.MenuSQLAlchemy で Date型定義（タイムゾーン情報なし）
    等号比較が最も安全・高速（インデックス有効）
    将来 DateTime型に変更する場合は JST レンジ比較への切り替えを検討
    """
    import logging
    logger = logging.getLogger(__name__)
    
    q = db.query(models.MenuSQLAlchemy)
    if date_filter:
        q = q.filter(models.MenuSQLAlchemy.serve_date == date_filter)
    
    menus = q.order_by(models.MenuSQLAlchemy.id.asc()).all()
    
    logger.info(f"FETCH serve_date={date_filter} count={len(menus)}")
    
    for menu in menus:
        if not hasattr(menu, 'cafe_time_available') or menu.cafe_time_available is None:
            menu.cafe_time_available = False
    
    return menus


def to_jst_key(v) -> str | None:
    """Convert date/datetime value to JST 'YYYY-MM-DD' key"""
    from datetime import datetime, date, timezone, timedelta
    if v is None: 
        return None
    if isinstance(v, datetime):
        JST = timezone(timedelta(hours=9))
        return v.astimezone(JST).strftime("%Y-%m-%d")
    if isinstance(v, date):
        # date → JSTキー（同一）
        return v.strftime("%Y-%m-%d")
    s = str(v)
    return s[:10]  # "2025-09-10T..." の保険


def create_menu_sqlalchemy(db: Session, menu: schemas.MenuSQLAlchemyCreate):
    """Create a new MenuSQLAlchemy menu"""
    import logging
    logger = logging.getLogger(__name__)
    
    cafe_time_available = getattr(menu, 'cafe_time_available', False)
    if cafe_time_available is None:
        cafe_time_available = False
    
    db_menu = models.MenuSQLAlchemy(
        serve_date=menu.serve_date,
        title=menu.title,
        price=menu.price,
        max_qty=menu.max_qty,
        img_url=menu.img_url,
        cafe_time_available=cafe_time_available
    )
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    
    logger.info(f"SAVED id={db_menu.id} serve_date={db_menu.serve_date}")
    
    return db_menu

def update_menu_sqlalchemy(db: Session, menu_id: int, menu_update: schemas.MenuSQLAlchemyUpdate):
    """Update an existing MenuSQLAlchemy menu"""
    menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == menu_id).first()
    if not menu:
        return None
    
    if menu_update.title is not None:
        menu.title = menu_update.title
    if menu_update.price is not None:
        menu.price = menu_update.price
    if menu_update.max_qty is not None:
        menu.max_qty = menu_update.max_qty
    if menu_update.img_url is not None:
        menu.img_url = menu_update.img_url
    if menu_update.cafe_time_available is not None:
        menu.cafe_time_available = menu_update.cafe_time_available
    
    db.commit()
    db.refresh(menu)
    return menu

def delete_menu_sqlalchemy(db: Session, menu_id: int):
    """Delete a MenuSQLAlchemy menu"""
    menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == menu_id).first()
    if not menu:
        return False
    
    db.delete(menu)
    db.commit()
    return True

def generate_order_id(db: Session, serve_date: date) -> str:
    """Generate order ID in #MMDD000 format with race condition protection"""
    existing_orders = db.query(models.OrderSQLAlchemy).filter(
        models.OrderSQLAlchemy.serve_date == serve_date
    ).with_for_update().order_by(models.OrderSQLAlchemy.created_at.asc()).all()
    
    month_day = serve_date.strftime("%m%d")
    order_number = str(len(existing_orders) + 1).zfill(3)
    return f"#{month_day}{order_number}"

def generate_time_slots_for_date(db: Session, target_date: date) -> List[models.TimeSlot]:
    """Generate 15-minute time slots for a given date (11:00-14:00 JST)"""
    existing_slots = db.query(models.TimeSlot).filter(
        func.date(models.TimeSlot.slot_datetime) == target_date
    ).all()
    
    if existing_slots:
        return existing_slots
        
    slots = []
    jst = timezone(timedelta(hours=9))
    start_time = datetime.combine(target_date, time(11, 0)).replace(tzinfo=jst)
    end_time = datetime.combine(target_date, time(14, 0)).replace(tzinfo=jst)
    
    current_time = start_time
    while current_time < end_time:
        slot = models.TimeSlot(
            slot_datetime=current_time,
            max_orders=20,
            current_orders=0,
            is_available=True
        )
        db.add(slot)
        slots.append(slot)
        current_time += timedelta(minutes=15)
    
    db.commit()
    return slots

def get_available_time_slots(db: Session, target_date: date) -> List[models.TimeSlot]:
    """Get available time slots for a date with 30-minute cutoff validation"""
    from .time_utils import get_jst_time
    
    current_jst = get_jst_time()
    cutoff_time = current_jst + timedelta(minutes=30)
    
    slots = db.query(models.TimeSlot).filter(
        func.date(models.TimeSlot.slot_datetime) == target_date,
        models.TimeSlot.is_available == True,
        models.TimeSlot.current_orders < models.TimeSlot.max_orders
    ).all()
    
    if target_date == current_jst.date():
        slots = [slot for slot in slots if slot.slot_datetime.replace(tzinfo=timezone(timedelta(hours=9))) > cutoff_time]
        
    return slots

def reserve_time_slot(db: Session, slot_id: int) -> bool:
    """Reserve a time slot for an order"""
    slot = db.query(models.TimeSlot).filter(models.TimeSlot.id == slot_id).first()
    if not slot or slot.current_orders >= slot.max_orders:
        return False
        
    slot.current_orders += 1
    if slot.current_orders >= slot.max_orders:
        slot.is_available = False
        
    db.commit()
    return True

def create_payment(db: Session, payment: schemas.PaymentCreate, order_id: int) -> models.Payment:
    """Create a payment record"""
    db_payment = models.Payment(
        order_id=order_id,
        payment_method=payment.payment_method,
        payment_gateway=payment.payment_gateway,
        gateway_transaction_id=payment.gateway_transaction_id,
        amount=payment.amount,
        status=models.PaymentStatus.pending
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

def update_payment_status(db: Session, payment_id: int, status: models.PaymentStatus, gateway_response: str = None) -> models.Payment:
    """Update payment status"""
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if payment:
        payment.status = status
        if gateway_response:
            payment.gateway_response = gateway_response
        db.commit()
        db.refresh(payment)
    return payment

def create_refund(db: Session, refund: schemas.RefundCreate) -> models.Refund:
    """Create a refund record"""
    db_refund = models.Refund(
        payment_id=refund.payment_id,
        amount=refund.amount,
        reason=refund.reason,
        status=models.RefundStatus.pending
    )
    db.add(db_refund)
    db.commit()
    db.refresh(db_refund)
    return db_refund

def update_menu_stock(db: Session, menu_id: int, quantity_ordered: int) -> bool:
    """Update menu stock quantity after order"""
    menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == menu_id).first()
    if not menu:
        return False
        
    if menu.stock_quantity is not None:
        if menu.stock_quantity < quantity_ordered:
            return False
        menu.stock_quantity -= quantity_ordered
        if menu.stock_quantity <= 0:
            menu.is_available = False
    
    if menu.daily_limit is not None:
        today_orders = db.query(func.sum(models.OrderItem.qty)).join(
            models.OrderSQLAlchemy
        ).filter(
            models.OrderItem.menu_id == menu_id,
            models.OrderSQLAlchemy.serve_date == date.today()
        ).scalar() or 0
        
        if today_orders + quantity_ordered > menu.daily_limit:
            return False
    
    db.commit()
    return True

def get_orders_by_date(db: Session, target_date: date):
    return db.query(models.OrderSQLAlchemy).filter(models.OrderSQLAlchemy.serve_date == target_date).all()
