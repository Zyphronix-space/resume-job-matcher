"""Startup schema creation must be safe when several serverless instances
cold-start at once against the same database."""

import os
import threading

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

from database import Base, engine, init_schema


def _tables():
    return set(inspect(engine).get_table_names())


def test_init_schema_is_idempotent():
    init_schema()
    init_schema()
    assert {t.name for t in Base.metadata.sorted_tables} <= _tables()


def test_init_schema_retries_when_another_instance_won_the_race(monkeypatch):
    """The losing instance sees "table already exists" from its CREATE; it
    must re-check and carry on, not crash the cold start."""
    real_create_all = Base.metadata.create_all
    calls = {"n": 0}

    def lose_once(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise OperationalError("CREATE TABLE job_sources", {}, Exception(1050, "Table 'job_sources' already exists"))
        return real_create_all(*args, **kwargs)

    monkeypatch.setattr(Base.metadata, "create_all", lose_once)
    init_schema()
    assert calls["n"] == 2


def test_init_schema_does_not_swallow_other_errors(monkeypatch):
    def broken(*args, **kwargs):
        raise OperationalError("CREATE TABLE x", {}, Exception(1142, "CREATE command denied"))

    monkeypatch.setattr(Base.metadata, "create_all", broken)
    with pytest.raises(OperationalError):
        init_schema()


def test_init_adds_missing_column_to_existing_table_without_touching_rows():
    """The upgrade production gets: users exists without token_version."""
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO users (email, password_hash, password_salt, role, is_admin) "
                          "VALUES ('kept@example.com', 'h', 's', 'candidate', 1)"))
        conn.execute(text("ALTER TABLE users DROP COLUMN token_version"))
    assert "token_version" not in {c["name"] for c in inspect(engine).get_columns("users")}
    init_schema()
    assert "token_version" in {c["name"] for c in inspect(engine).get_columns("users")}
    with engine.connect() as conn:
        row = conn.execute(text("SELECT email, is_admin, token_version FROM users")).one()
    assert (row[0], bool(row[1]), row[2]) == ("kept@example.com", True, None)


@pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"), reason="real concurrent DDL needs MySQL/TiDB")
def test_concurrent_cold_starts_on_an_empty_database():
    Base.metadata.drop_all(bind=engine)
    n = 6
    barrier = threading.Barrier(n)
    errors = []

    def cold_start():
        barrier.wait()
        try:
            init_schema()
        except Exception as exc:  # noqa: BLE001
            errors.append(repr(exc))

    threads = [threading.Thread(target=cold_start) for _ in range(n)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert errors == []
    assert {t.name for t in Base.metadata.sorted_tables} <= _tables()
