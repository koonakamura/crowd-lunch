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
down_revision: Union[str, Sequence[str], None] = 'd61f7bd8daca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add department, customer_name, and order_id columns to orders table."""
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('department', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('customer_name', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('order_id', sa.String(), nullable=True))
    
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE orders 
        SET order_id = '#LEGACY' || CAST(id AS TEXT)
        WHERE order_id IS NULL
    """))
    
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_orders_order_id', ['order_id'])


def downgrade() -> None:
    """Remove department, customer_name, and order_id columns from orders table."""
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_constraint('uq_orders_order_id', type_='unique')
        batch_op.drop_column('order_id')
        batch_op.drop_column('customer_name')
        batch_op.drop_column('department')
