import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database.database import SessionLocal
from app.main import app
from app.models.calendar import AdminUser, Calendar

client = TestClient(app)


def test_admin_login_and_calendar_can_be_created() -> None:
    response = client.post(
        '/api/auth/admin/login',
        json={'email': 'admin@adventcalendar.local', 'password': 'admin123'},
    )
    assert response.status_code == 200

    slug = f'calendario-prueba-{uuid.uuid4().hex[:8]}'
    created = client.post(
        '/api/calendars',
        json={
            'name': 'Calendario de prueba',
            'slug': slug,
            'description': 'Prueba de creación',
            'password': 'secret123',
            'theme': 'romantic',
            'palette': {'primary': '#111111'},
            'duration_days': 7,
            'is_published': True,
        },
    )
    assert created.status_code == 201
    assert created.json()['slug'] == slug


def test_calendar_access_code_redirects_to_calendar() -> None:
    client.post('/api/auth/admin/login', json={'email': 'admin@adventcalendar.local', 'password': 'admin123'})
    slug = f'calendario-codigo-{uuid.uuid4().hex[:8]}'
    password = 'acceso-unico-123'
    created = client.post(
        '/api/calendars',
        json={
            'name': 'Calendario código',
            'slug': slug,
            'description': 'Prueba de acceso por código',
            'password': password,
            'theme': 'romantic',
            'palette': {'primary': '#111111'},
            'duration_days': 8,
            'is_published': True,
        },
    )
    assert created.status_code == 201

    response = client.post('/api/auth/calendar/access', json={'password': password})
    assert response.status_code == 200
    assert response.json()['slug'] == slug


def test_fran_demo_admin_login_works() -> None:
    response = client.post('/api/auth/admin/login', json={'email': 'franrvguijo@gmail.com', 'password': 'fran12345'})
    assert response.status_code == 200
    assert response.json()['message'] == 'Autenticación exitosa'


def test_public_calendar_is_exposed() -> None:
    response = client.get('/api/public/calendars/luchi-demo')
    assert response.status_code == 200
    assert response.json()['name'] == 'Luchi'


def test_demo_calendar_days_are_public_without_cookie() -> None:
    response = client.get('/api/public/calendars/luchi-demo/days')
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert payload[0]['title']


def test_admin_calendars_are_isolated_per_account() -> None:
    client.post('/api/auth/admin/register', json={'name': 'Admin A', 'email': 'admin-a@example.com', 'password': 'abc12345'})
    client.post('/api/auth/admin/register', json={'name': 'Admin B', 'email': 'admin-b@example.com', 'password': 'xyz12345'})

    client.post('/api/auth/admin/login', json={'email': 'admin-a@example.com', 'password': 'abc12345'})
    created_for_a = client.post(
        '/api/calendars',
        json={
            'name': 'Calendario A',
            'slug': f'calendario-a-{uuid.uuid4().hex[:8]}',
            'description': 'Solo de A',
            'password': 'a-pass-123',
            'theme': 'romantic',
            'palette': {'primary': '#111111'},
            'duration_days': 7,
            'is_published': True,
        },
    )
    assert created_for_a.status_code == 201

    client.post('/api/auth/admin/login', json={'email': 'admin-b@example.com', 'password': 'xyz12345'})
    response_b = client.get('/api/calendars')
    assert response_b.status_code == 200
    items_b = response_b.json()
    demo_b = [item for item in items_b if item['slug'].startswith('demo-ejemplo-')]
    assert len(demo_b) == 1
    assert demo_b[0]['is_published'] is False
    assert demo_b[0]['duration_days'] == 7
    assert all('luchi-demo' not in item['slug'] for item in items_b)
    assert all('calendario-a-' not in item['slug'] for item in items_b)

    client.post('/api/auth/admin/login', json={'email': 'admin-a@example.com', 'password': 'abc12345'})
    response_a = client.get('/api/calendars')
    assert response_a.status_code == 200
    items_a = response_a.json()
    demo_a = [item for item in items_a if item['slug'].startswith('demo-ejemplo-')]
    assert len(demo_a) == 1
    assert any(item['name'] == 'Calendario A' for item in items_a)
    assert demo_a[0]['is_published'] is False
    assert demo_a[0]['duration_days'] == 7


def test_new_admin_receives_personal_example_calendar() -> None:
    email = f'admin-{uuid.uuid4().hex[:8]}@example.com'
    register = client.post('/api/auth/admin/register', json={'name': 'Admin C', 'email': email, 'password': 'secure-pass-123'})
    assert register.status_code == 200

    login = client.post('/api/auth/admin/login', json={'email': email, 'password': 'secure-pass-123'})
    assert login.status_code == 200

    response = client.get('/api/calendars')
    assert response.status_code == 200
    items = response.json()
    demo_items = [item for item in items if item['slug'].startswith('demo-ejemplo-')]
    assert len(demo_items) == 1
    assert demo_items[0]['is_published'] is False
    assert demo_items[0]['duration_days'] == 7
    assert all('luchi-demo' not in item['slug'] for item in items)


def test_existing_admin_gets_default_template_on_login_when_missing() -> None:
    email = f'admin-existing-{uuid.uuid4().hex[:8]}@example.com'
    register = client.post('/api/auth/admin/register', json={'name': 'Admin D', 'email': email, 'password': 'secure-pass-123'})
    assert register.status_code == 200

    client.post('/api/auth/admin/login', json={'email': email, 'password': 'secure-pass-123'})
    response = client.get('/api/calendars')
    assert response.status_code == 200
    items = response.json()
    demo_items = [item for item in items if item['slug'].startswith('demo-ejemplo-')]
    assert len(demo_items) == 1
    assert demo_items[0]['is_published'] is False
    assert demo_items[0]['duration_days'] == 7


def test_legacy_demo_template_row_is_normalized_for_admin() -> None:
    email = f'admin-legacy-{uuid.uuid4().hex[:8]}@example.com'
    register = client.post('/api/auth/admin/register', json={'name': 'Admin Legacy', 'email': email, 'password': 'secure-pass-123'})
    assert register.status_code == 200

    with SessionLocal() as db:
        admin = db.scalar(select(AdminUser).where(AdminUser.email == email))
        assert admin is not None
        db.add(Calendar(
            admin_id=admin.id,
            name='demo-ejemplo',
            slug='demo-ejemplo-legacy',
            description='Versión antigua',
            password_hash='legacy-hash',
            theme='romantic',
            palette={'primary': '#111111'},
            duration_days=3,
            is_published=False,
            is_demo=True,
        ))
        db.commit()

    login = client.post('/api/auth/admin/login', json={'email': email, 'password': 'secure-pass-123'})
    assert login.status_code == 200

    response = client.get('/api/calendars')
    assert response.status_code == 200
    items = response.json()
    demo_items = [item for item in items if item['slug'].startswith('demo-ejemplo-')]
    assert len(demo_items) == 1
    assert demo_items[0]['name'] == 'demo-ejemplo'
    assert demo_items[0]['duration_days'] == 7
    assert demo_items[0]['is_published'] is False


def test_admin_can_change_password_confirming_old_password() -> None:
    email = f'admin-password-{uuid.uuid4().hex[:8]}@example.com'
    client.post('/api/auth/admin/register', json={'name': 'Admin Password', 'email': email, 'password': 'old-pass-123'})

    login = client.post('/api/auth/admin/login', json={'email': email, 'password': 'old-pass-123'})
    assert login.status_code == 200

    response = client.post(
        '/api/auth/admin/change-password',
        json={'current_password': 'old-pass-123', 'new_password': 'new-pass-456', 'confirm_password': 'new-pass-456'},
    )
    assert response.status_code == 200
    assert response.json()['message'] == 'Contraseña actualizada'

    old_login = client.post('/api/auth/admin/login', json={'email': email, 'password': 'old-pass-123'})
    assert old_login.status_code == 401

    new_login = client.post('/api/auth/admin/login', json={'email': email, 'password': 'new-pass-456'})
    assert new_login.status_code == 200


def test_admin_can_change_email_after_password_confirmation() -> None:
    email = f'admin-email-{uuid.uuid4().hex[:8]}@example.com'
    new_email = f'admin-email-updated-{uuid.uuid4().hex[:8]}@example.com'
    client.post('/api/auth/admin/register', json={'name': 'Admin Email', 'email': email, 'password': 'secure-pass-123'})

    login = client.post('/api/auth/admin/login', json={'email': email, 'password': 'secure-pass-123'})
    assert login.status_code == 200

    response = client.post(
        '/api/auth/admin/change-email',
        json={'current_password': 'secure-pass-123', 'email': new_email, 'confirm_email': new_email},
    )
    assert response.status_code == 200
    assert response.json()['message'] == 'Correo actualizado'

    old_login = client.post('/api/auth/admin/login', json={'email': email, 'password': 'secure-pass-123'})
    assert old_login.status_code == 401

    new_login = client.post('/api/auth/admin/login', json={'email': new_email, 'password': 'secure-pass-123'})
    assert new_login.status_code == 200


def test_calendar_login_requires_password() -> None:
    response = client.post('/api/auth/calendar/luchi-demo/login', json={'password': 'wrong-pass'})
    assert response.status_code == 401
