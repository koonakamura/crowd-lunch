from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime, time
import enum

from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, Enum, Boolean, Text, DECIMAL
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
    cancelled = "cancelled"

class PaymentMethod(enum.Enum):
    credit_card = "credit_card"
    qr_code = "qr_code"

class PaymentStatus(enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"

class RefundStatus(enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"

class DocumentType(enum.Enum):
    terms = "terms"
    privacy = "privacy"
    commerce_law = "commerce_law"

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
    cafe_time_available = Column(Boolean, default=False, nullable=False)
    stock_quantity = Column(Integer, nullable=True)
    daily_limit = Column(Integer, nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    order_items = relationship("OrderItem", back_populates="menu")

class OrderSQLAlchemy(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    time_slot_id = Column(Integer, ForeignKey("time_slots.id"), nullable=True)
    serve_date = Column(Date, nullable=False)
    delivery_type = Column(Enum(DeliveryType), nullable=False)
    request_time = Column(String)
    delivery_location = Column(String)
    total_price = Column(Integer, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.new)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    department = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    order_id = Column(String, unique=True, nullable=False, index=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User")
    time_slot = relationship("TimeSlot", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")
    payment = relationship("Payment", back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_id = Column(Integer, ForeignKey("menus.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    
    order = relationship("OrderSQLAlchemy", back_populates="order_items")
    menu = relationship("MenuSQLAlchemy", back_populates="order_items")

class TimeSlot(Base):
    __tablename__ = "time_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    slot_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    max_orders = Column(Integer, default=20, nullable=False)
    current_orders = Column(Integer, default=0, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    orders = relationship("OrderSQLAlchemy", back_populates="time_slot")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    payment_gateway = Column(String(50), nullable=False)
    gateway_transaction_id = Column(String(255))
    amount = Column(Integer, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    gateway_response = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    order = relationship("OrderSQLAlchemy", back_populates="payment")
    refunds = relationship("Refund", back_populates="payment")

class Refund(Base):
    __tablename__ = "refunds"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    reason = Column(Text)
    status = Column(Enum(RefundStatus), default=RefundStatus.pending)
    gateway_refund_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    payment = relationship("Payment", back_populates="refunds")

class LegalDocument(Base):
    __tablename__ = "legal_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    document_type = Column(Enum(DocumentType), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
