"""Centralised, environment-driven configuration.

All deployment-specific values are read from environment variables here (with safe
local-dev defaults) so nothing host-specific is hardcoded across the app. A local
`.env` file is loaded automatically for development; in production the real env vars
set on the server take precedence (load_dotenv never overrides an existing var).

Env vars:
  DATABASE_URL   SQLAlchemy URL. Production points this at managed PostgreSQL, e.g.
                 postgresql://user:pass@host:5432/dbname. Falls back to local SQLite.
  CORS_ORIGINS   Comma-separated list of allowed frontend origins.
  AUTH_SECRET_KEY  JWT signing secret (see app/auth.py).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load a local .env if present (python-dotenv walks up to the repo root). Existing process
# env vars win (override=False default), so this is a convenience locally and a no-op in
# containers/production where real env vars are set.
load_dotenv()

# The backend/ directory (this file is backend/app/config.py).
_BACKEND_DIR = Path(__file__).resolve().parent.parent

# Database — managed PostgreSQL in production via DATABASE_URL; zero-setup SQLite locally.
# The SQLite fallback is anchored to backend/ (not the current working directory) so the
# same file is used no matter where the process is launched from.
DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_BACKEND_DIR / 'note_tracker.db'}")

# Whether we're running on SQLite (drives SQLite-only engine args + legacy migrations).
IS_SQLITE: bool = DATABASE_URL.startswith("sqlite")

# Allowed CORS origins for the SPA frontend (comma-separated in the env var).
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
