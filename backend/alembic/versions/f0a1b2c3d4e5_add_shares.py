"""add folder/note sharing

Creates the `shares` and `share_notes` tables that back the folder & note sharing
feature. A share links a sender to a recipient for one folder (full-folder or a subset
of notes) and carries a PENDING/ACCEPTED/DECLINED status.

Revision ID: f0a1b2c3d4e5
Revises: e3a4b5c6d7e8
Create Date: 2026-07-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "e3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shares",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=False),
        sa.Column("folder_id", sa.Integer(), nullable=False),
        sa.Column("full_folder", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("status", sa.String(), server_default="PENDING", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["folder_id"], ["folders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shares_id", "shares", ["id"])
    op.create_index("ix_shares_sender_id", "shares", ["sender_id"])
    op.create_index("ix_shares_recipient_id", "shares", ["recipient_id"])
    op.create_index("ix_shares_folder_id", "shares", ["folder_id"])

    op.create_table(
        "share_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("share_id", sa.Integer(), nullable=False),
        sa.Column("note_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["share_id"], ["shares.id"]),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_share_notes_id", "share_notes", ["id"])
    op.create_index("ix_share_notes_share_id", "share_notes", ["share_id"])
    op.create_index("ix_share_notes_note_id", "share_notes", ["note_id"])


def downgrade() -> None:
    op.drop_index("ix_share_notes_note_id", table_name="share_notes")
    op.drop_index("ix_share_notes_share_id", table_name="share_notes")
    op.drop_index("ix_share_notes_id", table_name="share_notes")
    op.drop_table("share_notes")
    op.drop_index("ix_shares_folder_id", table_name="shares")
    op.drop_index("ix_shares_recipient_id", table_name="shares")
    op.drop_index("ix_shares_sender_id", table_name="shares")
    op.drop_index("ix_shares_id", table_name="shares")
    op.drop_table("shares")
