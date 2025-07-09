from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, datetime
from typing import List, Optional
from . import models, schemas
from sqlmodel import select

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
    menus = db.query(models.MenuSQLAlchemy).filter(
        and_(models.MenuSQLAlchemy.serve_date >= start_date, models.MenuSQLAlchemy.serve_date <= end_date)
    ).all()
    
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

def create_order(db: Session, order: schemas.OrderCreate, user_id: int):
    total_price = 0
    for item in order.items:
        menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == item.menu_id).first()
        if menu_item:
            total_price += menu_item.price * item.qty
        else:
            menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == item.menu_id).first()
            if menu:
                total_price += menu.price * item.qty
    
    db_order = models.OrderSQLAlchemy(
        user_id=user_id,
        serve_date=order.serve_date,
        delivery_type=order.delivery_type,
        request_time=order.request_time,
        total_price=total_price,
        status=models.OrderStatus.new
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

def get_today_orders(db: Session, serve_date: date):
    return db.query(models.OrderSQLAlchemy).filter(models.OrderSQLAlchemy.serve_date == serve_date).all()

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
    """Get menus with optional date filter - returns only the most recent menu per date"""
    if date_filter:
        menu = db.query(models.Menu).filter(models.Menu.date == date_filter).order_by(models.Menu.id.desc()).first()
        menus = [menu] if menu else []
    else:
        from sqlalchemy import func
        subquery = db.query(
            models.Menu.date,
            func.max(models.Menu.id).label('max_id')
        ).group_by(models.Menu.date).subquery()
        
        menus = db.query(models.Menu).join(
            subquery,
            and_(models.Menu.date == subquery.c.date, models.Menu.id == subquery.c.max_id)
        ).order_by(models.Menu.date.desc()).all()
    
    result = []
    for menu in menus:
        menu_items = db.query(models.MenuItem).filter(models.MenuItem.menu_id == menu.id).all()
        items_list = []
        for item in menu_items:
            items_list.append({
                "id": item.id,
                "name": item.name,
                "price": item.price,
                "stock": item.stock,
                "menu_id": item.menu_id
            })
        
        menu_dict = {
            "id": menu.id,
            "date": menu.date,
            "title": menu.title,
            "photo_url": menu.photo_url,
            "items": items_list
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

def get_weekly_menus_from_admin(db: Session, start_date: date, end_date: date):
    """Get weekly menus from admin Menu/MenuItem tables in frontend-compatible format"""
    from datetime import timedelta
    
    menus = db.query(models.Menu).filter(
        and_(models.Menu.date >= start_date, models.Menu.date <= end_date)
    ).all()
    
    weekly_data = []
    current_date = start_date
    while current_date <= end_date:
        day_menus = []
        for menu in menus:
            if menu.date == current_date:
                menu_items = db.query(models.MenuItem).filter(models.MenuItem.menu_id == menu.id).all()
                for item in menu_items:
                    remaining_qty = item.stock
                    day_menus.append({
                        'id': item.id,
                        'serve_date': current_date,
                        'title': item.name,
                        'price': int(item.price),
                        'max_qty': item.stock,
                        'img_url': menu.photo_url,
                        'remaining_qty': max(0, remaining_qty),
                        'created_at': datetime.utcnow()
                    })
        
        weekly_data.append({
            "date": current_date,
            "menus": day_menus
        })
        current_date += timedelta(days=1)
    
    return weekly_data

def create_guest_order(db: Session, order: schemas.OrderCreateWithName):
    """Create an order without user authentication using customer name"""
    total_price = 0
    for item in order.items:
        menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == item.menu_id).first()
        if menu_item:
            total_price += menu_item.price * item.qty
        else:
            menu = db.query(models.MenuSQLAlchemy).filter(models.MenuSQLAlchemy.id == item.menu_id).first()
            if menu:
                total_price += menu.price * item.qty
    
    guest_user = get_or_create_user(db, f"guest_{order.customer_name}@temp.com", order.customer_name)
    
    db_order = models.OrderSQLAlchemy(
        user_id=guest_user.id,
        serve_date=order.serve_date,
        delivery_type=order.delivery_type,
        request_time=order.request_time,
        total_price=total_price,
        status=models.OrderStatus.new
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
