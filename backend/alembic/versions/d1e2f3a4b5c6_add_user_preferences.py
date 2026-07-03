"""add user preferences

Adds the profile preference columns (default_view, notify_weekly_summary,
notify_folder_shared) to the users table. default_view seeds the dashboard's
grid/list toggle; the notify_* flags back the profile notification switches.

Revision ID: d1e2f3a4b5c6
Revises: c9d4e1f2a3b4
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c9d4e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default backfills existing rows so the NOT NULL constraint holds.
    op.add_column("users", sa.Column("default_view", sa.String(), nullable=False, server_default="grid"))
    op.add_column("users", sa.Column("notify_weekly_summary", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("notify_folder_shared", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("users", "notify_folder_shared")
    op.drop_column("users", "notify_weekly_summary")
    op.drop_column("users", "default_view")
