from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time, datetime
from .models import DeliveryType, OrderStatus

class UserBase(BaseModel):
    name: str
    email: str
    seat_id: Optional[str] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class MenuBase(BaseModel):
    serve_date: date
    title: str
    price: int
    max_qty: int
    img_url: Optional[str] = None

class MenuCreate(MenuBase):
    pass

class Menu(MenuBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class MenuWithRemaining(Menu):
    remaining_qty: int

class OrderItemBase(BaseModel):
    menu_id: int
    qty: int

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    menu: Menu
    
    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    serve_date: date
    delivery_type: DeliveryType
    request_time: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class OrderCreateWithName(BaseModel):
    serve_date: date
    delivery_type: DeliveryType
    request_time: Optional[str] = None
    customer_name: str
    items: List[OrderItemCreate]

class OrderCreateWithDepartmentName(BaseModel):
    serve_date: date
    delivery_type: DeliveryType
    request_time: Optional[str] = None
    delivery_location: Optional[str] = None
    department: str
    name: str
    items: List[OrderItemCreate]

class Order(OrderBase):
    id: int
    user_id: int
    total_price: int
    status: OrderStatus
    created_at: datetime
    user: User
    order_items: List[OrderItem]
    order_id: Optional[str] = None
    department: Optional[str] = None
    customer_name: Optional[str] = None
    delivered_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class MenuCreate(BaseModel):
    date: date
    title: str
    photo_url: Optional[str] = None

class MenuUpdate(BaseModel):
    title: Optional[str] = None
    photo_url: Optional[str] = None

class MenuResponse(BaseModel):
    id: int
    date: date
    title: str
    photo_url: Optional[str] = None
    items: List['MenuItemResponse'] = []

    class Config:
        from_attributes = True

class MenuItemCreate(BaseModel):
    name: str
    price: float
    stock: int

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None

class MenuItemResponse(BaseModel):
    id: int
    menu_id: int
    name: str
    price: float
    stock: int

    class Config:
        from_attributes = True

MenuResponse.model_rebuild()

class WeeklyMenuResponse(BaseModel):
    date: date
    menus: List[MenuWithRemaining]

class LoginRequest(BaseModel):
    email: str

class MenuSQLAlchemyBase(BaseModel):
    serve_date: date
    title: str
    price: int
    max_qty: int
    img_url: Optional[str] = None

class MenuSQLAlchemyCreate(MenuSQLAlchemyBase):
    pass

class MenuSQLAlchemyUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[int] = None
    max_qty: Optional[int] = None
    img_url: Optional[str] = None

class MenuSQLAlchemyResponse(MenuSQLAlchemyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
