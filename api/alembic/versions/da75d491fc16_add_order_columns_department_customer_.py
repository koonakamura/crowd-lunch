"""add_order_columns_department_customer_name_order_id

Revision ID: da75d491fc16
Revises: 
Create Date: 2025-07-25 02:22:14.627831

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da75d491fc16'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add department, customer_name, and order_id columns to orders table."""
    op.add_column('orders', sa.Column('department', sa.String(), nullable=True))
    op.add_column('orders', sa.Column('customer_name', sa.String(), nullable=True))
    op.add_column('orders', sa.Column('order_id', sa.String(), nullable=True))
    
    op.create_unique_constraint('uq_orders_order_id', 'orders', ['order_id'])
    
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE orders 
        SET order_id = '#LEGACY' || CAST(id AS TEXT)
        WHERE order_id IS NULL
    """))


def downgrade() -> None:
    """Remove department, customer_name, and order_id columns from orders table."""
    op.drop_constraint('uq_orders_order_id', 'orders', type_='unique')
    
    op.drop_column('orders', 'order_id')
    op.drop_column('orders', 'customer_name')
    op.drop_column('orders', 'department')
