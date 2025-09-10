from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time, datetime
from .models import DeliveryType, OrderStatus, PaymentMethod, PaymentStatus, RefundStatus, DocumentType

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
    cafe_time_available: Optional[bool] = False

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
    delivery_location: Optional[str] = None
    pickup_at: Optional[datetime] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class OrderCreateWithName(BaseModel):
    serve_date: date
    delivery_type: DeliveryType
    request_time: Optional[str] = None
    delivery_location: Optional[str] = None
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
    pickup_at: Optional[datetime] = None

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
    delivery_location: Optional[str] = None
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
    cafe_time_available: Optional[bool] = False

class MenuSQLAlchemyCreate(MenuSQLAlchemyBase):
    pass

class MenuSQLAlchemyUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[int] = None
    max_qty: Optional[int] = None
    img_url: Optional[str] = None
    cafe_time_available: Optional[bool] = None

class MenuSQLAlchemyResponse(MenuSQLAlchemyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TimeSlotBase(BaseModel):
    slot_datetime: datetime
    max_orders: int = 20
    is_available: bool = True

class TimeSlotCreate(TimeSlotBase):
    pass

class TimeSlot(TimeSlotBase):
    id: int
    current_orders: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    payment_method: PaymentMethod
    amount: int

class PaymentCreate(PaymentBase):
    payment_gateway: str
    gateway_transaction_id: Optional[str] = None

class Payment(PaymentBase):
    id: int
    order_id: int
    payment_gateway: str
    gateway_transaction_id: Optional[str] = None
    status: PaymentStatus
    gateway_response: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class RefundBase(BaseModel):
    amount: int
    reason: Optional[str] = None

class RefundCreate(RefundBase):
    payment_id: int

class Refund(RefundBase):
    id: int
    payment_id: int
    status: RefundStatus
    gateway_refund_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class LegalDocumentBase(BaseModel):
    document_type: str
    title: str
    content: str
    version: int = 1
    is_active: bool = False

class LegalDocumentCreate(LegalDocumentBase):
    pass

class LegalDocument(LegalDocumentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class OrderCreateWithTimeSlot(OrderBase):
    time_slot_id: Optional[int] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[OrderItemCreate]

class GuestOrderCreate(BaseModel):
    serve_date: date
    delivery_type: DeliveryType
    request_time: Optional[str] = None
    delivery_location: Optional[str] = None
    department: str
    customer_name: str
    time_slot_id: Optional[int] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[OrderItemCreate]
