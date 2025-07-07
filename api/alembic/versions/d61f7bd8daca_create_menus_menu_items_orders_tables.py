"""Create menus, menu_items, orders tables

Revision ID: d61f7bd8daca
Revises: 001
Create Date: 2025-07-07 11:23:43.668435

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'd61f7bd8daca'
down_revision: Union[str, Sequence[str], None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('menu',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('photo_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('menuitem',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('menu_id', sa.Integer(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('price', sa.Float(), nullable=False),
    sa.Column('stock', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['menu_id'], ['menu.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('order',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('menu_item_id', sa.Integer(), nullable=False),
    sa.Column('qty', sa.Integer(), nullable=False),
    sa.Column('customer_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['menu_item_id'], ['menuitem.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    op.drop_index(op.f('ix_menus_id'), table_name='menus')
    op.drop_table('menus')
    op.drop_index(op.f('ix_orders_id'), table_name='orders')
    op.drop_table('orders')
    op.drop_index(op.f('ix_order_items_id'), table_name='order_items')
    op.drop_table('order_items')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table('order_items',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('order_id', sa.INTEGER(), nullable=False),
    sa.Column('menu_id', sa.INTEGER(), nullable=False),
    sa.Column('qty', sa.INTEGER(), nullable=False),
    sa.ForeignKeyConstraint(['menu_id'], ['menus.id'], ),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_items_id'), 'order_items', ['id'], unique=False)
    op.create_table('orders',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('user_id', sa.INTEGER(), nullable=False),
    sa.Column('serve_date', sa.DATE(), nullable=False),
    sa.Column('delivery_type', sa.VARCHAR(length=6), nullable=False),
    sa.Column('request_time', sa.TIME(), nullable=True),
    sa.Column('total_price', sa.INTEGER(), nullable=False),
    sa.Column('status', sa.VARCHAR(length=9), nullable=True),
    sa.Column('created_at', sa.DATETIME(), server_default=sa.text('(now())'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_id'), 'orders', ['id'], unique=False)
    op.create_table('menus',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('serve_date', sa.DATE(), nullable=False),
    sa.Column('title', sa.VARCHAR(), nullable=False),
    sa.Column('price', sa.INTEGER(), nullable=False),
    sa.Column('max_qty', sa.INTEGER(), nullable=False),
    sa.Column('img_url', sa.VARCHAR(), nullable=True),
    sa.Column('created_at', sa.DATETIME(), server_default=sa.text('(now())'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_menus_id'), 'menus', ['id'], unique=False)
    
    op.drop_table('order')
    op.drop_table('menuitem')
    op.drop_table('menu')
