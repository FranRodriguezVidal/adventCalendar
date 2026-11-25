from __future__ import annotations

import os
import sys
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = PROJECT_ROOT / 'backend'
DEFAULT_DB_PATH = BACKEND_DIR / 'advent_calendar.db'
TEST_DB_PATH = BACKEND_DIR / 'test_advent_calendar.db'


def _default_database_url() -> str:
    is_test_run = 'PYTEST_CURRENT_TEST' in os.environ or 'pytest' in sys.modules or any('pytest' in arg for arg in sys.argv)
    if is_test_run:
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()
        return f'sqlite:///{TEST_DB_PATH.as_posix()}'
    return f'sqlite:///{DEFAULT_DB_PATH.as_posix()}'


def _resolve_database_url(value: str | None) -> str:
    is_test_run = 'PYTEST_CURRENT_TEST' in os.environ or 'pytest' in sys.modules or any('pytest' in arg for arg in sys.argv)
    if is_test_run:
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()
        return f'sqlite:///{TEST_DB_PATH.as_posix()}'
    if value is None or value == '':
        return _default_database_url()
    if value.startswith('sqlite:///'):
        relative_path = value.replace('sqlite:///', '', 1)
        if relative_path and not Path(relative_path).is_absolute():
            resolved_path = (BACKEND_DIR / relative_path).resolve()
            return f'sqlite:///{resolved_path.as_posix()}'
    if value.startswith('postgresql://') and '+psycopg' not in value:
        return value.replace('postgresql://', 'postgresql+psycopg://', 1)
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / '.env'),
        env_file_encoding='utf-8',
        extra='ignore',
    )

    app_name: str = 'Advent Calendar'
    secret_key: str = 'development-secret-key'
    admin_email: str = 'admin@adventcalendar.local'
    admin_password: str = 'admin123'
    database_url: str = Field(default_factory=_default_database_url)
    frontend_url: str = 'http://localhost:5173'
    backend_host: str = '0.0.0.0'
    backend_port: int = 8000
    allowed_hosts: str = 'localhost,127.0.0.1'
    session_cookie_name: str = 'advent_calendar_session'
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_from: str = ''

    @field_validator('database_url')
    @classmethod
    def normalize_database_url(cls, value: str | None) -> str:
        return _resolve_database_url(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()
