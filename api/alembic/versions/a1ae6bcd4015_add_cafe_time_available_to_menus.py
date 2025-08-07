"""add_cafe_time_available_to_menus

Revision ID: a1ae6bcd4015
Revises: 7f7814b8ad67
Create Date: 2025-08-07 06:00:23.728831

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1ae6bcd4015'
down_revision: Union[str, Sequence[str], None] = '7f7814b8ad67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add cafe_time_available column to menus table."""
    with op.batch_alter_table('menus', schema=None) as batch_op:
        batch_op.add_column(sa.Column('cafe_time_available', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Remove cafe_time_available column from menus table."""
    with op.batch_alter_table('menus', schema=None) as batch_op:
        batch_op.drop_column('cafe_time_available')
