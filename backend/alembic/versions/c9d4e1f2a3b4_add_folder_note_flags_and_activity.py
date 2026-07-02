"""add folder/note flags and activity timestamps

Adds the organizational flags and activity-tracking columns that back the dashboard
"Pinned" / "Archive" / "Recent" filters and the note "Starred" filter:

  folders: pinned, archived, updated_at
  notes:   starred, pinned, created_at, updated_at

Booleans default to false for every existing row (server_default "0", matching the
models). The timestamps are added with a temporary now() server default so pre-existing
rows get a non-NULL value (and therefore show up under "Recent" for the window right
after deploy); the default is then dropped so the columns follow the app-side
default/onupdate exactly like the models define them.

Revision ID: c9d4e1f2a3b4
Revises: b2f1c3d4e5a6
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d4e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b2f1c3d4e5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- folders ---
    # Organizational flags — false for every existing row (matches the model default).
    op.add_column("folders", sa.Column("pinned", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("folders", sa.Column("archived", sa.Boolean(), nullable=False, server_default="0"))
    # Activity timestamp. Added with a now() default to backfill existing rows, then the
    # default is removed so the column is app-managed (default/onupdate=_utcnow) like the model.
    op.add_column("folders", sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.alter_column("folders", "updated_at", server_default=None)

    # --- notes ---
    op.add_column("notes", sa.Column("starred", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("notes", sa.Column("pinned", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("notes", sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.add_column("notes", sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.alter_column("notes", "created_at", server_default=None)
    op.alter_column("notes", "updated_at", server_default=None)


def downgrade() -> None:
    op.drop_column("notes", "updated_at")
    op.drop_column("notes", "created_at")
    op.drop_column("notes", "pinned")
    op.drop_column("notes", "starred")
    op.drop_column("folders", "updated_at")
    op.drop_column("folders", "archived")
    op.drop_column("folders", "pinned")
