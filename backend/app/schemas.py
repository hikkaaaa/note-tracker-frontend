from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Literal, Optional

# --- USERS / AUTH ---
class UserRegister(BaseModel):
    nickname: str = Field(min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)

class UserLogin(BaseModel):
    nickname: str
    password: str
    # When true the client wants a long-lived (30-day) session that survives
    # browser restarts; otherwise the default session lifetime applies.
    remember: bool = False

class UserResponse(BaseModel):
    id: int
    nickname: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- PROFILE ---
# The editable profile shown on /profile. Persisted on the user row so it follows the
# account across devices and databases (it used to live in browser localStorage).
class ProfileResponse(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    gender: str
    avatar: str
    # Preferences.
    default_view: str = "grid"
    notify_weekly_summary: bool = False
    notify_folder_shared: bool = True
    # When the account was created — surfaced in the profile's stats block.
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=50)
    last_name: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    avatar: Optional[str] = None
    default_view: Optional[str] = None
    notify_weekly_summary: Optional[bool] = None
    notify_folder_shared: Optional[bool] = None

# Changing the account password from /profile: the current password is re-verified
# server-side before the new one (min 8 chars, matching registration) is stored.
class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

# Read-only account metadata for the profile "stats" block, plus a folder→note
# directory with per-item created time and storage for the aligned overview table.
class NoteStat(BaseModel):
    id: int
    title: str
    created_at: Optional[datetime] = None
    storage_bytes: int

class FolderStat(BaseModel):
    id: int
    name: str
    created_at: Optional[datetime] = None
    note_count: int
    storage_bytes: int
    notes: List[NoteStat]

class ProfileStats(BaseModel):
    created_at: datetime
    total_folders: int
    total_notes: int
    total_sections: int
    # Rough on-disk footprint of the user's content (section text + avatar), in bytes.
    storage_bytes: int
    folders: List[FolderStat]

# --- SECTIONS ---
class SectionCreate(BaseModel):
    type: str
    content: str
    title: Optional[str] = None

class SectionResponse(BaseModel):
    id: int
    note_id: int
    type: str
    content: str
    title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SectionUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None

# --- NOTES ---
class NoteCreate(BaseModel):
    title: str
    purpose: Optional[str] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    purpose: Optional[str] = None
    starred: Optional[bool] = None
    pinned: Optional[bool] = None

class NoteResponse(BaseModel):
    id: int
    title: str
    purpose: Optional[str] = None
    folder_id: int
    starred: bool = False
    pinned: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    sections: List[SectionResponse] = []
    # True when the note is reached through an accepted share rather than owned outright —
    # the frontend uses it to render a read-only note. All mutation routes stay owner-only.
    read_only: bool = False

    model_config = ConfigDict(from_attributes=True)

# --- FOLDERS ---
class FolderCreate(BaseModel):
    name: str
    purpose: Optional[str] = None
    color: Optional[str] = "blue"

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    purpose: Optional[str] = None
    color: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None

class FolderResponse(BaseModel):
    id: int
    name: str
    purpose: Optional[str] = None
    color: Optional[str] = "blue"
    user_id: Optional[int] = None
    pinned: bool = False
    archived: bool = False
    # Newest activity in this folder — max of the folder's own updated_at and its live
    # notes' updated_at. Drives the dashboard "Recent" filter.
    last_activity: Optional[datetime] = None
    notes: List[NoteResponse] = []
    # True when the folder is reached through an accepted share (read-only browse).
    read_only: bool = False

    model_config = ConfigDict(from_attributes=True)

# --- TRASH ---
# One card in the Trash grid: a folder that is either itself trashed (folder_deleted=True,
# opening reveals all its notes) or live but holding trashed notes (folder_deleted=False,
# opening reveals only those). trashed_count is how many notes the card will reveal.
class TrashFolder(BaseModel):
    id: int
    name: str
    purpose: Optional[str] = None
    color: Optional[str] = "blue"
    folder_deleted: bool
    trashed_count: int
    deleted_at: Optional[datetime] = None

# --- SHARING ---
# A user shares a whole folder (full_folder) or a subset of its notes (note_ids) with another
# user identified by nickname. The recipient sees it as a notification and can Accept/Decline.
class ShareCreate(BaseModel):
    recipient_nickname: str = Field(min_length=1, max_length=50)
    folder_id: int
    # True = share the entire folder (note_ids is ignored). False = share only note_ids.
    full_folder: bool = True
    note_ids: List[int] = []

class ShareRespond(BaseModel):
    action: Literal["ACCEPT", "DECLINE"]

# One pending share as shown in the recipient's notification panel.
class NotificationResponse(BaseModel):
    id: int
    sender_nickname: str
    folder_name: str
    folder_color: Optional[str] = "blue"
    full_folder: bool
    # How many notes the recipient will gain access to (all live notes for a full share).
    note_count: int
    created_at: Optional[datetime] = None

# An accepted share, surfaced under the recipient's "Shared" filter. Same shape as a folder
# card but read-only and tagged with who shared it. `notes` is already the shared subset.
class SharedFolderResponse(FolderResponse):
    share_id: int
    shared_by: str