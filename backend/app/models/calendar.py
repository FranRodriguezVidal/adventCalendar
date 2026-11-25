from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, relationship, mapped_column

from app.database.database import Base


class AdminUser(Base):
    __tablename__ = 'admin_users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default='ANONIMX', nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Calendar(Base):
    __tablename__ = 'calendars'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admin_id: Mapped[int | None] = mapped_column(ForeignKey('admin_users.id', ondelete='SET NULL'), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    theme: Mapped[str] = mapped_column(String(120), default='romantic', nullable=False)
    palette: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, default=31, nullable=False)
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    admin: Mapped['AdminUser | None'] = relationship()
    days: Mapped[list['CalendarDay']] = relationship(back_populates='calendar', cascade='all, delete-orphan')
    settings: Mapped[list['CalendarSetting']] = relationship(back_populates='calendar', cascade='all, delete-orphan')
    reminders: Mapped[list['CalendarReminder']] = relationship(back_populates='calendar', cascade='all, delete-orphan')
    open_events: Mapped[list['OpenEvent']] = relationship(back_populates='calendar', cascade='all, delete-orphan')


class CalendarReminder(Base):
    __tablename__ = 'calendar_reminders'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    calendar_id: Mapped[int] = mapped_column(ForeignKey('calendars.id', ondelete='CASCADE'), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    calendar: Mapped[Calendar] = relationship(back_populates='reminders')

    __table_args__ = (UniqueConstraint('calendar_id', 'email', name='uq_calendar_reminder_email'),)


class CalendarDay(Base):
    __tablename__ = 'calendar_days'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    calendar_id: Mapped[int] = mapped_column(ForeignKey('calendars.id', ondelete='CASCADE'), nullable=False, index=True)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(60), default='message', nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    content_metadata: Mapped[dict] = mapped_column('metadata', JSON, default=dict, nullable=False)
    is_unlocked_by_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unlock_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    calendar: Mapped[Calendar] = relationship(back_populates='days')

    __table_args__ = (UniqueConstraint('calendar_id', 'day_number', name='uq_calendar_day_number'),)


class CalendarSetting(Base):
    __tablename__ = 'calendar_settings'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    calendar_id: Mapped[int] = mapped_column(ForeignKey('calendars.id', ondelete='CASCADE'), nullable=False, index=True)
    setting_key: Mapped[str] = mapped_column(String(120), nullable=False)
    setting_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    calendar: Mapped[Calendar] = relationship(back_populates='settings')

    __table_args__ = (UniqueConstraint('calendar_id', 'setting_key', name='uq_calendar_setting_key'),)


class OpenEvent(Base):
    __tablename__ = 'open_events'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    calendar_id: Mapped[int] = mapped_column(ForeignKey('calendars.id', ondelete='CASCADE'), nullable=False, index=True)
    calendar_day_id: Mapped[int] = mapped_column(ForeignKey('calendar_days.id', ondelete='CASCADE'), nullable=False, index=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    access_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    calendar: Mapped[Calendar] = relationship(back_populates='open_events')
    day: Mapped[CalendarDay] = relationship()
