from __future__ import annotations

import json
import random
import string
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routers.auth import ensure_admin_session
from app.core.security import hash_password
from app.database.database import get_db
from app.models.calendar import Calendar, CalendarDay, CalendarReminder, CalendarSetting, OpenEvent
from app.schemas.calendar import CalendarCreateRequest, CalendarDayCreateRequest, CalendarImportRequest
from app.services.reminders import mark_reminders_as_sent

router = APIRouter(prefix='/api', tags=['calendars'])


def generate_access_code() -> str:
    prefix = 'ADV'
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f'{prefix}-{suffix}'


def serialize_calendar(calendar: Calendar) -> dict:
    settings = {
        item.setting_key: item.setting_value
        for item in getattr(calendar, 'settings', [])
    }
    access_mode = settings.get('calendar_access_mode')
    if access_mode is None:
        access_mode = 'code_protected'
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
        'is_demo': calendar.is_demo,
        'password': settings.get('calendar_password', ''),
        'is_public_without_code': access_mode == 'public_without_code',
        'calendar_background': settings.get('calendar_background', 'rojo_mate'),
        'calendar_background_image': settings.get('calendar_background_image', ''),
        'custom_layout': settings.get('custom_layout', ''),
        'mosaic_scale': float(settings.get('mosaic_scale', '1')) if str(settings.get('mosaic_scale', '1')).strip() else 1,
        'door_style': settings.get('door_style', 'red'),
        'door_image': settings.get('door_image', ''),
        'background_music': settings.get('background_music', 'none'),
        'background_music_url': settings.get('background_music_url', ''),
        'created_at': calendar.created_at.isoformat(),
        'updated_at': calendar.updated_at.isoformat(),
    }


def serialize_day(day: CalendarDay) -> dict:
    return {
        'id': day.id,
        'calendar_id': day.calendar_id,
        'day_number': day.day_number,
        'title': day.title,
        'content_type': day.content_type,
        'content': day.content,
        'media_path': day.media_path,
        'position': day.position,
        'metadata': day.content_metadata or {},
        'is_unlocked_by_admin': day.is_unlocked_by_admin,
        'unlock_date': day.unlock_date.isoformat() if day.unlock_date else None,
    }


def get_current_admin_id(request: Request) -> int:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Debe iniciar sesión como administrador')
    return int(admin_session)


def get_admin_calendar_or_404(calendar_id: int, request: Request, db: Session) -> Calendar:
    admin_id = get_current_admin_id(request)
    calendar = db.scalar(select(Calendar).where(Calendar.id == calendar_id, Calendar.admin_id == admin_id))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')
    return calendar


@router.get('/calendars')
def list_calendars(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    admin_id = get_current_admin_id(request)
    calendars = db.scalars(select(Calendar).where(Calendar.admin_id == admin_id).order_by(Calendar.created_at.desc())).all()
    return [serialize_calendar(calendar) for calendar in calendars]


@router.post('/calendars', status_code=status.HTTP_201_CREATED)
def create_calendar(payload: CalendarCreateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    admin_id = get_current_admin_id(request)
    existing = db.scalar(select(Calendar).where(Calendar.slug == payload.slug))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='El slug ya existe')

    if payload.start_date and payload.end_date and payload.end_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='La fecha final debe ser posterior a la inicial')

    access_code = payload.password or generate_access_code()
    calendar = Calendar(
        admin_id=admin_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        password_hash=hash_password(access_code),
        theme=payload.theme,
        palette=payload.palette or {'primary': '#a4253a', 'secondary': '#f8d7d7', 'accent': '#d4af37'},
        duration_days=payload.duration_days,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_published=payload.is_published,
        is_demo=payload.is_demo,
    )
    db.add(calendar)
    db.commit()
    db.refresh(calendar)

    public_without_code = bool(payload.is_public_without_code)
    for key, value in (
        ('calendar_password', access_code or ''),
        ('calendar_access_mode', 'public_without_code' if public_without_code else 'code_protected'),
        ('calendar_background', payload.calendar_background),
        ('calendar_background_image', payload.calendar_background_image),
        ('custom_layout', payload.custom_layout),
        ('mosaic_scale', str(payload.mosaic_scale) if payload.mosaic_scale is not None else None),
        ('door_style', payload.door_style),
        ('door_image', payload.door_image),
        ('background_music', payload.background_music),
        ('background_music_url', payload.background_music_url),
    ):
        if value is not None:
            db.add(CalendarSetting(calendar_id=calendar.id, setting_key=key, setting_value=value))

    db.commit()
    db.refresh(calendar)
    return serialize_calendar(calendar)


@router.get('/calendars/{calendar_id}')
def get_calendar(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> dict:
    admin_id = get_current_admin_id(request)
    calendar = db.scalar(select(Calendar).where(Calendar.id == calendar_id, Calendar.admin_id == admin_id))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')
    return serialize_calendar(calendar)


@router.put('/calendars/{calendar_id}')
def update_calendar(calendar_id: int, payload: CalendarCreateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    if payload.slug and payload.slug != calendar.slug:
        existing = db.scalar(select(Calendar).where(Calendar.slug == payload.slug))
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='El slug ya existe')
        calendar.slug = payload.slug

    existing_password = db.scalar(
        select(CalendarSetting.setting_value).where(CalendarSetting.calendar_id == calendar_id, CalendarSetting.setting_key == 'calendar_password')
    )
    existing_access_mode = db.scalar(
        select(CalendarSetting.setting_value).where(CalendarSetting.calendar_id == calendar_id, CalendarSetting.setting_key == 'calendar_access_mode')
    )
    is_public_without_code = bool(payload.is_public_without_code)
    access_code = payload.password if payload.password and payload.password.strip() else (existing_password or generate_access_code())
    if is_public_without_code:
        access_code = ''
    calendar.name = payload.name
    calendar.description = payload.description
    calendar.theme = payload.theme
    calendar.palette = payload.palette or calendar.palette or {'primary': '#a4253a', 'secondary': '#f8d7d7', 'accent': '#d4af37'}
    calendar.duration_days = payload.duration_days
    calendar.start_date = payload.start_date
    calendar.end_date = payload.end_date
    calendar.is_published = payload.is_published
    calendar.is_demo = payload.is_demo
    calendar.password_hash = hash_password(access_code)

    for key, value in (
        ('calendar_password', access_code),
        ('calendar_access_mode', 'public_without_code' if is_public_without_code else 'code_protected'),
        ('calendar_background', payload.calendar_background),
        ('calendar_background_image', payload.calendar_background_image),
        ('custom_layout', payload.custom_layout),
        ('mosaic_scale', str(payload.mosaic_scale) if payload.mosaic_scale is not None else None),
        ('door_style', payload.door_style),
        ('door_image', payload.door_image),
        ('background_music', payload.background_music),
        ('background_music_url', payload.background_music_url),
    ):
        if value is None:
            continue
        setting = db.scalar(select(CalendarSetting).where(CalendarSetting.calendar_id == calendar_id, CalendarSetting.setting_key == key))
        if setting is None:
            db.add(CalendarSetting(calendar_id=calendar_id, setting_key=key, setting_value=value))
        else:
            setting.setting_value = value

    db.commit()
    db.refresh(calendar)
    return serialize_calendar(calendar)


@router.delete('/calendars/{calendar_id}')
def delete_calendar(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    db.delete(calendar)
    db.commit()
    return {'message': 'Calendario eliminado'}


@router.post('/calendars/{calendar_id}/duplicate')
def duplicate_calendar(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    slug = f'{calendar.slug}-copy'
    index = 1
    while db.scalar(select(Calendar).where(Calendar.slug == slug)) is not None:
        slug = f'{calendar.slug}-copy-{index}'
        index += 1

    duplicate = Calendar(
        admin_id=get_current_admin_id(request),
        name=f'{calendar.name} (copia)',
        slug=slug,
        description=calendar.description,
        password_hash=calendar.password_hash,
        theme=calendar.theme,
        palette=calendar.palette,
        duration_days=calendar.duration_days,
        start_date=calendar.start_date,
        end_date=calendar.end_date,
        is_published=calendar.is_published,
        is_demo=False,
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)

    for day in calendar.days:
        new_day = CalendarDay(
            calendar_id=duplicate.id,
            day_number=day.day_number,
            title=day.title,
            content_type=day.content_type,
            content=day.content,
            media_path=day.media_path,
            position=day.position,
            content_metadata=day.content_metadata,
            is_unlocked_by_admin=day.is_unlocked_by_admin,
            unlock_date=day.unlock_date,
        )
        db.add(new_day)

    db.commit()
    return serialize_calendar(duplicate)


@router.get('/calendars/{calendar_id}/reminders')
def list_calendar_reminders(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> list[dict]:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    reminders = db.scalars(select(CalendarReminder).where(CalendarReminder.calendar_id == calendar_id).order_by(CalendarReminder.created_at.desc())).all()
    return [
        {
            'id': reminder.id,
            'email': reminder.email,
            'created_at': reminder.created_at.isoformat(),
            'sent_at': reminder.sent_at.isoformat() if reminder.sent_at else None,
            'sent': reminder.sent_at is not None,
        }
        for reminder in reminders
    ]


@router.post('/calendars/{calendar_id}/reminders/send')
def send_calendar_reminders(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    reminders = db.scalars(
        select(CalendarReminder).where(CalendarReminder.calendar_id == calendar_id, CalendarReminder.sent_at.is_(None)).order_by(CalendarReminder.created_at.desc())
    ).all()

    sent_emails = mark_reminders_as_sent(reminders)
    db.commit()

    return {
        'message': f'{len(sent_emails)} recordatorios enviados',
        'count': len(sent_emails),
        'emails': sent_emails,
    }


@router.get('/calendars/{calendar_id}/days')
def list_calendar_days(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> list[dict]:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)
    return [serialize_day(day) for day in sorted(calendar.days, key=lambda item: item.day_number)]


@router.post('/calendars/{calendar_id}/days', status_code=status.HTTP_201_CREATED)
def create_calendar_day(
    calendar_id: int,
    payload: CalendarDayCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    existing = db.scalar(select(CalendarDay).where(CalendarDay.calendar_id == calendar_id, CalendarDay.day_number == payload.day_number))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Ese d?a ya existe')

    day = CalendarDay(
        calendar_id=calendar_id,
        day_number=payload.day_number,
        title=payload.title,
        content_type=payload.content_type,
        content=payload.content,
        media_path=payload.media_path,
        position=payload.day_number,
        content_metadata=payload.metadata,
        is_unlocked_by_admin=payload.is_unlocked_by_admin,
        unlock_date=payload.unlock_date,
    )
    db.add(day)
    db.commit()
    db.refresh(day)
    return serialize_day(day)


@router.put('/days/{day_id}')
def update_calendar_day(day_id: int, payload: CalendarDayCreateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    admin_id = get_current_admin_id(request)
    day = db.scalar(select(CalendarDay).join(Calendar, CalendarDay.calendar_id == Calendar.id).where(CalendarDay.id == day_id, Calendar.admin_id == admin_id))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Día no encontrado')

    day.day_number = payload.day_number
    day.title = payload.title
    day.content_type = payload.content_type
    day.content = payload.content
    day.media_path = payload.media_path
    day.content_metadata = payload.metadata
    day.is_unlocked_by_admin = payload.is_unlocked_by_admin
    day.unlock_date = payload.unlock_date
    db.commit(); db.refresh(day)
    return serialize_day(day)


@router.delete('/days/{day_id}')
def delete_calendar_day(day_id: int, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    admin_id = get_current_admin_id(request)
    day = db.scalar(select(CalendarDay).join(Calendar, CalendarDay.calendar_id == Calendar.id).where(CalendarDay.id == day_id, Calendar.admin_id == admin_id))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Día no encontrado')
    db.delete(day)
    db.commit()
    return {'message': 'Día eliminado'}


@router.post('/days/{day_id}/unlock')
def unlock_day(day_id: int, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    admin_id = get_current_admin_id(request)
    day = db.scalar(select(CalendarDay).join(Calendar, CalendarDay.calendar_id == Calendar.id).where(CalendarDay.id == day_id, Calendar.admin_id == admin_id))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Día no encontrado')
    day.is_unlocked_by_admin = True
    db.commit()
    return {'message': 'Día desbloqueado'}


@router.post('/days/{day_id}/lock')
def lock_day(day_id: int, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    admin_id = get_current_admin_id(request)
    day = db.scalar(select(CalendarDay).join(Calendar, CalendarDay.calendar_id == Calendar.id).where(CalendarDay.id == day_id, Calendar.admin_id == admin_id))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Día no encontrado')
    day.is_unlocked_by_admin = False
    db.commit()
    return {'message': 'Día bloqueado'}


@router.get('/calendars/{calendar_id}/stats')
def calendar_stats(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)
    total_days = len(calendar.days)
    opened_count = db.query(OpenEvent).filter(OpenEvent.calendar_id == calendar_id).count()
    return {
        'calendar_id': calendar_id,
        'total_days': total_days,
        'opened_count': opened_count,
        'published': calendar.is_published,
        'demo': calendar.is_demo,
    }


@router.get('/admin/activity')
def admin_activity(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    admin_id = get_current_admin_id(request)
    events = db.query(OpenEvent).join(Calendar, OpenEvent.calendar_id == Calendar.id).filter(Calendar.admin_id == admin_id).order_by(OpenEvent.opened_at.desc()).all()
    data = []
    for event in events:
        day = db.get(CalendarDay, event.calendar_day_id)
        calendar = db.get(Calendar, event.calendar_id)
        data.append({
            'id': event.id,
            'calendar_name': calendar.name if calendar else 'Desconocido',
            'day_number': day.day_number if day else 0,
            'opened_at': event.opened_at.isoformat(),
            'session_id': event.access_session_id,
        })
    return data


@router.get('/calendars/{calendar_id}/export')
def export_calendar(calendar_id: int, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    payload = {
        'calendar': serialize_calendar(calendar),
        'days': [serialize_day(day) for day in sorted(calendar.days, key=lambda item: item.day_number)],
        'settings': [{'id': s.id, 'calendar_id': s.calendar_id, 'setting_key': s.setting_key, 'setting_value': s.setting_value} for s in calendar.settings],
    }
    return payload


@router.post('/calendars/{calendar_id}/import')
def import_calendar(calendar_id: int, payload: CalendarImportRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    calendar = get_admin_calendar_or_404(calendar_id, request, db)

    data = payload.calendar
    calendar.name = data.get('name', calendar.name)
    calendar.slug = data.get('slug', calendar.slug)
    calendar.description = data.get('description', calendar.description)
    calendar.theme = data.get('theme', calendar.theme)
    calendar.palette = data.get('palette', calendar.palette)
    calendar.duration_days = data.get('duration_days', calendar.duration_days)
    calendar.is_published = data.get('is_published', calendar.is_published)

    for day_data in payload.days:
        day = db.scalar(select(CalendarDay).where(CalendarDay.id == day_data.get('id')))
        if day is None:
            new_day = CalendarDay(calendar_id=calendar.id, **{
                'day_number': day_data.get('day_number', 1),
                'title': day_data.get('title', 'Nuevo día'),
                'content_type': day_data.get('content_type', 'message'),
                'content': day_data.get('content'),
                'media_path': day_data.get('media_path'),
                'position': day_data.get('position', 1),
                'content_metadata': day_data.get('metadata', {}),
                'is_unlocked_by_admin': day_data.get('is_unlocked_by_admin', False),
                'unlock_date': day_data.get('unlock_date'),
            })
            db.add(new_day)
        else:
            day.title = day_data.get('title', day.title)
            day.content = day_data.get('content', day.content)
            day.content_metadata = day_data.get('metadata', day.content_metadata)

    for item in payload.settings:
        setting = db.scalar(select(CalendarSetting).where(CalendarSetting.calendar_id == calendar_id, CalendarSetting.setting_key == item.get('setting_key')))
        if setting is None:
            db.add(CalendarSetting(calendar_id=calendar_id, setting_key=item.get('setting_key'), setting_value=item.get('setting_value')))
        else:
            setting.setting_value = item.get('setting_value')

    db.commit()
    return {'message': 'Importación completada'}
