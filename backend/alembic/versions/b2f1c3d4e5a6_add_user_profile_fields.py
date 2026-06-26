"""add user profile fields

Adds the editable profile columns (first_name, last_name, gender, avatar) to the
users table. They were previously stored client-side in browser localStorage; moving
them onto the user row lets the profile follow the account across devices/databases.

Revision ID: b2f1c3d4e5a6
Revises: 7bbc679a5e93
Create Date: 2026-06-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2f1c3d4e5a6"
down_revision: Union[str, Sequence[str], None] = "7bbc679a5e93"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default '' backfills existing rows so the NOT NULL constraint holds.
    op.add_column("users", sa.Column("first_name", sa.String(), nullable=False, server_default=""))
    op.add_column("users", sa.Column("last_name", sa.String(), nullable=False, server_default=""))
    op.add_column("users", sa.Column("gender", sa.String(), nullable=False, server_default=""))
    op.add_column("users", sa.Column("avatar", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("users", "avatar")
    op.drop_column("users", "gender")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
