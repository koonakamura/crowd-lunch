from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    orders = relationship("Order", back_populates="user")

class Menu(Base):
    __tablename__ = "menus"
    
    id = Column(Integer, primary_key=True, index=True)
    serve_date = Column(Date, nullable=False)
    title = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    max_qty = Column(Integer, nullable=False)
    img_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    order_items = relationship("OrderItem", back_populates="menu")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    serve_date = Column(Date, nullable=False)
    delivery_type = Column(Enum(DeliveryType), nullable=False)
    request_time = Column(Time)
    total_price = Column(Integer, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.new)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_id = Column(Integer, ForeignKey("menus.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    
    order = relationship("Order", back_populates="order_items")
    menu = relationship("Menu", back_populates="order_items")
