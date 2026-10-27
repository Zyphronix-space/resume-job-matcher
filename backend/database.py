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

Local dev and tests use that SQLite file. Production (Vercel) sets
DATABASE_URL to a TiDB Cloud database instead: serverless functions have
no persistent disk, so a SQLite file there would vanish between requests.
"""

import os
from datetime import datetime, timezone

from sqlalchemy import String, create_engine, inspect, text
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./resume_match.db")
# TiDB Cloud speaks the MySQL protocol; its console hands out mysql:// URLs,
# but SQLAlchemy needs the driver named explicitly to use PyMySQL.
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = "mysql+pymysql://" + DATABASE_URL[len("mysql://"):]

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # TiDB Cloud requires TLS. Serverless instances freeze between requests,
    # so idle pooled connections may be dead on thaw: pre-ping + recycle,
    # and keep the pool small since every warm instance holds its own.
    import certifi

    engine = create_engine(
        DATABASE_URL,
        connect_args={"ssl": {"ca": certifi.where()}},
        pool_pre_ping=True,
        pool_recycle=240,
        pool_size=2,
        max_overflow=3,
    )


@compiles(String, "mysql")
def _mysql_varchar(type_, compiler, **kw):
    """MySQL/TiDB VARCHAR requires a length; the models declare bare String
    columns (fine on SQLite), so give those a default of 255."""
    if type_.length is None:
        type_ = String(255, collation=type_.collation)
    return compiler.visit_VARCHAR(type_, **kw)


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
                quote = engine.dialect.identifier_preparer.quote
                conn.execute(text(f"ALTER TABLE {quote(table.name)} ADD COLUMN {quote(column.name)} {col_type}"))


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
