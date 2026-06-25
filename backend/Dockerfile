# Backend API image (FastAPI + SQLAlchemy). Debian slim so the psycopg2-binary /
# bcrypt wheels install cleanly with no build toolchain.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install deps first for layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Bring the schema up to date (Alembic owns the schema in prod), then serve. The app's
# create_all on import is a harmless no-op once the tables exist. Bind the platform's
# injected $PORT (Render et al.) when set, falling back to 8000 for local/compose runs.
CMD ["sh", "-c", "python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
