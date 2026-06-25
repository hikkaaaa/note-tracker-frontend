"""Password hashing (bcrypt) and JWT issuing for the auth system.

The JWT secret is read from the AUTH_SECRET_KEY env var, with a clearly-marked
dev fallback so local development works out of the box. Set a real secret in any
deployed environment.
"""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

# CHANGE ME in production — set the AUTH_SECRET_KEY env var to a long random value.
SECRET_KEY = os.environ.get("AUTH_SECRET_KEY", "dev-only-insecure-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days (default session)
# "Remember me" sessions get a long-lived token so the login survives browser
# restarts for a full month on that device (until an explicit logout).
REMEMBER_ME_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password with bcrypt and return the UTF-8 hash string."""
    # bcrypt operates on bytes and silently truncates input past 72 bytes; encode
    # explicitly so the stored hash is deterministic.
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except ValueError:
        # Malformed hash in the DB — treat as a failed match rather than crashing.
        return False


def create_access_token(
    subject: str | int,
    extra: dict | None = None,
    expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES,
) -> str:
    """Issue a signed JWT whose `sub` claim identifies the user (their id).

    `expires_minutes` lets callers extend the lifetime — e.g. the login route
    passes REMEMBER_ME_EXPIRE_MINUTES when "Remember me" is checked.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    """Verify a JWT and return the user id from its `sub` claim.

    Raises jwt.PyJWTError (or ValueError if `sub` isn't an int) on any problem —
    callers turn that into a 401.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return int(payload["sub"])
