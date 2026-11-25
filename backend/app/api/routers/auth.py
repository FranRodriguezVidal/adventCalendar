from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.database.database import get_db
from app.models.calendar import AdminUser, Calendar
from app.schemas.calendar import AdminLoginRequest, AdminRegisterRequest, CalendarPasswordRequest
from app.services.demo_data import create_default_demo_calendar_for_admin
from app.services.reminders import generate_feedback_code, send_account_created_email, send_feedback_email

router = APIRouter(prefix='/api/auth', tags=['auth'])
settings = get_settings()


@router.post('/admin/register')
def admin_register(payload: AdminRegisterRequest, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    normalized_email = payload.email.strip().lower()
    if normalized_email == settings.admin_email.lower():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='No puedes crear una cuenta con el correo del administrador principal.',
        )

    existing = db.scalar(select(AdminUser).where(AdminUser.email == normalized_email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Ya existe una cuenta de administrador con ese email',
        )

    admin = AdminUser(
        name=(payload.name or 'ANONIMX').strip()[:120] or 'ANONIMX',
        email=normalized_email,
        password_hash=hash_password(payload.password),
    )
    db.add(admin)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Ese correo ya está registrado en la base de datos.',
        ) from None
    db.refresh(admin)
    create_default_demo_calendar_for_admin(db, admin)
    notification_sent = send_account_created_email(normalized_email, payload.name)

    response.set_cookie(
        key='admin_session',
        value=str(admin.id),
        httponly=True,
        samesite='lax',
        secure=False,
    )
    if notification_sent:
        return {'message': 'Cuenta de administrador creada. Te hemos enviado un correo de confirmación.'}
    return {'message': 'Cuenta de administrador creada. Revisa tu correo para confirmar que ya está activa.'}


@router.post('/admin/login')
def admin_login(payload: AdminLoginRequest, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    normalized_email = payload.email.strip().lower()
    user = db.scalar(select(AdminUser).where(AdminUser.email == normalized_email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Credenciales inválidas')

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Credenciales inválidas')

    create_default_demo_calendar_for_admin(db, user)
    db.commit()

    response.set_cookie(
        key='admin_session',
        value=str(user.id),
        httponly=True,
        samesite='lax',
        secure=False,
    )
    return {'message': 'Autenticación exitosa'}


@router.get('/admin/me')
def admin_me(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Debe iniciar sesión como administrador')

    admin = db.get(AdminUser, int(admin_session))
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Administrador no encontrado')

    display_name = (admin.name or 'ANONIMX').strip() or 'ANONIMX'
    if display_name == 'Administrador':
        display_name = 'ANONIMX'
    return {'name': display_name, 'email': admin.email}


@router.post('/admin/verify-password')
def admin_verify_password(request: Request, payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, str]:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Debe iniciar sesión como administrador')

    admin = db.get(AdminUser, int(admin_session))
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Administrador no encontrado')

    current_password = (payload.get('current_password') or '').strip()
    if not verify_password(current_password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='La contraseña actual no es correcta')

    return {'message': 'Contraseña actual correcta'}


@router.post('/admin/change-password')
def admin_change_password(request: Request, payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, str]:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Debe iniciar sesión como administrador')

    admin = db.get(AdminUser, int(admin_session))
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Administrador no encontrado')

    current_password = (payload.get('current_password') or '').strip()
    if not verify_password(current_password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='La contraseña actual no es correcta')

    new_password = (payload.get('new_password') or '').strip()
    confirm_password = (payload.get('confirm_password') or '').strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='La contraseña nueva debe tener al menos 6 caracteres')
    if new_password != confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='La contraseña nueva y su confirmación no coinciden')

    admin.password_hash = hash_password(new_password)
    db.commit()
    return {'message': 'Contraseña actualizada'}


@router.post('/admin/change-email')
def admin_change_email(request: Request, payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, str]:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Debe iniciar sesión como administrador')

    admin = db.get(AdminUser, int(admin_session))
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Administrador no encontrado')

    new_email = (payload.get('email') or '').strip().lower()
    if not new_email or '@' not in new_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Introduce un correo válido')

    if new_email == settings.admin_email.lower():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='No puedes usar el correo del administrador principal')

    if db.scalar(select(AdminUser).where(AdminUser.email == new_email, AdminUser.id != admin.id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Ese correo ya está registrado')

    admin.email = new_email
    db.commit()
    return {'message': 'Correo actualizado'}


@router.post('/admin/logout')
def admin_logout(response: Response) -> dict[str, str]:
    response.delete_cookie('admin_session', httponly=True, samesite='lax')
    return {'message': 'Sesión cerrada'}


@router.post('/admin/feedback')
def admin_feedback(request: Request, payload: dict[str, str], db: Session = Depends(get_db)) -> dict[str, str]:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Debe iniciar sesión como administrador')

    admin = db.get(AdminUser, int(admin_session))
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Administrador no encontrado')

    feedback_type = (payload.get('type') or '').strip().lower()
    title = (payload.get('title') or '').strip()
    description = (payload.get('description') or '').strip()
    image_data = (payload.get('image_data') or '').strip()
    image_name = (payload.get('image_name') or '').strip()

    if feedback_type not in {'suggestion', 'report'}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Tipo de feedback no válido')
    if len(title) < 3 or len(title) > 120:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='El título debe tener entre 3 y 120 caracteres')
    if len(description) < 10 or len(description) > 4000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='La descripción debe tener entre 10 y 4000 caracteres')

    suspicious_markers = ['<script', 'javascript:', 'onerror=', 'DROP TABLE', 'SELECT * FROM', 'rm -rf', 'curl ', 'wget ', 'bash -c', 'powershell', 'eval(', 'exec(']
    normalized_text = f'{title}\n{description}\n{image_name or ""}'.lower()
    if any(marker.lower() in normalized_text for marker in suspicious_markers):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='El mensaje contiene contenido no permitido para evitar intentos de inyección o abuso.')

    tracking_code = generate_feedback_code()
    sent = send_feedback_email(
        feedback_type=feedback_type,
        title=title,
        description=description,
        tracking_code=tracking_code,
        image_name=image_name or None,
        image_data=image_data or None,
    )
    if not sent:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='No se pudo enviar el feedback. Inténtalo de nuevo más tarde.')

    return {'message': 'Feedback enviado correctamente', 'code': tracking_code}


@router.post('/calendar/access')
def calendar_access(payload: CalendarPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    calendars = db.scalars(select(Calendar).where(Calendar.is_published.is_(True))).all()
    if not calendars:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='No hay calendarios disponibles')

    for item in calendars:
        if verify_password(payload.password, item.password_hash):
            return {'slug': item.slug, 'message': 'Acceso autorizado'}

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Código incorrecto')


@router.post('/calendar/{slug}/login')
def calendar_login(slug: str, payload: CalendarPasswordRequest, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    calendar = db.scalar(select(Calendar).where(Calendar.slug == slug))
    if calendar is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Calendario no encontrado')

    if not verify_password(payload.password, calendar.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Contraseña incorrecta')

    response.set_cookie(
        key=f'calendar_{slug}',
        value=slug,
        httponly=True,
        samesite='lax',
        secure=False,
    )
    return {'message': 'Acceso autorizado'}


@router.post('/calendar/logout')
def calendar_logout(response: Response, request: Request) -> dict[str, str]:
    for cookie_name in request.cookies:
        if cookie_name.startswith('calendar_'):
            response.delete_cookie(cookie_name, httponly=True, samesite='lax')
    return {'message': 'Sesión del calendario cerrada'}


def ensure_admin_session(request: Request) -> None:
    admin_session = request.cookies.get('admin_session')
    if admin_session is None or not admin_session.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Debe iniciar sesión como administrador')


def ensure_calendar_access(request: Request, slug: str) -> None:
    if request.cookies.get(f'calendar_{slug}') != slug:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='No tienes acceso a este calendario')

