from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routers import auth, calendars, public
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.database import SessionLocal, create_tables
from app.models.calendar import AdminUser
from app.services.demo_data import seed_demo_data

settings = get_settings()

app = FastAPI(title='Advent Calendar API', version='1.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        'http://localhost:4174',
        'http://127.0.0.1:4174',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5175',
        'http://127.0.0.1:5175',
        'http://localhost:5176',
        'http://127.0.0.1:5176',
    ],
    allow_origin_regex=r'https?://(localhost|127\.0\.0\.1):(\d+)',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(calendars.router)
app.include_router(public.router)

create_tables()


def ensure_default_seed_data() -> None:
    with SessionLocal() as db:
        has_admin = db.scalar(select(AdminUser).where(AdminUser.email == settings.admin_email.lower()))
        if not has_admin:
            db.add(AdminUser(email=settings.admin_email.lower(), password_hash=hash_password(settings.admin_password)))
            db.flush()

        seed_demo_data(db)
        db.commit()


ensure_default_seed_data()


@app.on_event('startup')
def startup_event() -> None:
    create_tables()
    ensure_default_seed_data()


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}
