"""add note column to orders table

Revision ID: 8a3e1c2f9b21
Revises: 17bfd55f4976
Create Date: 2026-05-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a3e1c2f9b21'
down_revision: Union[str, Sequence[str], None] = '17bfd55f4976'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add note column to orders table."""
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('note', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove note column from orders table."""
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_column('note')
