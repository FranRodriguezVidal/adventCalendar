from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)


class AdminRegisterRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6)


class CalendarPasswordRequest(BaseModel):
    password: str = Field(..., min_length=4)


class CalendarReminderRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class CalendarCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=120)
    description: str | None = None
    password: str | None = None
    theme: str = 'romantic'
    palette: dict[str, Any] | None = None
    duration_days: int = Field(default=31, ge=7, le=31)
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_published: bool = False
    is_demo: bool = False


class CalendarDayCreateRequest(BaseModel):
    day_number: int = Field(..., ge=1, le=31)
    title: str = Field(..., min_length=1, max_length=255)
    content_type: str = 'message'
    content: str | None = None
    media_path: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_unlocked_by_admin: bool = False
    unlock_date: datetime | None = None


class CalendarDayUpdateRequest(CalendarDayCreateRequest):
    pass


class CalendarSettingCreateRequest(BaseModel):
    setting_key: str
    setting_value: str | None = None


class CalendarExport(BaseModel):
    calendar: dict[str, Any]
    days: list[dict[str, Any]] = Field(default_factory=list)
    settings: list[dict[str, Any]] = Field(default_factory=list)


class CalendarImportRequest(BaseModel):
    calendar: dict[str, Any]
    days: list[dict[str, Any]] = Field(default_factory=list)
    settings: list[dict[str, Any]] = Field(default_factory=list)
