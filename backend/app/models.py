from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    # Stored in UTC. A callable default (not datetime.utcnow()) so each row gets
    # its own insert-time timestamp rather than import-time.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

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

    owner = relationship("User", back_populates="folders")
    notes = relationship("Note", back_populates="folder", cascade="all, delete-orphan")

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

    folder = relationship("Folder", back_populates="notes")
    sections = relationship("Section", back_populates="note", cascade="all, delete-orphan")

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