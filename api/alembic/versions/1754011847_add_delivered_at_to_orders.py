"""Add delivered_at timestamp to orders table

Revision ID: 1754011847
Revises: 7f7814b8ad67
Create Date: 2025-08-01 01:30:47.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1754011847'
down_revision: Union[str, Sequence[str], None] = '7f7814b8ad67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add delivered_at timestamp column to orders table."""
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove delivered_at timestamp column from orders table."""
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_column('delivered_at')
