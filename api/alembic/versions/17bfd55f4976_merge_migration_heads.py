"""merge migration heads

Revision ID: 17bfd55f4976
Revises: 2c841cded694, a1ae6bcd4015
Create Date: 2025-08-07 09:46:09.655494

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17bfd55f4976'
down_revision: Union[str, Sequence[str], None] = '2c841cded694'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
