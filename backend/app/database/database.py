from __future__ import annotations

from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url, connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_reminder_schema_compatibility() -> None:
    if not settings.database_url.startswith('sqlite'):
        return

    with engine.begin() as connection:
        result = connection.exec_driver_sql("PRAGMA table_info(calendar_reminders)").fetchall()
        columns = {row[1] for row in result}
        if 'sent_at' not in columns:
            connection.exec_driver_sql('ALTER TABLE calendar_reminders ADD COLUMN sent_at DATETIME NULL')


def ensure_calendar_admin_id_compatibility() -> None:
    if settings.database_url.startswith('sqlite'):
        with engine.begin() as connection:
            result = connection.exec_driver_sql("PRAGMA table_info(calendars)").fetchall()
            columns = {row[1] for row in result}
            if 'admin_id' not in columns:
                connection.exec_driver_sql('ALTER TABLE calendars ADD COLUMN admin_id INTEGER NULL')
                connection.exec_driver_sql('CREATE INDEX IF NOT EXISTS ix_calendars_admin_id ON calendars (admin_id)')
        return

    with engine.begin() as connection:
        result = connection.execute(
            text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'calendars' AND column_name = 'admin_id'"
            )
        ).fetchone()
        if result is None:
            connection.execute(text('ALTER TABLE calendars ADD COLUMN admin_id INTEGER NULL'))
            connection.execute(text('CREATE INDEX IF NOT EXISTS ix_calendars_admin_id ON calendars (admin_id)'))


def ensure_admin_user_schema_compatibility() -> None:
    if settings.database_url.startswith('sqlite'):
        with engine.begin() as connection:
            result = connection.exec_driver_sql("PRAGMA table_info(admin_users)").fetchall()
            columns = {row[1] for row in result}
            if 'name' not in columns:
                connection.exec_driver_sql("ALTER TABLE admin_users ADD COLUMN name VARCHAR(120) DEFAULT 'ANONIMX' NOT NULL")
            if 'created_at' not in columns:
                connection.exec_driver_sql("ALTER TABLE admin_users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL")
        return

    with engine.begin() as connection:
        columns = connection.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_users'")
        ).fetchall()
        existing_columns = {row[0] for row in columns}

        if 'name' not in existing_columns:
            connection.execute(text("ALTER TABLE admin_users ADD COLUMN name VARCHAR(120) DEFAULT 'ANONIMX' NOT NULL"))
        if 'created_at' not in existing_columns:
            connection.execute(text("ALTER TABLE admin_users ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL"))


def create_tables() -> None:
    from app.models import calendar  # noqa: F401

    Base.metadata.create_all(bind=engine)
    ensure_reminder_schema_compatibility()
    ensure_admin_user_schema_compatibility()
    ensure_calendar_admin_id_compatibility()
