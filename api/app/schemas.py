from pydantic import BaseModel, Field
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
    cafe_time_available: Optional[bool] = False

class OrderItemBase(BaseModel):
    menu_id: int
    qty: int

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemOption(BaseModel):
    """注文明細に紐づく選択オプション（v2注文のみ）"""
    id: int
    name_snapshot: str
    price_delta_snapshot: int

    class Config:
        from_attributes = True

class OrderItem(BaseModel):
    """注文明細のレスポンス。

    旧モデル(/orders/guest)は menu_id + menu、v2モデル(/v2/orders/guest)は
    menu_id=NULL で name_snapshot/unit_price_snapshot を持つ。両方を返せるよう
    menu 系は Optional にする（必須にすると v2 注文が1件でも混ざった日の
    GET /orders 全体が ResponseValidationError で500になる）。
    """
    id: int
    qty: int
    menu_id: Optional[int] = None
    menu: Optional[Menu] = None
    name_snapshot: Optional[str] = None
    unit_price_snapshot: Optional[int] = None
    item_options: List[OrderItemOption] = []

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
    note: Optional[str] = Field(default=None, max_length=500)

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
    note: Optional[str] = None

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
