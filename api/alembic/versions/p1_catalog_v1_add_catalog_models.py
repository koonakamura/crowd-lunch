"""Phase1: catalog models (categories/products/options/daily_menus/templates/media)

追加方式のマイグレーション。既存テーブル(menus/orders等)には触れない。

Revision ID: p1_catalog_v1
Revises: 8a3e1c2f9b21
Create Date: 2026-06-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p1_catalog_v1"
down_revision: Union[str, Sequence[str], None] = "8a3e1c2f9b21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="lunch"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_categories_id", "categories", ["id"])

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("base_price", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_products_id", "products", ["id"])

    op.create_table(
        "option_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("min_select", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_select", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_option_groups_id", "option_groups", ["id"])

    op.create_table(
        "options",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("option_group_id", sa.Integer(), sa.ForeignKey("option_groups.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("price_delta", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_options_id", "options", ["id"])

    op.create_table(
        "daily_menus",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("serve_date", sa.Date(), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("price_override", sa.Integer(), nullable=True),
        sa.Column("max_qty", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("available_from", sa.Time(), nullable=True),
        sa.Column("available_to", sa.Time(), nullable=True),
        sa.Column("cafe_time_available", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("serve_date", "product_id", name="uq_daily_menus_date_product"),
    )
    op.create_index("ix_daily_menus_id", "daily_menus", ["id"])
    op.create_index("ix_daily_menus_serve_date", "daily_menus", ["serve_date"])

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=True),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False, server_default="hero"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_media_assets_id", "media_assets", ["id"])

    op.create_table(
        "day_settings",
        sa.Column("serve_date", sa.Date(), primary_key=True),
        sa.Column("hero_image_id", sa.Integer(), sa.ForeignKey("media_assets.id"), nullable=True),
        sa.Column("banner_text", sa.String(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
    )

    op.create_table(
        "menu_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_menu_templates_id", "menu_templates", ["id"])

    op.create_table(
        "template_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("menu_templates.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("price_override", sa.Integer(), nullable=True),
        sa.Column("max_qty", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_template_items_id", "template_items", ["id"])


def downgrade() -> None:
    op.drop_table("template_items")
    op.drop_table("menu_templates")
    op.drop_table("day_settings")
    op.drop_table("media_assets")
    op.drop_table("daily_menus")
    op.drop_table("options")
    op.drop_table("option_groups")
    op.drop_table("products")
    op.drop_table("categories")
