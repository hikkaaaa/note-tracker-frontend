# NoteTracker

A full-stack note-taking app: organize notes into folders, build pages from modular
content blocks (text, checklists, tables, code, images, timers, calendars), and recover
deleted items from Trash. React frontend, FastAPI backend, PostgreSQL (SQLite for local
dev), fully containerized.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Python 3.12, FastAPI, SQLAlchemy
- **Database:** PostgreSQL (production), SQLite (local fallback)
- **Migrations:** Alembic
- **Infrastructure:** Docker Compose, Nginx

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the quick start
- [Node.js 20+](https://nodejs.org/) and [Python 3.12+](https://www.python.org/) — only if running without Docker

## Quick Start (Docker)

```bash
cd note-tracker
cp .env.example .env        # optional — defaults work out of the box
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (docs at http://localhost:8000/docs)

The backend runs database migrations automatically on startup. To stop: `docker compose down`
(add `-v` to also wipe the database volume).

## Running Without Docker

**Backend** (defaults to a local SQLite file — no database to install):

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload                      # http://localhost:8000
```

**Frontend** (in a second terminal):

```bash
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```

## Environment Variables

Configured in `.env` (see `.env.example`). All have safe defaults for local dev.

| Variable          | Description                                          | Default                  |
|-------------------|------------------------------------------------------|--------------------------|
| `DATABASE_URL`    | SQLAlchemy connection URL. Unset → local SQLite.     | built from `POSTGRES_*`  |
| `AUTH_SECRET_KEY` | JWT signing secret. **Set a random value in prod.**  | dev-only fallback        |
| `CORS_ORIGINS`    | Comma-separated allowed frontend origins.            | `http://localhost:5173`  |
| `VITE_API_BASE`   | Backend URL baked into the frontend build.           | `http://localhost:8000`  |

## Database Migrations

Schema changes are managed with Alembic — don't edit tables by hand.

```bash
# Apply migrations (also runs automatically when the backend container starts)
docker compose exec backend alembic upgrade head

# Create a new migration after editing backend/app/models.py
docker compose exec backend alembic revision --autogenerate -m "describe your change"
```

## Project Structure

```
.
├── docker-compose.yml      # postgres + backend + frontend
├── .env.example            # all environment variables
├── backend/
│   ├── app/                # FastAPI app: main.py, models.py, schemas.py, config.py, auth.py
│   ├── alembic/            # database migrations
│   └── scripts/            # backup scripts + cron/systemd templates
└── frontend/
    └── src/                # pages/, components/, lib/
```

## Deployment

1. Provision a managed PostgreSQL instance and set `DATABASE_URL` to its connection string.
2. Set a strong `AUTH_SECRET_KEY`, your domain(s) in `CORS_ORIGINS`, and `VITE_API_BASE`
   to the public API URL.
3. Deploy the containers; the backend applies migrations on startup.

Production backups (`pg_dump`) and their cron / systemd schedules are in `backend/scripts/`.
