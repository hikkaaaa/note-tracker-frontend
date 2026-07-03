"""add folder created_at

Adds folders.created_at so the profile account directory can show a real
per-folder creation time. Existing rows backfill to now.

Revision ID: e3a4b5c6d7e8
Revises: d1e2f3a4b5c6
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("folders", sa.Column("created_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE folders SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")


def downgrade() -> None:
    op.drop_column("folders", "created_at")
