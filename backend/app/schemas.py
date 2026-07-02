from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Optional

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

    model_config = ConfigDict(from_attributes=True)

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    avatar: Optional[str] = None

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