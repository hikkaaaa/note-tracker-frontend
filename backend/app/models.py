from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from .database import Base


def _utcnow() -> datetime:
    """Naive UTC, matching the rest of the app (SQLite stores/compares naive datetimes)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    # Stored in UTC. A callable default (not datetime.utcnow()) so each row gets
    # its own insert-time timestamp rather than import-time.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Editable profile fields shown on /profile. Server-side default '' so the columns can be
    # added NOT NULL to a pre-existing table and existing rows backfill cleanly. avatar holds a
    # data-URL image (or '' for the gradient placeholder), hence Text rather than String.
    first_name = Column(String, nullable=False, default="", server_default="")
    last_name = Column(String, nullable=False, default="", server_default="")
    gender = Column(String, nullable=False, default="", server_default="")
    avatar = Column(Text, nullable=False, default="", server_default="")

    # Preferences shown on /profile. default_view seeds the dashboard's grid/list toggle;
    # the two notify_* flags drive (future) email notifications. Server-side defaults so the
    # columns can be added to a pre-existing table with existing rows backfilling cleanly.
    default_view = Column(String, nullable=False, default="grid", server_default="grid")
    notify_weekly_summary = Column(Boolean, nullable=False, default=False, server_default="0")
    notify_folder_shared = Column(Boolean, nullable=False, default=True, server_default="1")

    # Every folder belongs to exactly one user.
    folders = relationship("Folder", back_populates="owner", cascade="all, delete-orphan")

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    purpose = Column(String, nullable=True)
    color = Column(String, default="blue")
    # Nullable so the column can be added to a pre-existing SQLite DB (which can't add a
    # NOT NULL column without a default) and backfilled; new folders always set it from
    # the authenticated user, and the API only ever returns a user their own folders.
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    # Soft-delete marker. NULL = live; a UTC timestamp = in Trash since that moment.
    # Primary navigation queries filter these out; the Trash panel surfaces them, and the
    # 7-day auto-purge hard-deletes rows whose deleted_at is older than the retention window.
    deleted_at = Column(DateTime, nullable=True)
    # Organizational flags. pinned floats a folder to the "Pinned" filter; archived moves it
    # out of "All" into the "Archive" filter. Both default off so existing rows are unchanged.
    pinned = Column(Boolean, nullable=False, default=False, server_default="0")
    archived = Column(Boolean, nullable=False, default=False, server_default="0")
    # Last time the folder's own fields changed. The "Recent" filter combines this with the
    # newest note activity inside the folder (see _folder_out).
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
    # Set once on insert. Surfaced (per folder) in the profile's account directory.
    created_at = Column(DateTime, default=_utcnow)

    owner = relationship("User", back_populates="folders")
    notes = relationship("Note", back_populates="folder", cascade="all, delete-orphan")
    # Shares of this folder. Cascade so a hard purge (db.delete(folder)) drops the share
    # rows too, revoking recipients' access — see the Trash purge routes.
    shares = relationship("Share", back_populates="folder", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    purpose = Column(String, nullable=True)
    # Notes have no color of their own — they always inherit their parent folder's color
    # (rendered on the frontend). The legacy `notes.color` column, if present from an
    # earlier build, is intentionally left unmapped and unused.
    folder_id = Column(Integer, ForeignKey("folders.id"))
    # Soft-delete marker (see Folder.deleted_at). A note can be trashed on its own while
    # its parent folder stays live (the folder then appears in Trash as a container).
    deleted_at = Column(DateTime, nullable=True)
    # Two independent organizational marks: starred drives the "Starred" filter; pinned
    # floats the note to the top of its folder. (A note can be both.)
    starred = Column(Boolean, nullable=False, default=False, server_default="0")
    pinned = Column(Boolean, nullable=False, default=False, server_default="0")
    # Activity tracking. created_at is set once on insert; updated_at bumps on any title/
    # purpose/flag change AND whenever a section (block) is created, edited, or removed, so
    # "Recent" reflects real editing — not just metadata edits.
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    folder = relationship("Folder", back_populates="notes")
    sections = relationship("Section", back_populates="note", cascade="all, delete-orphan")
    # Association rows tying this note into partial folder shares. Cascade so purging the
    # note (db.delete(note)) removes it from any share it was individually part of.
    share_links = relationship("ShareNote", back_populates="note", cascade="all, delete-orphan")

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    type = Column(String) # 'calendar', 'text', or 'checklist'
    content = Column(String) # Storing content as a text/JSON string for now
    # Optional per-block title. NULL means "no title" (e.g. text/code blocks, or a block
    # whose title was removed); an empty string means a titled block awaiting text.
    title = Column(String, nullable=True)

    note = relationship("Note", back_populates="sections")


class Share(Base):
    """One folder shared from a sender to a recipient. A full-folder share (full_folder=True)
    grants the recipient every live note in the folder, including notes added later; a partial
    share grants only the notes listed in `notes` (ShareNote rows). Read-only by design — the
    recipient only ever gains access to GET endpoints, never the mutation routes."""
    __tablename__ = "shares"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), index=True, nullable=False)
    # True = share the whole folder (all current and future notes); False = only the notes
    # enumerated in `notes` below.
    full_folder = Column(Boolean, nullable=False, default=False, server_default="0")
    # PENDING (awaiting the recipient's decision) → ACCEPTED / DECLINED. Only ACCEPTED shares
    # grant read access; PENDING ones surface as notifications; DECLINED ones are kept for
    # history but hidden everywhere.
    status = Column(String, nullable=False, default="PENDING", server_default="PENDING")
    created_at = Column(DateTime, default=_utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    folder = relationship("Folder", back_populates="shares")
    notes = relationship("ShareNote", back_populates="share", cascade="all, delete-orphan")


class ShareNote(Base):
    """Association row naming a single note in a partial folder share."""
    __tablename__ = "share_notes"

    id = Column(Integer, primary_key=True, index=True)
    share_id = Column(Integer, ForeignKey("shares.id"), index=True, nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), index=True, nullable=False)

    share = relationship("Share", back_populates="notes")
    note = relationship("Note", back_populates="share_links")