from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, datetime
from typing import List, Optional
from . import models, schemas

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
