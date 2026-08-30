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

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./resume_match.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
