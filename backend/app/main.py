from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text, inspect, func
from sqlalchemy.orm import Session
from typing import List, Optional

from . import models, schemas, auth
from .config import CORS_ORIGINS, IS_SQLITE
from .database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)


def _migrate_section_title():
    """Add the sections.title column to pre-existing databases and, only on first add,
    default-enable a title on the block types that should have one."""
    cols = [c["name"] for c in inspect(engine).get_columns("sections")]
    if "title" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE sections ADD COLUMN title VARCHAR"))
            conn.execute(text(
                "UPDATE sections SET title='' "
                "WHERE type IN ('checklist', 'tickbox', 'list', 'table')"
            ))


def _migrate_folder_user_id():
    """Add folders.user_id to pre-existing databases. SQLite can't add a NOT NULL column
    without a default, so the column is nullable here; existing rows are backfilled by the
    one-time data migration (see scripts/assign_folders_to_user.* / the README), and every
    new folder is written with the authenticated user's id."""
    cols = [c["name"] for c in inspect(engine).get_columns("folders")]
    if "user_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE folders ADD COLUMN user_id INTEGER REFERENCES users(id)"))


def _migrate_soft_delete():
    """Add the nullable deleted_at column to folders and notes on pre-existing databases.
    NULL = live; a timestamp = trashed. Existing rows default to NULL (live), so nothing
    is hidden by the migration itself."""
    for table in ("folders", "notes"):
        cols = [c["name"] for c in inspect(engine).get_columns(table)]
        if "deleted_at" not in cols:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN deleted_at DATETIME"))


def _migrate_user_profile():
    """Add the profile columns (first_name/last_name/gender/avatar) to a pre-existing users
    table. NOT NULL with a '' default so existing rows backfill without a manual step."""
    cols = [c["name"] for c in inspect(engine).get_columns("users")]
    with engine.begin() as conn:
        for col in ("first_name", "last_name", "gender"):
            if col not in cols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} VARCHAR NOT NULL DEFAULT ''"))
        if "avatar" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT ''"))


def _migrate_org_fields():
    """Add the pin/archive flags and activity timestamps to pre-existing folders/notes.
    Booleans get a NOT NULL DEFAULT 0 (off). Timestamps are added nullable and backfilled to
    'now' so existing rows have a sane last-activity instead of sorting as epoch-old."""
    folder_cols = [c["name"] for c in inspect(engine).get_columns("folders")]
    note_cols = [c["name"] for c in inspect(engine).get_columns("notes")]
    with engine.begin() as conn:
        for col in ("pinned", "archived"):
            if col not in folder_cols:
                conn.execute(text(f"ALTER TABLE folders ADD COLUMN {col} BOOLEAN NOT NULL DEFAULT 0"))
        for col in ("updated_at", "created_at"):
            if col not in folder_cols:
                conn.execute(text(f"ALTER TABLE folders ADD COLUMN {col} DATETIME"))
                conn.execute(text(f"UPDATE folders SET {col} = CURRENT_TIMESTAMP WHERE {col} IS NULL"))
        for col in ("starred", "pinned"):
            if col not in note_cols:
                conn.execute(text(f"ALTER TABLE notes ADD COLUMN {col} BOOLEAN NOT NULL DEFAULT 0"))
        for col in ("created_at", "updated_at"):
            if col not in note_cols:
                conn.execute(text(f"ALTER TABLE notes ADD COLUMN {col} DATETIME"))
                conn.execute(text(f"UPDATE notes SET {col} = CURRENT_TIMESTAMP WHERE {col} IS NULL"))


def _migrate_user_preferences():
    """Add the preference columns (default_view/notify_*) to a pre-existing users table.
    NOT NULL with sensible defaults so existing rows backfill without a manual step."""
    cols = [c["name"] for c in inspect(engine).get_columns("users")]
    with engine.begin() as conn:
        if "default_view" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN default_view VARCHAR NOT NULL DEFAULT 'grid'"))
        if "notify_weekly_summary" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN notify_weekly_summary BOOLEAN NOT NULL DEFAULT 0"))
        if "notify_folder_shared" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN notify_folder_shared BOOLEAN NOT NULL DEFAULT 1"))


# These one-off ALTERs evolve a pre-existing *SQLite* file in place. A fresh database
# (including the PostgreSQL target) gets the complete schema from create_all / Alembic,
# so they only run on SQLite.
if IS_SQLITE:
    _migrate_section_title()
    _migrate_folder_user_id()
    _migrate_soft_delete()
    _migrate_user_profile()
    _migrate_user_preferences()
    _migrate_org_fields()

app = FastAPI(title="Note Tracker API")

# CRUCIAL: Set up CORS to allow Vite frontend to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # configurable via the CORS_ORIGINS env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reads the `Authorization: Bearer <token>` header. auto_error=False so a missing header
# yields None (a clean 401 below) instead of FastAPI's default 403.
bearer_scheme = HTTPBearer(auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Resolve the JWT in the Authorization header to a User, or raise 401."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_id = auth.decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


# --- OWNERSHIP HELPERS ---
# Every lookup is scoped through folders.user_id so one account can never read or mutate
# another's data. A miss raises 404 (not 403) so the API doesn't reveal that an id exists.

def _owned_folder(folder_id: int, user: models.User, db: Session) -> models.Folder:
    folder = (
        db.query(models.Folder)
        .filter(models.Folder.id == folder_id, models.Folder.user_id == user.id)
        .first()
    )
    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    return folder


def _owned_note(note_id: int, user: models.User, db: Session) -> models.Note:
    note = (
        db.query(models.Note)
        .join(models.Folder, models.Note.folder_id == models.Folder.id)
        .filter(models.Note.id == note_id, models.Folder.user_id == user.id)
        .first()
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


def _owned_section(section_id: int, user: models.User, db: Session) -> models.Section:
    section = (
        db.query(models.Section)
        .join(models.Note, models.Section.note_id == models.Note.id)
        .join(models.Folder, models.Note.folder_id == models.Folder.id)
        .filter(models.Section.id == section_id, models.Folder.user_id == user.id)
        .first()
    )
    if section is None:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


# --- SHARED-ACCESS HELPERS ---
# Recipients of an ACCEPTED share gain READ access to the shared folder/notes/sections. These
# helpers grant that access for GET routes only; every mutation route keeps using the _owned_*
# helpers above, so a recipient can never modify another user's data (they get a clean 404).

def _readable_folder(folder_id: int, user: models.User, db: Session):
    """Resolve a folder the user may READ: their own live folder, or a folder shared with them
    via an accepted share. Returns (folder, allowed_note_ids, read_only) where allowed_note_ids
    is None for "all live notes" (owner or full-folder share) or a set for a partial share."""
    folder = db.get(models.Folder, folder_id)
    if folder is None or folder.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.user_id == user.id:
        return folder, None, False
    share = (
        db.query(models.Share)
        .filter(
            models.Share.folder_id == folder_id,
            models.Share.recipient_id == user.id,
            models.Share.status == "ACCEPTED",
        )
        .first()
    )
    if share is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    allowed = None if share.full_folder else {sn.note_id for sn in share.notes}
    return folder, allowed, True


def _readable_note(note_id: int, user: models.User, db: Session):
    """Resolve a note the user may READ: their own, or a note covered by an accepted share
    (a full-folder share of its folder, or an explicit note in a partial share). Returns
    (note, read_only)."""
    note = db.get(models.Note, note_id)
    if note is None or note.deleted_at is not None or (note.folder is not None and note.folder.deleted_at is not None):
        raise HTTPException(status_code=404, detail="Note not found")
    if note.folder is not None and note.folder.user_id == user.id:
        return note, False
    # Covered by a full-folder share of this note's folder?
    full = (
        db.query(models.Share)
        .filter(
            models.Share.folder_id == note.folder_id,
            models.Share.recipient_id == user.id,
            models.Share.status == "ACCEPTED",
            models.Share.full_folder.is_(True),
        )
        .first()
    )
    if full is not None:
        return note, True
    # Named individually in a partial share?
    link = (
        db.query(models.ShareNote)
        .join(models.Share, models.ShareNote.share_id == models.Share.id)
        .filter(
            models.ShareNote.note_id == note_id,
            models.Share.recipient_id == user.id,
            models.Share.status == "ACCEPTED",
        )
        .first()
    )
    if link is not None:
        return note, True
    raise HTTPException(status_code=404, detail="Note not found")


# --- SOFT-DELETE / TRASH HELPERS ---
# Trashed rows keep a deleted_at timestamp and are retained for this many days before the
# on-open purge hard-deletes them. Stored as naive UTC so SQLite string comparisons sort
# correctly against the cutoff.
TRASH_RETENTION_DAYS = 7


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _folder_out(
    folder: models.Folder,
    read_only: bool = False,
    allowed_note_ids: Optional[set] = None,
) -> schemas.FolderResponse:
    """Serialize a folder exposing only its LIVE notes. Builds fresh pydantic objects
    instead of mutating folder.notes — that collection has delete-orphan cascade, so
    reassigning it would hard-delete the filtered-out notes on the next flush.

    For a shared (read-only) folder, `allowed_note_ids` restricts the notes to the shared
    subset (None = all live notes, e.g. a full-folder share) and `read_only` is stamped on
    the folder and each note so the frontend renders a read-only view."""
    live_notes = [n for n in folder.notes if n.deleted_at is None]
    if allowed_note_ids is not None:
        live_notes = [n for n in live_notes if n.id in allowed_note_ids]
    # Newest activity = the folder's own updated_at vs. its live notes' updated_at. Powers
    # the dashboard "Recent" filter ("folders worked with in the last N days").
    stamps = [t for t in ([folder.updated_at] + [n.updated_at for n in live_notes]) if t is not None]
    last_activity = max(stamps) if stamps else None
    note_models = []
    for n in live_notes:
        nm = schemas.NoteResponse.model_validate(n)
        nm.read_only = read_only
        note_models.append(nm)
    return schemas.FolderResponse(
        id=folder.id, name=folder.name, purpose=folder.purpose, color=folder.color,
        user_id=folder.user_id,
        pinned=bool(folder.pinned), archived=bool(folder.archived),
        last_activity=last_activity,
        read_only=read_only,
        notes=note_models,
    )


def _purge_expired_trash(db: Session, user: models.User) -> None:
    """Hard-delete this user's folders/notes that have sat in Trash past the retention
    window. ORM cascades drop child notes/sections. Called whenever Trash is opened."""
    cutoff = _utcnow() - timedelta(days=TRASH_RETENTION_DAYS)
    stale_folders = (
        db.query(models.Folder)
        .filter(models.Folder.user_id == user.id,
                models.Folder.deleted_at.isnot(None),
                models.Folder.deleted_at <= cutoff)
        .all()
    )
    for f in stale_folders:
        db.delete(f)
    stale_notes = (
        db.query(models.Note)
        .join(models.Folder, models.Note.folder_id == models.Folder.id)
        .filter(models.Folder.user_id == user.id,
                models.Note.deleted_at.isnot(None),
                models.Note.deleted_at <= cutoff)
        .all()
    )
    for n in stale_notes:
        db.delete(n)
    if stale_folders or stale_notes:
        db.commit()


# --- AUTH ROUTES ---

@app.post("/api/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    # Normalize so uniqueness isn't bypassed by case/whitespace variations.
    email = payload.email.strip().lower()
    nickname = payload.nickname.strip()

    if not nickname:
        raise HTTPException(status_code=400, detail="Nickname cannot be empty.")

    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="That email is already registered.")
    # Case-insensitive so "Hixie" and "hixie" can't both exist — nicknames are the login
    # identifier now, and near-duplicates would be confusing and ambiguous.
    if db.query(models.User).filter(func.lower(models.User.nickname) == nickname.lower()).first():
        raise HTTPException(status_code=400, detail="That nickname is already taken.")

    user = models.User(
        nickname=nickname,
        email=email,
        hashed_password=auth.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=user)


@app.post("/api/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    nickname = payload.nickname.strip()
    # Match case-insensitively so the login is forgiving about capitalization, while
    # registration guarantees only one user can own any given nickname (case-insensitively).
    user = db.query(models.User).filter(func.lower(models.User.nickname) == nickname.lower()).first()
    # Same message whether the nickname is unknown or the password is wrong, so the endpoint
    # doesn't reveal which nicknames are registered.
    if user is None or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect nickname or password.")

    expires = (
        auth.REMEMBER_ME_EXPIRE_MINUTES
        if payload.remember
        else auth.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    token = auth.create_access_token(user.id, expires_minutes=expires)
    return schemas.TokenResponse(access_token=token, user=user)


# --- PROFILE ROUTES ---

# Cap the avatar payload so a pathological data URL can't bloat the row / response.
# Mirrors the 2 MB source-file limit the frontend enforces, with headroom for base64.
_MAX_AVATAR_CHARS = 3 * 1024 * 1024


@app.get("/api/profile", response_model=schemas.ProfileResponse)
def get_profile(user: models.User = Depends(get_current_user)):
    return user


@app.put("/api/profile", response_model=schemas.ProfileResponse)
def update_profile(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)

    # Email doubles as a login-unique field, so changing it needs the same guard as register.
    if data.get("email"):
        new_email = data["email"].strip().lower()
        if new_email != user.email:
            clash = (
                db.query(models.User)
                .filter(models.User.email == new_email, models.User.id != user.id)
                .first()
            )
            if clash:
                raise HTTPException(status_code=400, detail="That email is already registered.")
            user.email = new_email

    if data.get("avatar") and len(data["avatar"]) > _MAX_AVATAR_CHARS:
        raise HTTPException(status_code=400, detail="That image is too large.")

    # Only "grid" / "list" are valid dashboard defaults; ignore anything else rather than
    # persisting a value the frontend can't interpret.
    if data.get("default_view") not in (None, "grid", "list"):
        data.pop("default_view")

    for field in (
        "first_name", "last_name", "gender", "avatar",
        "default_view", "notify_weekly_summary", "notify_folder_shared",
    ):
        if field in data and data[field] is not None:
            setattr(user, field, data[field])

    db.commit()
    db.refresh(user)
    return user


@app.put("/api/profile/password", status_code=200)
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Re-verify the current password, then store the new one. 400 (not 401) on a wrong
    current password so the client stays authenticated and can surface a field error."""
    if not auth.verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Your current password is incorrect.")
    if auth.verify_password(payload.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Your new password must be different from the current one.")
    user.hashed_password = auth.hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


def _note_storage(note: models.Note) -> int:
    """Rough on-disk footprint of a single note: the length of all its section text."""
    return sum(len(s.content or "") + len(s.title or "") for s in note.sections)


@app.get("/api/profile/stats", response_model=schemas.ProfileStats)
def get_profile_stats(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Read-only account metadata + a folder→note directory for the profile overview.
    Counts only LIVE (non-trashed) folders/notes so the numbers match the dashboard."""
    folders = (
        db.query(models.Folder)
        .filter(models.Folder.user_id == user.id, models.Folder.deleted_at.is_(None))
        .all()
    )
    # The avatar data-URL counts toward the footprint so the number moves on upload.
    storage_bytes = len(user.avatar or "")
    total_notes = 0
    total_sections = 0
    folder_stats: List[schemas.FolderStat] = []
    for f in folders:
        live_notes = [n for n in f.notes if n.deleted_at is None]
        note_stats: List[schemas.NoteStat] = []
        folder_bytes = 0
        for n in live_notes:
            n_bytes = _note_storage(n)
            folder_bytes += n_bytes
            total_sections += len(n.sections)
            note_stats.append(schemas.NoteStat(
                id=n.id, title=n.title or "Untitled", created_at=n.created_at, storage_bytes=n_bytes,
            ))
        # Newest note first, so the expanded list reads most-recent-down.
        note_stats.sort(key=lambda ns: (ns.created_at or datetime.min), reverse=True)
        total_notes += len(live_notes)
        storage_bytes += folder_bytes
        folder_stats.append(schemas.FolderStat(
            id=f.id, name=f.name, created_at=f.created_at,
            note_count=len(live_notes), storage_bytes=folder_bytes, notes=note_stats,
        ))
    # Newest folder first.
    folder_stats.sort(key=lambda fs: (fs.created_at or datetime.min), reverse=True)
    return schemas.ProfileStats(
        created_at=user.created_at,
        total_folders=len(folders),
        total_notes=total_notes,
        total_sections=total_sections,
        storage_bytes=storage_bytes,
        folders=folder_stats,
    )


# --- FOLDER ROUTES ---

@app.post("/folders/", response_model=schemas.FolderResponse)
def create_folder(
    folder: schemas.FolderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db_folder = models.Folder(
        name=folder.name, purpose=folder.purpose, color=folder.color, user_id=user.id
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return _folder_out(db_folder)


@app.get("/folders/", response_model=List[schemas.FolderResponse])
def get_folders(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    folders = (
        db.query(models.Folder)
        .filter(models.Folder.user_id == user.id, models.Folder.deleted_at.is_(None))
        .all()
    )
    return [_folder_out(f) for f in folders]


@app.get("/folders/{folder_id}", response_model=schemas.FolderResponse)
def get_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Own folder, or one shared with the user (read-only, limited to the shared notes).
    # A trashed folder isn't part of primary navigation — _readable_folder 404s it.
    folder, allowed, read_only = _readable_folder(folder_id, user, db)
    return _folder_out(folder, read_only=read_only, allowed_note_ids=allowed)


@app.put("/folders/{folder_id}", response_model=schemas.FolderResponse)
def update_folder(
    folder_id: int,
    folder_update: schemas.FolderUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db_folder = _owned_folder(folder_id, user, db)
    data = folder_update.model_dump(exclude_unset=True)
    for field in ("name", "purpose", "color", "pinned", "archived"):
        if field in data:
            setattr(db_folder, field, data[field])
    db.commit()
    db.refresh(db_folder)
    return _folder_out(db_folder)


@app.delete("/folders/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db_folder = _owned_folder(folder_id, user, db)
    # Soft delete: move the folder to Trash rather than dropping it (and its notes/sections)
    # immediately. The 7-day purge hard-deletes it later.
    if db_folder.deleted_at is None:
        db_folder.deleted_at = _utcnow()
        db.commit()
    return {"ok": True}


# --- NOTE ROUTES ---

@app.post("/folders/{folder_id}/notes/", response_model=schemas.NoteResponse)
def create_note(
    folder_id: int,
    note: schemas.NoteCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _owned_folder(folder_id, user, db)  # 404s if the folder isn't this user's
    db_note = models.Note(title=note.title, purpose=note.purpose, folder_id=folder_id)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.get("/notes/{note_id}", response_model=schemas.NoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Own note, or one shared with the user (read-only). _readable_note also hides notes that
    # are trashed themselves or sit inside a trashed folder.
    note, read_only = _readable_note(note_id, user, db)
    out = schemas.NoteResponse.model_validate(note)
    out.read_only = read_only
    return out


@app.put("/notes/{note_id}", response_model=schemas.NoteResponse)
def update_note(
    note_id: int,
    note_update: schemas.NoteUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db_note = _owned_note(note_id, user, db)
    data = note_update.model_dump(exclude_unset=True)
    for field in ("title", "purpose", "starred", "pinned"):
        if field in data:
            setattr(db_note, field, data[field])
    db.commit()
    db.refresh(db_note)
    return db_note


@app.delete("/notes/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db_note = _owned_note(note_id, user, db)
    # Soft delete: move the note to Trash. Its live parent folder will surface in /trash
    # as a container until the note is restored or purged.
    if db_note.deleted_at is None:
        db_note.deleted_at = _utcnow()
        db.commit()
    return {"ok": True}


# --- TRASH ROUTES ---

@app.get("/trash/", response_model=List[schemas.TrashFolder])
def get_trash(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Hierarchical Trash: one card per folder that holds trashed content. A trashed folder
    shows all its notes when opened; a live folder shows only its trashed notes. Opening
    Trash first purges anything past the retention window."""
    _purge_expired_trash(db, user)
    folders = db.query(models.Folder).filter(models.Folder.user_id == user.id).all()
    out: List[schemas.TrashFolder] = []
    for f in folders:
        if f.deleted_at is not None:
            out.append(schemas.TrashFolder(
                id=f.id, name=f.name, purpose=f.purpose, color=f.color,
                folder_deleted=True, trashed_count=len(f.notes), deleted_at=f.deleted_at,
            ))
        else:
            trashed = [n for n in f.notes if n.deleted_at is not None]
            if trashed:
                out.append(schemas.TrashFolder(
                    id=f.id, name=f.name, purpose=f.purpose, color=f.color,
                    folder_deleted=False, trashed_count=len(trashed), deleted_at=None,
                ))
    return out


@app.get("/trash/folders/{folder_id}", response_model=List[schemas.NoteResponse])
def get_trash_folder_notes(
    folder_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Notes revealed when opening a Trash card: all of them if the folder itself is
    trashed (Condition 2), otherwise only the soft-deleted ones (Condition 1)."""
    folder = _owned_folder(folder_id, user, db)
    notes = folder.notes if folder.deleted_at is not None else [n for n in folder.notes if n.deleted_at is not None]
    return [schemas.NoteResponse.model_validate(n) for n in notes]


@app.post("/folders/{folder_id}/restore", response_model=schemas.FolderResponse)
def restore_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    folder = _owned_folder(folder_id, user, db)
    folder.deleted_at = None
    db.commit()
    db.refresh(folder)
    return _folder_out(folder)


@app.post("/notes/{note_id}/restore")
def restore_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    note = _owned_note(note_id, user, db)
    note.deleted_at = None
    # If its folder was trashed too, bring the folder back so the note is reachable again.
    if note.folder is not None and note.folder.deleted_at is not None:
        note.folder.deleted_at = None
    db.commit()
    return {"ok": True}


@app.delete("/trash/folders/{folder_id}")
def purge_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Permanently delete a folder (and its notes/sections) from Trash, now."""
    folder = _owned_folder(folder_id, user, db)
    db.delete(folder)
    db.commit()
    return {"ok": True}


@app.delete("/trash/notes/{note_id}")
def purge_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Permanently delete a single note (and its sections) from Trash, now."""
    note = _owned_note(note_id, user, db)
    db.delete(note)
    db.commit()
    return {"ok": True}


# --- SHARING ROUTES ---
# A user shares a whole folder or a subset of its notes with another user by nickname. The
# recipient sees a PENDING notification and can Accept (→ read-only access under "Shared") or
# Decline. Access is read-only: recipients only reach the GET routes above.

@app.post("/api/shares", response_model=schemas.NotificationResponse, status_code=201)
def create_share(
    payload: schemas.ShareCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    folder = _owned_folder(payload.folder_id, user, db)  # 404s if not the sender's folder
    if folder.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Folder not found")

    nickname = payload.recipient_nickname.strip()
    recipient = (
        db.query(models.User)
        .filter(func.lower(models.User.nickname) == nickname.lower())
        .first()
    )
    if recipient is None:
        raise HTTPException(status_code=400, detail="No user with that nickname.")
    if recipient.id == user.id:
        raise HTTPException(status_code=400, detail="You can't share with yourself.")

    # Restrict a partial share to notes that actually live in this folder (and aren't trashed).
    full = payload.full_folder or not payload.note_ids
    note_ids: List[int] = []
    if not full:
        live_ids = {n.id for n in folder.notes if n.deleted_at is None}
        note_ids = [nid for nid in dict.fromkeys(payload.note_ids) if nid in live_ids]
        if not note_ids:
            raise HTTPException(status_code=400, detail="Select at least one note to share.")

    # Upsert: reuse any non-declined share for this (sender, recipient, folder) so re-sharing
    # updates the note set and re-notifies rather than piling up duplicate notifications.
    share = (
        db.query(models.Share)
        .filter(
            models.Share.sender_id == user.id,
            models.Share.recipient_id == recipient.id,
            models.Share.folder_id == folder.id,
            models.Share.status != "DECLINED",
        )
        .first()
    )
    if share is None:
        share = models.Share(sender_id=user.id, recipient_id=recipient.id, folder_id=folder.id)
        db.add(share)
    share.full_folder = full
    share.status = "PENDING"
    share.created_at = _utcnow()
    # Reset the note set to match this share.
    share.notes = [] if full else [models.ShareNote(note_id=nid) for nid in note_ids]
    db.commit()
    db.refresh(share)

    note_count = len([n for n in folder.notes if n.deleted_at is None]) if full else len(note_ids)
    return schemas.NotificationResponse(
        id=share.id, sender_nickname=user.nickname, folder_name=folder.name,
        folder_color=folder.color, full_folder=full, note_count=note_count,
        created_at=share.created_at,
    )


@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Pending shares awaiting this user's Accept/Decline, newest first."""
    shares = (
        db.query(models.Share)
        .filter(models.Share.recipient_id == user.id, models.Share.status == "PENDING")
        .all()
    )
    out: List[schemas.NotificationResponse] = []
    for s in shares:
        folder = s.folder
        # Skip shares whose folder was trashed/purged out from under the notification.
        if folder is None or folder.deleted_at is not None:
            continue
        live_ids = {n.id for n in folder.notes if n.deleted_at is None}
        note_count = len(live_ids) if s.full_folder else len([sn for sn in s.notes if sn.note_id in live_ids])
        out.append(schemas.NotificationResponse(
            id=s.id,
            sender_nickname=s.sender.nickname if s.sender else "Someone",
            folder_name=folder.name, folder_color=folder.color,
            full_folder=s.full_folder, note_count=note_count, created_at=s.created_at,
        ))
    out.sort(key=lambda n: (n.created_at or datetime.min), reverse=True)
    return out


@app.put("/api/shares/{share_id}/respond")
def respond_to_share(
    share_id: int,
    payload: schemas.ShareRespond,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """The recipient accepts or declines a pending share. Accept grants read-only access;
    decline hides it. 404 for anyone who isn't the recipient (don't reveal the share exists)."""
    share = (
        db.query(models.Share)
        .filter(models.Share.id == share_id, models.Share.recipient_id == user.id)
        .first()
    )
    if share is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    share.status = "ACCEPTED" if payload.action == "ACCEPT" else "DECLINED"
    db.commit()
    return {"ok": True, "status": share.status}


@app.get("/api/shared", response_model=List[schemas.SharedFolderResponse])
def get_shared_with_me(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Folders shared with the user and accepted — read-only, each limited to its shared
    (live) notes and tagged with who shared it. Backs the dashboard's 'Shared' filter."""
    shares = (
        db.query(models.Share)
        .filter(models.Share.recipient_id == user.id, models.Share.status == "ACCEPTED")
        .all()
    )
    out: List[schemas.SharedFolderResponse] = []
    for s in shares:
        folder = s.folder
        if folder is None or folder.deleted_at is not None:
            continue  # sender trashed/purged the folder — nothing to show
        allowed = None if s.full_folder else {sn.note_id for sn in s.notes}
        base = _folder_out(folder, read_only=True, allowed_note_ids=allowed)
        out.append(schemas.SharedFolderResponse(
            **base.model_dump(),
            share_id=s.id,
            shared_by=s.sender.nickname if s.sender else "Someone",
        ))
    out.sort(key=lambda f: (f.last_activity or datetime.min), reverse=True)
    return out


# --- SECTION ROUTES ---

@app.post("/notes/{note_id}/sections/", response_model=schemas.SectionResponse)
def create_section(
    note_id: int,
    section: schemas.SectionCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    note = _owned_note(note_id, user, db)  # 404s if the note isn't this user's
    db_section = models.Section(note_id=note_id, type=section.type, content=section.content, title=section.title)
    db.add(db_section)
    note.updated_at = _utcnow()  # editing a block counts as note activity (drives "Recent")
    db.commit()
    db.refresh(db_section)
    return db_section


@app.put("/sections/{section_id}", response_model=schemas.SectionResponse)
def update_section(
    section_id: int,
    section_update: schemas.SectionUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db_section = _owned_section(section_id, user, db)
    # Only touch fields the client actually sent, so a content-only save can't wipe the
    # title (and a title change — including removal via null — can't wipe the content).
    data = section_update.model_dump(exclude_unset=True)
    if "content" in data:
        db_section.content = data["content"]
    if "title" in data:
        db_section.title = data["title"]
    if db_section.note is not None:
        db_section.note.updated_at = _utcnow()  # block edit → note activity (drives "Recent")
    db.commit()
    db.refresh(db_section)
    return db_section


@app.delete("/sections/{section_id}")
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db_section = _owned_section(section_id, user, db)
    note = db_section.note
    db.delete(db_section)
    if note is not None:
        note.updated_at = _utcnow()  # removing a block → note activity (drives "Recent")
    db.commit()
    return {"ok": True}


@app.get("/notes/{note_id}/sections/", response_model=List[schemas.SectionResponse])
def get_sections_for_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _readable_note(note_id, user, db)  # 404s unless the user owns or was shared the note
    return db.query(models.Section).filter(models.Section.note_id == note_id).all()
