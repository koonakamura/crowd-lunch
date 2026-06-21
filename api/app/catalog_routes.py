"""Phase 1: 新カタログモデル（商品マスタ＋オプション＋カテゴリ＋日次提供＋テンプレ）のAPI。

既存の /menus 系とは別に /v2・/admin/catalog 配下で追加（後方互換）。
更新系は CORS の allow_methods に合わせて PUT を使用（PATCH不可）。
詳細: docs/overhaul-design.md
"""
import os
import uuid
from datetime import date as date_type
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .auth import get_current_admin
from . import models

router = APIRouter(tags=["catalog-v2"])

# 画像保存先: 本番は永続ボリューム /data、無ければローカル(uploads/media)
MEDIA_DIR = Path(os.getenv("MEDIA_DIR") or ("/data/media" if os.path.isdir("/data") else "uploads/media"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


# ----------------------------- Schemas -----------------------------
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    kind: str
    sort_order: int
    is_active: bool


class CategoryIn(BaseModel):
    name: str
    kind: str = "lunch"
    sort_order: int = 0
    is_active: bool = True


class OptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    option_group_id: int
    name: str
    price_delta: int
    sort_order: int
    is_active: bool


class OptionGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: Optional[int]
    name: str
    min_select: int
    max_select: int
    is_required: bool
    sort_order: int
    options: List[OptionOut] = []


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: Optional[int]
    name: str
    description: Optional[str] = None
    base_price: int
    image_url: Optional[str] = None
    is_active: bool
    option_groups: List[OptionGroupOut] = []


class ProductIn(BaseModel):
    category_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    base_price: int = 0
    image_url: Optional[str] = None
    is_active: bool = True


class DailyMenuOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    serve_date: date_type
    product_id: int
    price_override: Optional[int]
    max_qty: int
    sort_order: int
    is_available: bool
    cafe_time_available: bool
    product: ProductOut


class DailyMenuIn(BaseModel):
    serve_date: date_type
    product_id: int
    price_override: Optional[int] = None
    max_qty: int = 30
    sort_order: int = 0
    is_available: bool = True
    cafe_time_available: bool = False


class DailyMenuUpdate(BaseModel):
    price_override: Optional[int] = None
    max_qty: Optional[int] = None
    sort_order: Optional[int] = None
    is_available: Optional[bool] = None
    cafe_time_available: Optional[bool] = None


class OptionGroupIn(BaseModel):
    product_id: Optional[int] = None
    name: str
    min_select: int = 0
    max_select: int = 1
    is_required: bool = False
    sort_order: int = 0


class OptionIn(BaseModel):
    option_group_id: int
    name: str
    price_delta: int = 0
    sort_order: int = 0
    is_active: bool = True


class TemplateItemIn(BaseModel):
    product_id: int
    price_override: Optional[int] = None
    max_qty: int = 30
    sort_order: int = 0


class TemplateIn(BaseModel):
    name: str
    weekday: Optional[int] = None
    note: Optional[str] = None
    items: List[TemplateItemIn] = []


class TemplateItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    price_override: Optional[int]
    max_qty: int
    sort_order: int


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    weekday: Optional[int]
    note: Optional[str]
    items: List[TemplateItemOut] = []


class PublicMenuItem(BaseModel):
    daily_menu_id: int
    product_id: int
    name: str
    description: Optional[str]
    price: int
    image_url: Optional[str]
    max_qty: int
    cafe_time_available: bool
    category: Optional[str]
    option_groups: List[OptionGroupOut] = []


# ----------------------------- Helpers -----------------------------
def _product_query(db: Session):
    return db.query(models.Product).options(
        selectinload(models.Product.option_groups).selectinload(models.OptionGroup.options)
    )


# ----------------------------- Public read -----------------------------
@router.get("/v2/menus", response_model=List[PublicMenuItem])
def get_v2_menus(date: date_type, db: Session = Depends(get_db)):
    """指定日の日次メニュー（商品＋オプション＋有効価格）。お客様画面用。"""
    rows = (
        db.query(models.DailyMenu)
        .filter(models.DailyMenu.serve_date == date, models.DailyMenu.is_available == True)  # noqa: E712
        .order_by(models.DailyMenu.sort_order, models.DailyMenu.id)
        .all()
    )
    out = []
    for dm in rows:
        p = dm.product
        if not p or not p.is_active:
            continue
        groups = (
            db.query(models.OptionGroup)
            .filter(models.OptionGroup.product_id == p.id)
            .order_by(models.OptionGroup.sort_order, models.OptionGroup.id)
            .all()
        )
        cat = p.category.name if p.category else None
        out.append(PublicMenuItem(
            daily_menu_id=dm.id, product_id=p.id, name=p.name, description=p.description,
            price=dm.price_override if dm.price_override is not None else p.base_price,
            image_url=p.image_url, max_qty=dm.max_qty, cafe_time_available=dm.cafe_time_available,
            category=cat, option_groups=[OptionGroupOut.model_validate(g) for g in groups],
        ))
    return out


# ----------------------------- Admin: categories -----------------------------
@router.get("/admin/catalog/categories", response_model=List[CategoryOut])
def list_categories(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.sort_order, models.Category.id).all()


@router.post("/admin/catalog/categories", response_model=CategoryOut)
def create_category(body: CategoryIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    c = models.Category(**body.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return c


# ----------------------------- Admin: products -----------------------------
@router.get("/admin/catalog/products", response_model=List[ProductOut])
def list_products(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return _product_query(db).order_by(models.Product.category_id, models.Product.name).all()


@router.post("/admin/catalog/products", response_model=ProductOut)
def create_product(body: ProductIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    p = models.Product(**body.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return p


@router.put("/admin/catalog/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, body: ProductIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    p = db.query(models.Product).get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="product not found")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return p


@router.delete("/admin/catalog/products/{product_id}")
def delete_product(product_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    p = db.query(models.Product).get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="product not found")
    db.delete(p); db.commit()
    return {"ok": True}


# ----------------------------- Admin: daily menus -----------------------------
@router.get("/admin/catalog/daily-menus", response_model=List[DailyMenuOut])
def list_daily_menus(date: date_type, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return (
        _daily_query(db)
        .filter(models.DailyMenu.serve_date == date)
        .order_by(models.DailyMenu.sort_order, models.DailyMenu.id)
        .all()
    )


def _daily_query(db: Session):
    return db.query(models.DailyMenu).options(
        selectinload(models.DailyMenu.product).selectinload(models.Product.option_groups)
    )


@router.post("/admin/catalog/daily-menus", response_model=DailyMenuOut)
def create_daily_menu(body: DailyMenuIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    dm = models.DailyMenu(**body.model_dump())
    db.add(dm); db.commit(); db.refresh(dm)
    return dm


@router.put("/admin/catalog/daily-menus/{dm_id}", response_model=DailyMenuOut)
def update_daily_menu(dm_id: int, body: DailyMenuUpdate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    dm = db.query(models.DailyMenu).get(dm_id)
    if not dm:
        raise HTTPException(status_code=404, detail="daily_menu not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(dm, k, v)
    db.commit(); db.refresh(dm)
    return dm


@router.delete("/admin/catalog/daily-menus/{dm_id}")
def delete_daily_menu(dm_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    dm = db.query(models.DailyMenu).get(dm_id)
    if not dm:
        raise HTTPException(status_code=404, detail="daily_menu not found")
    db.delete(dm); db.commit()
    return {"ok": True}


# ----------------------------- Admin: option groups / options -----------------------------
@router.post("/admin/catalog/option-groups", response_model=OptionGroupOut)
def create_option_group(body: OptionGroupIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    g = models.OptionGroup(**body.model_dump())
    db.add(g); db.commit(); db.refresh(g)
    return g


@router.delete("/admin/catalog/option-groups/{group_id}")
def delete_option_group(group_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    g = db.query(models.OptionGroup).get(group_id)
    if not g:
        raise HTTPException(status_code=404, detail="option_group not found")
    db.delete(g); db.commit()
    return {"ok": True}


@router.post("/admin/catalog/options", response_model=OptionOut)
def create_option(body: OptionIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    o = models.Option(**body.model_dump())
    db.add(o); db.commit(); db.refresh(o)
    return o


@router.delete("/admin/catalog/options/{option_id}")
def delete_option(option_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    o = db.query(models.Option).get(option_id)
    if not o:
        raise HTTPException(status_code=404, detail="option not found")
    db.delete(o); db.commit()
    return {"ok": True}


# ----------------------------- Admin: templates -----------------------------
@router.get("/admin/catalog/templates", response_model=List[TemplateOut])
def list_templates(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.MenuTemplate).options(
        selectinload(models.MenuTemplate.items)
    ).order_by(models.MenuTemplate.id).all()


@router.post("/admin/catalog/templates", response_model=TemplateOut)
def create_template(body: TemplateIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    t = models.MenuTemplate(name=body.name, weekday=body.weekday, note=body.note)
    db.add(t); db.flush()
    for it in body.items:
        db.add(models.TemplateItem(template_id=t.id, **it.model_dump()))
    db.commit(); db.refresh(t)
    return t


@router.delete("/admin/catalog/templates/{template_id}")
def delete_template(template_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    t = db.query(models.MenuTemplate).get(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="template not found")
    for it in db.query(models.TemplateItem).filter(models.TemplateItem.template_id == template_id).all():
        db.delete(it)
    db.delete(t); db.commit()
    return {"ok": True}


@router.post("/admin/catalog/templates/{template_id}/apply", response_model=List[DailyMenuOut])
def apply_template(template_id: int, date: date_type, replace: bool = False,
                   admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    """テンプレを指定日に適用し daily_menus を生成する。replace=True で既存をその日分クリアしてから。"""
    t = db.query(models.MenuTemplate).get(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="template not found")
    if replace:
        for dm in db.query(models.DailyMenu).filter(models.DailyMenu.serve_date == date).all():
            db.delete(dm)
        db.flush()
    existing = {dm.product_id for dm in db.query(models.DailyMenu).filter(models.DailyMenu.serve_date == date).all()}
    for it in db.query(models.TemplateItem).filter(models.TemplateItem.template_id == template_id).all():
        if it.product_id in existing:
            continue
        db.add(models.DailyMenu(
            serve_date=date, product_id=it.product_id, price_override=it.price_override,
            max_qty=it.max_qty, sort_order=it.sort_order, is_available=True,
        ))
    db.commit()
    return (
        _daily_query(db).filter(models.DailyMenu.serve_date == date)
        .order_by(models.DailyMenu.sort_order, models.DailyMenu.id).all()
    )


# ----------------------------- Media library -----------------------------
class MediaAssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    url: str
    filename: Optional[str]
    label: Optional[str]
    kind: str
    is_active: bool


@router.get("/admin/catalog/media", response_model=List[MediaAssetOut])
def list_media(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.MediaAsset).filter(models.MediaAsset.is_active == True).order_by(models.MediaAsset.id.desc()).all()  # noqa: E712


@router.post("/admin/catalog/media", response_model=MediaAssetOut)
async def upload_media(file: UploadFile = File(...), admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=400, detail="対応していない画像形式です")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="画像サイズは8MB以下にしてください")
    name = f"{uuid.uuid4().hex}{ext}"
    (MEDIA_DIR / name).write_bytes(data)
    asset = models.MediaAsset(url=f"/media/{name}", filename=file.filename, kind="hero")
    db.add(asset); db.commit(); db.refresh(asset)
    return asset


@router.delete("/admin/catalog/media/{media_id}")
def delete_media(media_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    a = db.query(models.MediaAsset).get(media_id)
    if not a:
        raise HTTPException(status_code=404, detail="media not found")
    a.is_active = False  # 論理削除（既存参照を壊さない）
    db.commit()
    return {"ok": True}


# ----------------------------- Day settings (hero image) -----------------------------
class DaySettingOut(BaseModel):
    serve_date: date_type
    hero_image_id: Optional[int] = None
    hero_image_url: Optional[str] = None
    banner_text: Optional[str] = None


class DaySettingIn(BaseModel):
    hero_image_id: Optional[int] = None
    banner_text: Optional[str] = None


def _day_setting_out(db: Session, ds: Optional[models.DaySetting], serve_date: date_type) -> DaySettingOut:
    if not ds:
        return DaySettingOut(serve_date=serve_date)
    url = None
    if ds.hero_image_id:
        a = db.query(models.MediaAsset).get(ds.hero_image_id)
        url = a.url if a else None
    return DaySettingOut(serve_date=ds.serve_date, hero_image_id=ds.hero_image_id,
                         hero_image_url=url, banner_text=ds.banner_text)


@router.get("/admin/catalog/day-settings", response_model=DaySettingOut)
def get_day_setting(date: date_type, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    ds = db.query(models.DaySetting).get(date)
    return _day_setting_out(db, ds, date)


@router.put("/admin/catalog/day-settings", response_model=DaySettingOut)
def set_day_setting(date: date_type, body: DaySettingIn, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    ds = db.query(models.DaySetting).get(date)
    if not ds:
        ds = models.DaySetting(serve_date=date)
        db.add(ds)
    ds.hero_image_id = body.hero_image_id
    if body.banner_text is not None:
        ds.banner_text = body.banner_text
    db.commit(); db.refresh(ds)
    return _day_setting_out(db, ds, date)


@router.get("/v2/day-settings", response_model=DaySettingOut)
def public_day_setting(date: date_type, db: Session = Depends(get_db)):
    ds = db.query(models.DaySetting).get(date)
    return _day_setting_out(db, ds, date)
