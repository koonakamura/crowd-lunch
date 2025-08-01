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
    request_time = Column(String)
    delivery_location = Column(String)
    total_price = Column(Integer, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.new)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    department = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    order_id = Column(String, unique=True, nullable=False, index=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_id = Column(Integer, ForeignKey("menus.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    
    order = relationship("OrderSQLAlchemy", back_populates="order_items")
    menu = relationship("MenuSQLAlchemy", back_populates="order_items")
