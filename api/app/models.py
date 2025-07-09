from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime, time
import enum

from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class DeliveryType(enum.Enum):
    pickup = "pickup"
    desk = "desk"

class OrderStatus(enum.Enum):
    new = "new"
    paid = "paid"
    preparing = "preparing"
    ready = "ready"
    delivered = "delivered"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    seat_id = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class MenuSQLAlchemy(Base):
    __tablename__ = "menus"
    
    id = Column(Integer, primary_key=True, index=True)
    serve_date = Column(Date, nullable=False)
    title = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    max_qty = Column(Integer, nullable=False)
    img_url = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    order_items = relationship("OrderItem", back_populates="menu")

class OrderSQLAlchemy(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    serve_date = Column(Date, nullable=False)
    delivery_type = Column(Enum(DeliveryType), nullable=False)
    request_time = Column(Time)
    total_price = Column(Integer, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.new)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    user = relationship("User")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_id = Column(Integer, ForeignKey("menus.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    menu_item_name = Column(String, nullable=True)
    
    order = relationship("OrderSQLAlchemy", back_populates="order_items")
    menu = relationship("MenuSQLAlchemy", back_populates="order_items")

class Menu(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: date
    title: str
    photo_url: Optional[str] = None

class MenuItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    menu_id: int = Field(foreign_key="menu.id")
    name: str
    price: float
    stock: int

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    menu_item_id: int = Field(foreign_key="menuitem.id")
    qty: int
    customer_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
