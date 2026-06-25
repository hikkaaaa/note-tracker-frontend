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

class NoteResponse(BaseModel):
    id: int
    title: str
    purpose: Optional[str] = None
    folder_id: int
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

class FolderResponse(BaseModel):
    id: int
    name: str
    purpose: Optional[str] = None
    color: Optional[str] = "blue"
    user_id: Optional[int] = None
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