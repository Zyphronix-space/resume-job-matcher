"""
SQLite persistence for user-generated data: saved internships, tracked
applications, preferences, and analysis history.

SQLite (via SQLAlchemy) was chosen deliberately over Postgres/MongoDB: this
is a single-user local tool with no login system, so there's no need for a
separate database server — a single file (resume_match.db, created
automatically on first run) is enough, and it keeps the project easy to
run and explain. Uploaded resumes and job description text are still never
persisted anywhere (see resume_analyzer.py) — only computed results and
user-entered application data live here.

The path is overridable via the DATABASE_URL env var. This matters on
platforms like Azure App Service, where the app's own code directory is
extracted fresh into an ephemeral /tmp location on every restart — a
relative path there would silently lose all data on restart. Set
DATABASE_URL to a file under /home (Azure's persistent, network-mounted
storage) in that environment.
"""

import os
from datetime import datetime, timezone

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./resume_match.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def add_missing_columns() -> None:
    """
    Base.metadata.create_all() only creates tables that don't exist yet — it
    never alters a table that's already there. On the persistent /home
    database, a `users` table was created by an earlier deploy before columns
    like `role` existed on the model, so every later query against it fails
    with "no such column" instead of ever reaching create_all. This patches
    any column the current models declare but the live table is missing,
    as a nullable column with no default — enough to stop the crash without
    a full migration framework for what is still a single-file SQLite db.
    """
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue
            existing_columns = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def as_utc(dt: datetime) -> datetime:
    """
    SQLite drops tzinfo on round-trip: every DateTime column here is written
    as an aware UTC datetime (see db_models.py's _now()) but comes back
    naive after a read. Comparing that naive value against a fresh aware
    datetime.now(timezone.utc) raises TypeError rather than just misfiring,
    so every such comparison goes through this first.
    """
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
