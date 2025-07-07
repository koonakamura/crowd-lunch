from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime
import enum

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
