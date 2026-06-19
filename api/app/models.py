from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime, time
import enum

from sqlalchemy import Column, Integer, String, Text, Date, Time, DateTime, ForeignKey, Enum, Boolean, UniqueConstraint
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
    cafe_time_available = Column(Boolean, default=False, nullable=False)
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
    note = Column(String, nullable=True)
    
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


# =====================================================================
# Phase 1: 新データモデル（商品マスタ＋オプション＋カテゴリ＋日次提供＋
# テンプレ＋画像ライブラリ）。既存 menus/orders とは別テーブルで追加（後方互換）。
# 詳細: docs/overhaul-design.md
# =====================================================================

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    kind = Column(String, nullable=False, default="lunch")  # lunch/cafe/drink/bowl/other
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="category")


class Product(Base):
    """商品マスタ（日付に依存しない再利用可能な商品）"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    base_price = Column(Integer, nullable=False, default=0)
    image_url = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="products")
    option_groups = relationship("OptionGroup", back_populates="product")


class OptionGroup(Base):
    """オプション群（例: ご飯の量 / トッピング）。product_id=NULL で共有グループ。"""
    __tablename__ = "option_groups"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    name = Column(String, nullable=False)
    min_select = Column(Integer, nullable=False, default=0)
    max_select = Column(Integer, nullable=False, default=1)
    is_required = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="option_groups")
    options = relationship("Option", back_populates="group")


class Option(Base):
    """オプション（例: 大盛 +¥200 / 半熟卵 +¥100 / はちみつ ¥0）。price_delta が増減金額。"""
    __tablename__ = "options"

    id = Column(Integer, primary_key=True, index=True)
    option_group_id = Column(Integer, ForeignKey("option_groups.id"), nullable=False)
    name = Column(String, nullable=False)
    price_delta = Column(Integer, nullable=False, default=0)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    group = relationship("OptionGroup", back_populates="options")


class DailyMenu(Base):
    """日次提供（旧 menus の置き換え）。商品マスタを参照し、その日の価格/数量/並び順を持つ。"""
    __tablename__ = "daily_menus"
    __table_args__ = (UniqueConstraint("serve_date", "product_id", name="uq_daily_menus_date_product"),)

    id = Column(Integer, primary_key=True, index=True)
    serve_date = Column(Date, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price_override = Column(Integer, nullable=True)
    max_qty = Column(Integer, nullable=False, default=30)
    sort_order = Column(Integer, nullable=False, default=0)
    is_available = Column(Boolean, nullable=False, default=True)
    available_from = Column(Time, nullable=True)
    available_to = Column(Time, nullable=True)
    cafe_time_available = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")


class MediaAsset(Base):
    """画像ライブラリ（アップロード画像の保管箱）"""
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    filename = Column(String, nullable=True)
    label = Column(String, nullable=True)
    kind = Column(String, nullable=False, default="hero")  # hero/product/other
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DaySetting(Base):
    """日付ごとの表示設定（お客様画面のヒーロー画像など）"""
    __tablename__ = "day_settings"

    serve_date = Column(Date, primary_key=True)
    hero_image_id = Column(Integer, ForeignKey("media_assets.id"), nullable=True)
    banner_text = Column(String, nullable=True)
    note = Column(Text, nullable=True)

    hero_image = relationship("MediaAsset")


class MenuTemplate(Base):
    """献立テンプレ（サーバ保存）。weekday=0..6 で曜日デフォルト、NULL で任意名テンプレ。"""
    __tablename__ = "menu_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    weekday = Column(Integer, nullable=True)  # 0=月 .. 6=日 / NULL=任意
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("TemplateItem", back_populates="template")


class TemplateItem(Base):
    __tablename__ = "template_items"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("menu_templates.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price_override = Column(Integer, nullable=True)
    max_qty = Column(Integer, nullable=False, default=30)
    sort_order = Column(Integer, nullable=False, default=0)

    template = relationship("MenuTemplate", back_populates="items")
    product = relationship("Product")
