"""SQLAlchemy engine + session factory.

The connection URL is resolved from the environment (see app/config.py): managed
PostgreSQL in production via DATABASE_URL, falling back to a local SQLite file for
zero-setup development. SQLite needs `check_same_thread=False` for FastAPI's threaded
request handling; PostgreSQL takes no such arg.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL, IS_SQLITE

# check_same_thread is a SQLite-only pragma; omit it for PostgreSQL and other backends.
connect_args = {"check_same_thread": False} if IS_SQLITE else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
