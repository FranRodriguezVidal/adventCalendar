from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.calendar import Calendar, CalendarDay, CalendarReminder, OpenEvent

router = APIRouter(prefix='/api/public', tags=['public'])


class ReminderEmailRequest(BaseModel):
    email: EmailStr


def _serialize_public_calendar(calendar: Calendar) -> dict:
    settings = {
        item.setting_key: item.setting_value
        for item in getattr(calendar, 'settings', [])
    }
    return {
        'id': calendar.id,
        'name': calendar.name,
        'slug': calendar.slug,
        'description': calendar.description,
        'theme': calendar.theme,
        'palette': calendar.palette or {},
        'duration_days': calendar.duration_days,
        'start_date': calendar.start_date.isoformat() if calendar.start_date else None,
        'end_date': calendar.end_date.isoformat() if calendar.end_date else None,
        'is_published': calendar.is_published,
        'calendar_background': settings.get('calendar_background', 'rojo_mate'),
        'calendar_background_image': settings.get('calendar_background_image', ''),
        'custom_layout': settings.get('custom_layout', ''),
        'mosaic_scale': float(settings.get('mosaic_scale', '1')) if str(settings.get('mosaic_scale', '1')).strip() else 1,
        'door_style': settings.get('door_style', 'red'),
        'door_image': settings.get('door_image', ''),
        'background_music': settings.get('background_music', 'none'),
        'background_music_url': settings.get('background_music_url', ''),
    }


def _serialize_public_day(day: CalendarDay, unlocked: bool) -> dict:
    payload = {
        'id': day.id,
        'calendar_id': day.calendar_id,
        'day_number': day.day_number,
        'title': day.title,
        'content_type': day.content_type,
        'media_path': day.media_path,
        'metadata': day.content_metadata or {},
        'is_unlocked_by_admin': day.is_unlocked_by_admin,
        'unlock_date': day.unlock_date.isoformat() if day.unlock_date else None,
    }
    if unlocked:
        payload['content'] = day.content
    else:
        payload['content'] = None
    return payload


def _is_day_unlocked(calendar: Calendar, day: CalendarDay, today: datetime) -> bool:
    if day.is_unlocked_by_admin:
        return True
    if day.unlock_date and day.unlock_date > today:
        return False
    if calendar.start_date is None:
        base_date = today.date()
    else:
        base_date = calendar.start_date.date()

    if day.day_number < 1 or day.day_number > calendar.duration_days:
        return False

    difference = (today.date() - base_date).days + 1
    if difference < day.day_number:
        return False
    return True


def _admin_has_preview_access(request: Request, calendar: Calendar) -> bool:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        return False
    return calendar.admin_id is not None and calendar.admin_id == int(admin_session)


def _is_public_without_code(calendar: Calendar) -> bool:
    settings = {
        item.setting_key: item.setting_value
        for item in getattr(calendar, 'settings', [])
    }
    access_mode = settings.get('calendar_access_mode')
    if access_mode == 'public_without_code':
        return True
    if access_mode == 'code_protected':
        return False
    return False


def _has_calendar_access(request: Request, slug: str, calendar: Calendar) -> bool:
    if _admin_has_preview_access(request, calendar):
        return True
    if calendar.is_demo and calendar.is_published:
        return True
    if _is_public_without_code(calendar):
        return True
    return request.cookies.get(f'calendar_{slug}') == slug


@router.get('/calendars/{slug}')
def public_calendar(slug: str, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = db.scalar(select(Calendar).where(Calendar.slug == slug))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')
    if not calendar.is_published and not _admin_has_preview_access(request, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Este calendario no está publicado')
    if not _has_calendar_access(request, slug, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='No tienes acceso a este calendario')
    return _serialize_public_calendar(calendar)


@router.get('/calendars/{slug}/days')
def public_calendar_days(slug: str, request: Request, db: Session = Depends(get_db)) -> list[dict]:
    calendar = db.scalar(select(Calendar).where(Calendar.slug == slug))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')
    if not calendar.is_published and not _admin_has_preview_access(request, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Este calendario no está publicado')
    if not _has_calendar_access(request, slug, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='No tienes acceso a este calendario')

    today = datetime.utcnow()
    result = []
    for day in sorted(calendar.days, key=lambda item: item.day_number):
        unlocked = _is_day_unlocked(calendar, day, today)
        result.append(_serialize_public_day(day, unlocked))
    return result


@router.post('/calendars/{slug}/reminders')
def save_calendar_reminder(slug: str, payload: ReminderEmailRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    calendar = db.scalar(select(Calendar).where(Calendar.slug == slug))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')
    if not calendar.is_published:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Este calendario no está publicado')

    normalized_email = payload.email.strip().lower()
    existing = db.scalar(select(CalendarReminder).where(CalendarReminder.calendar_id == calendar.id, CalendarReminder.email == normalized_email))
    if existing is None:
        db.add(CalendarReminder(calendar_id=calendar.id, email=normalized_email))
        db.commit()

    return {'message': 'Correo guardado para recordatorios'}


@router.get('/calendars/{slug}/days/{day_number}')
def public_day_detail(slug: str, day_number: int, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = db.scalar(select(Calendar).where(Calendar.slug == slug))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')
    if not calendar.is_published and not _admin_has_preview_access(request, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Este calendario no está publicado')
    if not _has_calendar_access(request, slug, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='No tienes acceso a este calendario')

    day = db.scalar(select(CalendarDay).where(CalendarDay.calendar_id == calendar.id, CalendarDay.day_number == day_number))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Día no encontrado')

    if not _is_day_unlocked(calendar, day, datetime.utcnow()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Este contenido aún no está disponible')

    return _serialize_public_day(day, True)


@router.post('/calendars/{slug}/days/{day_number}/open')
def open_day(slug: str, day_number: int, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = db.scalar(select(Calendar).where(Calendar.slug == slug))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')
    if not calendar.is_published and not _admin_has_preview_access(request, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Este calendario no está publicado')
    if not _has_calendar_access(request, slug, calendar):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='No tienes acceso a este calendario')

    day = db.scalar(select(CalendarDay).where(CalendarDay.calendar_id == calendar.id, CalendarDay.day_number == day_number))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Día no encontrado')

    if not _is_day_unlocked(calendar, day, datetime.utcnow()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Este día aún no puede abrirse')

    event = OpenEvent(
        calendar_id=calendar.id,
        calendar_day_id=day.id,
        access_session_id=request.cookies.get(f'calendar_{slug}', slug),
    )
    db.add(event)
    db.commit()
    return _serialize_public_day(day, True)
