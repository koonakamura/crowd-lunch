"""Phase3: order_items に新モデル対応カラム追加 + order_item_options 新設

追加方式。menu_id を nullable 化（v2注文は旧menu非依存）。既存行は不変。

Revision ID: p3_orders_v1
Revises: p1_catalog_v1
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p3_orders_v1"
down_revision: Union[str, Sequence[str], None] = "p1_catalog_v1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("order_items", sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True))
    op.add_column("order_items", sa.Column("daily_menu_id", sa.Integer(), sa.ForeignKey("daily_menus.id"), nullable=True))
    op.add_column("order_items", sa.Column("name_snapshot", sa.String(), nullable=True))
    op.add_column("order_items", sa.Column("unit_price_snapshot", sa.Integer(), nullable=True))
    op.alter_column("order_items", "menu_id", existing_type=sa.Integer(), nullable=True)

    op.create_table(
        "order_item_options",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_item_id", sa.Integer(), sa.ForeignKey("order_items.id"), nullable=False),
        sa.Column("option_id", sa.Integer(), sa.ForeignKey("options.id"), nullable=True),
        sa.Column("name_snapshot", sa.String(), nullable=False),
        sa.Column("price_delta_snapshot", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_order_item_options_id", "order_item_options", ["id"])


def downgrade() -> None:
    op.drop_table("order_item_options")
    op.alter_column("order_items", "menu_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("order_items", "unit_price_snapshot")
    op.drop_column("order_items", "name_snapshot")
    op.drop_column("order_items", "daily_menu_id")
    op.drop_column("order_items", "product_id")
