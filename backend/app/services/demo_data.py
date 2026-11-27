from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.calendar import AdminUser, Calendar, CalendarDay

settings = get_settings()


def ensure_known_admins(db: Session) -> None:
    known_admins = {
        settings.admin_email.lower(): settings.admin_password,
        'franrvguijo@gmail.com': 'fran12345',
    }

    for email, password in known_admins.items():
        normalized_email = email.strip().lower()
        admin = db.scalar(select(AdminUser).where(AdminUser.email == normalized_email))
        if admin is None:
            admin = AdminUser(email=normalized_email, password_hash=hash_password(password))
            try:
                db.add(admin)
                db.commit()
                db.refresh(admin)
            except IntegrityError:
                db.rollback()
                admin = db.scalar(select(AdminUser).where(AdminUser.email == normalized_email))
                if admin is None:
                    continue

        if admin.password_hash != hash_password(password):
            admin.password_hash = hash_password(password)
            db.commit()


def build_demo_calendars() -> list[dict]:
    today = datetime.utcnow()
    return [
        {
            'name': 'demo-ejemplo',
            'slug': 'demo-ejemplo-publica',
            'description': 'Calendario de ejemplo de acceso directo para probar la experiencia pública.',
            'password': 'demo123',
            'theme': 'winter',
            'palette': {'primary': '#3f51b5', 'secondary': '#dfe8ff', 'accent': '#f5bf4f', 'background': '#f9fbff'},
            'duration_days': 7,
            'start_date': today - timedelta(days=1),
            'end_date': today + timedelta(days=10),
            'is_published': True,
            'is_demo': True,
            'days': [
                {'day_number': 1, 'title': 'Bienvenida', 'content_type': 'message', 'content': 'Hoy empieza nuestro calendario público con un pequeño detalle para sonreír.', 'metadata': {'emoji': '✨'}},
                {'day_number': 2, 'title': 'Una pista', 'content_type': 'memory', 'content': 'Cada día trae un pequeño regalo para recordarte que eres importante.', 'metadata': {'emoji': '💫'}},
                {'day_number': 3, 'title': 'Un recuerdo', 'content_type': 'memory', 'content': 'A veces los mejores regalos son los momentos que compartes.', 'metadata': {'emoji': '📖'}},
                {'day_number': 4, 'title': 'Una canción', 'content_type': 'song', 'content': 'Pon una canción que te haga sentir en calma.', 'metadata': {'link': 'https://example.com/demo-song'}},
                {'day_number': 5, 'title': 'Un mensaje especial', 'content_type': 'message', 'content': 'Si ves esto, es porque el calendario ya está abierto para todo el mundo.', 'metadata': {'emoji': '💌'}},
                {'day_number': 6, 'title': 'Reto del día', 'content_type': 'challenge', 'content': 'Haz una pausa, mira a tu alrededor y sonríe por lo que tienes.', 'metadata': {'emoji': '🌿'}},
                {'day_number': 7, 'title': 'Cierre', 'content_type': 'message', 'content': 'Gracias por acompañarnos. Este es un calendario de prueba público.', 'metadata': {'emoji': '🎁'}},
            ],
        },
        {
            'name': 'Demo pública',
            'slug': 'demo-publica',
            'description': 'Alias legacy para la demo pública del calendario.',
            'password': 'demo123',
            'theme': 'winter',
            'palette': {'primary': '#3f51b5', 'secondary': '#dfe8ff', 'accent': '#f5bf4f', 'background': '#f9fbff'},
            'duration_days': 7,
            'start_date': today - timedelta(days=1),
            'end_date': today + timedelta(days=10),
            'is_published': True,
            'is_demo': True,
            'days': [
                {'day_number': 1, 'title': 'Bienvenida', 'content_type': 'message', 'content': 'Hoy empieza nuestro calendario público con un pequeño detalle para sonreír.', 'metadata': {'emoji': '✨'}},
                {'day_number': 2, 'title': 'Una pista', 'content_type': 'memory', 'content': 'Cada día trae un pequeño regalo para recordarte que eres importante.', 'metadata': {'emoji': '💫'}},
                {'day_number': 3, 'title': 'Un recuerdo', 'content_type': 'memory', 'content': 'A veces los mejores regalos son los momentos que compartes.', 'metadata': {'emoji': '📖'}},
                {'day_number': 4, 'title': 'Una canción', 'content_type': 'song', 'content': 'Pon una canción que te haga sentir en calma.', 'metadata': {'link': 'https://example.com/demo-song'}},
                {'day_number': 5, 'title': 'Un mensaje especial', 'content_type': 'message', 'content': 'Si ves esto, es porque el calendario ya está abierto para todo el mundo.', 'metadata': {'emoji': '💌'}},
                {'day_number': 6, 'title': 'Reto del día', 'content_type': 'challenge', 'content': 'Haz una pausa, mira a tu alrededor y sonríe por lo que tienes.', 'metadata': {'emoji': '🌿'}},
                {'day_number': 7, 'title': 'Cierre', 'content_type': 'message', 'content': 'Gracias por acompañarnos. Este es un calendario de prueba público.', 'metadata': {'emoji': '🎁'}},
            ],
        },
        {
            'name': 'Luchi',
            'slug': 'luchi-demo',
            'description': 'Un diciembre lleno de pequeños detalles',
            'password': 'luchi123',
            'theme': 'romantic',
            'palette': {'primary': '#7c1d2d', 'secondary': '#f4d9d9', 'accent': '#d4af37', 'background': '#fffaf7'},
            'duration_days': 31,
            'start_date': today - timedelta(days=5),
            'end_date': today + timedelta(days=30),
            'is_published': True,
            'is_demo': True,
            'days': [
                {'day_number': 1, 'title': 'Un pequeño comienzo', 'content_type': 'message', 'content': 'Quería preparar algo diferente. No hace falta una ocasión especial para dedicarle tiempo a alguien que merece pequeños detalles.', 'metadata': {'emoji': '✨'}},
                {'day_number': 2, 'title': 'Los pequeños momentos', 'content_type': 'memory', 'content': 'A veces los mejores recuerdos son los momentos más sencillos.', 'metadata': {'emoji': '💫'}},
                {'day_number': 3, 'title': 'Una canción para ti', 'content_type': 'song', 'content': 'Desafío: comparte una canción que te recuerde a una tarde especial.', 'metadata': {'link': 'https://example.com/song'}},
                {'day_number': 4, 'title': 'Una pequeña pregunta', 'content_type': 'question', 'content': '¿Qué momento te gustaría repetir?', 'metadata': {'emoji': '❓'}},
                {'day_number': 5, 'title': 'Una imagen especial', 'content_type': 'photo', 'content': 'Una instantánea cargada de emoción y cariño.', 'media_path': '/static/demo/photo-1.jpg', 'metadata': {'emoji': '📷'}},
                {'day_number': 6, 'title': 'Unas palabras', 'content_type': 'letter', 'content': 'Te quiero recordar que tu presencia hace que la vida se vuelva más luminosa.', 'metadata': {'emoji': '💌'}},
                {'day_number': 7, 'title': 'Un plan pendiente', 'content_type': 'voucher', 'content': 'Vale por una merienda y una conversación sin mirar el reloj.', 'metadata': {'emoji': '🎁'}},
                {'day_number': 8, 'title': 'Un momento para respirar', 'content_type': 'challenge', 'content': 'Haz una pausa y piensa en tres cosas que te hagan sonreír.', 'metadata': {'emoji': '🌿'}},
                {'day_number': 9, 'title': 'Tu canción favorita', 'content_type': 'song', 'content': 'Escucha algo que te haga sentir como en casa.', 'metadata': {'link': 'https://example.com/demo-song'}},
                {'day_number': 10, 'title': 'Una promesa', 'content_type': 'message', 'content': 'Hoy te prometo que vamos a guardar memoria de los buenos tiempos.', 'metadata': {'emoji': '🤍'}},
                {'day_number': 11, 'title': 'Recuento de luz', 'content_type': 'memory', 'content': 'La vida se vuelve más bonita cuando la compartes.', 'metadata': {'emoji': '🌟'}},
                {'day_number': 12, 'title': 'Un pequeño juego', 'content_type': 'game', 'content': 'Elige una palabra que describa mejor esta temporada y compártela.', 'metadata': {'emoji': '🎲'}},
                {'day_number': 13, 'title': 'Pequeño detalle', 'content_type': 'voucher', 'content': 'Vale por una mañana tranquila con café y buena compañía.', 'metadata': {'emoji': '☕'}},
                {'day_number': 14, 'title': 'Tu mejor recuerdo', 'content_type': 'question', 'content': '¿Qué momento sabes que te haría sonreír aunque pasen años?', 'metadata': {'emoji': '💭'}},
                {'day_number': 15, 'title': 'Misterio de diciembre', 'content_type': 'message', 'content': 'A veces el mejor regalo es escuchar con atención y mirar con cariño.', 'metadata': {'emoji': '🎄'}},
                {'day_number': 16, 'title': 'Un pequeño reto', 'content_type': 'challenge', 'content': 'Haz una foto bonita y mándasela a quien te hace bien.', 'metadata': {'emoji': '📸'}},
                {'day_number': 17, 'title': 'Pista secreta', 'content_type': 'message', 'content': 'La sorpresa más grande suele estar en los detalles más pequeños.', 'metadata': {'emoji': '🔑'}},
                {'day_number': 18, 'title': 'Un recuerdo compartido', 'content_type': 'memory', 'content': 'Hay momentos que se quedan pegados al corazón sin quererlo.', 'metadata': {'emoji': '📖'}},
                {'day_number': 19, 'title': 'Playlist de diciembre', 'content_type': 'song', 'content': 'Crea una lista con 5 canciones que te recuerden a una época especial.', 'metadata': {'emoji': '🎶'}},
                {'day_number': 20, 'title': 'Un top 3', 'content_type': 'question', 'content': '¿Qué tres cosas te hacen sentir en calma?', 'metadata': {'emoji': '💛'}},
                {'day_number': 21, 'title': 'Mirada nostálgica', 'content_type': 'photo', 'content': 'Un recuerdo fotográfico de una tarde que siempre querrás guardar.', 'media_path': '/static/demo/photo-2.jpg', 'metadata': {'emoji': '🖼️'}},
                {'day_number': 22, 'title': 'Lo que siento', 'content_type': 'letter', 'content': 'No siempre hace falta decir mucho. A veces basta con estar.', 'metadata': {'emoji': '💞'}},
                {'day_number': 23, 'title': 'Reto de la semana', 'content_type': 'challenge', 'content': 'Haz una cosa que te haga feliz y luego cuéntaselo a alguien.', 'metadata': {'emoji': '⚡'}},
                {'day_number': 24, 'title': 'Noche especial', 'content_type': 'message', 'content': 'Hoy deja que el tiempo se vuelva un poco más amable y más lento.', 'metadata': {'emoji': '🌙'}},
                {'day_number': 25, 'title': 'Un regalo invisible', 'content_type': 'voucher', 'content': 'Vale por una noche sin prisas, con buena música y compañía.', 'metadata': {'emoji': '🎁'}},
                {'day_number': 26, 'title': 'Reflexión feliz', 'content_type': 'question', 'content': '¿Qué parte de esta historia te hace sentir más viva?', 'metadata': {'emoji': '🌞'}},
                {'day_number': 27, 'title': 'Un hilo de recuerdos', 'content_type': 'memory', 'content': 'A veces un recuerdo pequeño vale más que una gran promesa.', 'metadata': {'emoji': '🧵'}},
                {'day_number': 28, 'title': 'Pista de sorpresas', 'content_type': 'game', 'content': 'Responde tres palabras que definan esta temporada para ti.', 'metadata': {'emoji': '🎯'}},
                {'day_number': 29, 'title': 'Una nota para ti', 'content_type': 'letter', 'content': 'Estoy orgullosa de lo bien que sabes hacer sentir bien a los demás.', 'metadata': {'emoji': '📝'}},
                {'day_number': 30, 'title': 'Aun quedan sorpresas', 'content_type': 'message', 'content': 'Cada día tiene una pequeña magia que llega cuando menos te lo esperas.', 'metadata': {'emoji': '🎀'}},
                {'day_number': 31, 'title': 'Gracias por ser tú', 'content_type': 'message', 'content': 'Este calendario no es solo una cuenta atrás: es una forma de decir que disfrutas de la compañía y de los pequeños detalles.', 'metadata': {'emoji': '💖'}},
            ],
        },
        {
            'name': 'Aroha',
            'slug': 'aroha-demo',
            'description': 'Amistad, recuerdos y momentos compartidos',
            'password': 'aroha123',
            'theme': 'friendship',
            'palette': {'primary': '#8166c8', 'secondary': '#dfe5ff', 'accent': '#98b7ff', 'background': '#f7f4ff'},
            'duration_days': 24,
            'start_date': today - timedelta(days=4),
            'end_date': today + timedelta(days=20),
            'is_published': True,
            'is_demo': True,
            'days': [
                {'day_number': 1, 'title': 'Un saludo inesperado', 'content_type': 'message', 'content': 'Hoy te quiero mandar un abrazo de cariño y agradecimiento por formar parte de mi historia.', 'metadata': {'emoji': '💜'}},
                {'day_number': 2, 'title': 'Recuerdo de verano', 'content_type': 'memory', 'content': 'Ese día en el que todo parecía más grande y más divertido.', 'metadata': {'emoji': '☀️'}},
                {'day_number': 3, 'title': 'La mejor compañía', 'content_type': 'question', 'content': '¿Qué hace que una tarde se recuerde para siempre?', 'metadata': {'emoji': '❔'}},
                {'day_number': 4, 'title': 'Pista de fotos', 'content_type': 'photo', 'content': 'Una imagen de una tarde que aún trae risas.', 'media_path': '/static/demo/aroha-1.jpg', 'metadata': {'emoji': '📸'}},
            ],
        },
        {
            'name': 'Kevin',
            'slug': 'kevin-demo',
            'description': 'Humor, videojuegos y desafíos',
            'password': 'kevin123',
            'theme': 'gaming',
            'palette': {'primary': '#1b9c5a', 'secondary': '#ff8f3d', 'accent': '#111111', 'background': '#f4f9f2'},
            'duration_days': 25,
            'start_date': today - timedelta(days=3),
            'end_date': today + timedelta(days=22),
            'is_published': True,
            'is_demo': True,
            'days': [
                {'day_number': 1, 'title': 'Modo debug', 'content_type': 'challenge', 'content': 'Si puedes leer esto sin reírte, eres un auténtico pro.', 'metadata': {'emoji': '🎮'}},
                {'day_number': 2, 'title': 'Niveles de humor', 'content_type': 'message', 'content': 'La mejor estrategia es reírse del caos con estilo.', 'metadata': {'emoji': '😂'}},
            ],
        },
        {
            'name': 'Carolina',
            'slug': 'carolina-demo',
            'description': 'Detalles, sorpresas y amistad',
            'password': 'carolina123',
            'theme': 'gentle',
            'palette': {'primary': '#e5d7b6', 'secondary': '#8aa982', 'accent': '#cda64a', 'background': '#f9f5ee'},
            'duration_days': 31,
            'start_date': today - timedelta(days=2),
            'end_date': today + timedelta(days=28),
            'is_published': True,
            'is_demo': True,
            'days': [
                {'day_number': 1, 'title': 'Detalle de bienvenida', 'content_type': 'message', 'content': 'Hoy un pequeño regalo digital para empezar con buen pie.', 'metadata': {'emoji': '🌿'}},
                {'day_number': 2, 'title': 'Recuerdo tierno', 'content_type': 'memory', 'content': 'Aquella tarde en la que todo parecía más sencillo y más bonito.', 'metadata': {'emoji': '✨'}},
            ],
        },
    ]


def create_default_demo_calendar_for_admin(db: Session, admin: AdminUser) -> Calendar | None:
    existing = db.scalars(
        select(Calendar).where(
            Calendar.admin_id == admin.id,
            Calendar.is_demo.is_(True),
            or_(Calendar.slug.like('demo-ejemplo%'), Calendar.name == 'demo-ejemplo')
        )
    ).all()

    if existing:
        default_calendar = existing[0]
        for duplicate in existing[1:]:
            db.delete(duplicate)
        default_calendar.name = 'demo-ejemplo'
        default_calendar.slug = f'demo-ejemplo-{admin.id}'
        default_calendar.description = 'Calendario de ejemplo para que cada usuario tenga una base lista desde el primer momento.'
        default_calendar.is_published = False
        default_calendar.is_demo = True
        default_calendar.duration_days = 7
        default_calendar.start_date = datetime.utcnow() - timedelta(days=1)
        default_calendar.end_date = datetime.utcnow() + timedelta(days=7)
        default_calendar.password_hash = hash_password('demo123')

        default_days = [
            {'day_number': 1, 'title': 'Bienvenida', 'content_type': 'message', 'content': 'Este es tu calendario de ejemplo. Personalízalo con tus mensajes.', 'metadata': {'emoji': '✨'}},
            {'day_number': 2, 'title': 'Un detalle especial', 'content_type': 'memory', 'content': 'Añade algún recuerdo o momento que quieras guardar.', 'metadata': {'emoji': '💌'}},
            {'day_number': 3, 'title': 'Un pequeño reto', 'content_type': 'challenge', 'content': 'Escribe una actividad divertida para tu público.', 'metadata': {'emoji': '🎁'}},
            {'day_number': 4, 'title': 'Tu canción', 'content_type': 'song', 'content': 'Crea una pista musical que acompañe el calendario.', 'metadata': {'emoji': '🎵'}},
            {'day_number': 5, 'title': 'Mensaje de cierre', 'content_type': 'message', 'content': 'Aquí puedes poner el mensaje final más bonito del calendario.', 'metadata': {'emoji': '💝'}},
        ]
        existing_days = {day.day_number: day for day in default_calendar.days}
        for day in default_days:
            day_record = existing_days.get(day['day_number'])
            if day_record is None:
                db.add(CalendarDay(
                    calendar_id=default_calendar.id,
                    day_number=day['day_number'],
                    title=day['title'],
                    content_type=day['content_type'],
                    content=day['content'],
                    content_metadata=day['metadata'],
                    position=day['day_number'],
                ))
                continue
            if (
                day_record.title != day['title']
                or day_record.content_type != day['content_type']
                or day_record.content != day['content']
                or day_record.content_metadata != day['metadata']
            ):
                day_record.title = day['title']
                day_record.content_type = day['content_type']
                day_record.content = day['content']
                day_record.content_metadata = day['metadata']
                day_record.position = day['day_number']
        db.commit()
        return default_calendar

    slug = f'demo-ejemplo-{admin.id}'
    calendar = Calendar(
        admin_id=admin.id,
        name='demo-ejemplo',
        slug=slug,
        description='Calendario de ejemplo para que cada usuario tenga una base lista desde el primer momento.',
        password_hash=hash_password('demo123'),
        theme='romantic',
        palette={'primary': '#a4253a', 'secondary': '#f8d7d7', 'accent': '#d4af37', 'background': '#fffaf5'},
        duration_days=7,
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=7),
        is_published=False,
        is_demo=True,
    )
    db.add(calendar)
    db.commit()
    db.refresh(calendar)

    default_days = [
        {'day_number': 1, 'title': 'Bienvenida', 'content_type': 'message', 'content': 'Este es tu calendario de ejemplo. Personalízalo con tus mensajes.', 'metadata': {'emoji': '✨'}},
        {'day_number': 2, 'title': 'Un detalle especial', 'content_type': 'memory', 'content': 'Añade algún recuerdo o momento que quieras guardar.', 'metadata': {'emoji': '💌'}},
        {'day_number': 3, 'title': 'Un pequeño reto', 'content_type': 'challenge', 'content': 'Escribe una actividad divertida para tu público.', 'metadata': {'emoji': '🎁'}},
        {'day_number': 4, 'title': 'Tu canción', 'content_type': 'song', 'content': 'Crea una pista musical que acompañe el calendario.', 'metadata': {'emoji': '🎵'}},
        {'day_number': 5, 'title': 'Mensaje de cierre', 'content_type': 'message', 'content': 'Aquí puedes poner el mensaje final más bonito del calendario.', 'metadata': {'emoji': '💝'}},
    ]
    for day in default_days:
        db.add(CalendarDay(
            calendar_id=calendar.id,
            day_number=day['day_number'],
            title=day['title'],
            content_type=day['content_type'],
            content=day['content'],
            content_metadata=day['metadata'],
            position=day['day_number'],
        ))
    db.commit()
    return calendar


def ensure_default_demo_calendars_for_admins(db: Session) -> None:
    admins = db.scalars(select(AdminUser)).all()
    for admin in admins:
        create_default_demo_calendar_for_admin(db, admin)


def ensure_canonical_public_demo(db: Session) -> None:
    canonical_slug = 'demo-ejemplo-publica'
    calendar = db.scalar(select(Calendar).where(Calendar.slug == canonical_slug))
    if calendar is not None:
        calendar.name = 'demo-ejemplo'
        calendar.is_published = True
        calendar.is_demo = True
        calendar.password_hash = hash_password('demo123')
        db.commit()
        return

    legacy = db.scalar(select(Calendar).where(Calendar.slug == 'demo-publica'))
    if legacy is not None:
        legacy.name = 'demo-ejemplo'
        legacy.slug = canonical_slug
        legacy.is_published = True
        legacy.is_demo = True
        legacy.password_hash = hash_password('demo123')
        db.commit()
        return

    default_calendar = Calendar(
        admin_id=None,
        name='demo-ejemplo',
        slug=canonical_slug,
        description='Calendario de ejemplo de acceso directo para probar la experiencia pública.',
        password_hash=hash_password('demo123'),
        theme='winter',
        palette={'primary': '#3f51b5', 'secondary': '#dfe8ff', 'accent': '#f5bf4f', 'background': '#f9fbff'},
        duration_days=7,
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=10),
        is_published=True,
        is_demo=True,
    )
    db.add(default_calendar)
    db.commit()
    db.refresh(default_calendar)

    for day in [
        {'day_number': 1, 'title': 'Bienvenida', 'content_type': 'message', 'content': 'Hoy empieza nuestro calendario público con un pequeño detalle para sonreír.', 'metadata': {'emoji': '✨'}},
        {'day_number': 2, 'title': 'Una pista', 'content_type': 'memory', 'content': 'Cada día trae un pequeño regalo para recordarte que eres importante.', 'metadata': {'emoji': '💫'}},
        {'day_number': 3, 'title': 'Un recuerdo', 'content_type': 'memory', 'content': 'A veces los mejores regalos son los momentos que compartes.', 'metadata': {'emoji': '📖'}},
        {'day_number': 4, 'title': 'Una canción', 'content_type': 'song', 'content': 'Pon una canción que te haga sentir en calma.', 'metadata': {'link': 'https://example.com/demo-song'}},
        {'day_number': 5, 'title': 'Un mensaje especial', 'content_type': 'message', 'content': 'Si ves esto, es porque el calendario ya está abierto para todo el mundo.', 'metadata': {'emoji': '💌'}},
        {'day_number': 6, 'title': 'Reto del día', 'content_type': 'challenge', 'content': 'Haz una pausa, mira a tu alrededor y sonríe por lo que tienes.', 'metadata': {'emoji': '🌿'}},
        {'day_number': 7, 'title': 'Cierre', 'content_type': 'message', 'content': 'Gracias por acompañarnos. Este es un calendario de prueba público.', 'metadata': {'emoji': '🎁'}},
    ]:
        db.add(CalendarDay(
            calendar_id=default_calendar.id,
            day_number=day['day_number'],
            title=day['title'],
            content_type=day['content_type'],
            content=day['content'],
            content_metadata=day['metadata'],
            position=day['day_number'],
        ))
    db.commit()


def seed_demo_data(db: Session) -> None:
    ensure_known_admins(db)
    ensure_default_demo_calendars_for_admins(db)
    ensure_canonical_public_demo(db)

    for item in build_demo_calendars():
        existing = db.scalar(select(Calendar).where(Calendar.slug == item['slug']))
        password_hash = hash_password(item['password'])
        if existing:
            for field_name, value in {
                'name': item['name'],
                'slug': item['slug'],
                'description': item['description'],
                'theme': item['theme'],
                'palette': item['palette'],
                'duration_days': item['duration_days'],
                'start_date': item['start_date'],
                'end_date': item['end_date'],
                'is_published': item['is_published'],
                'is_demo': item['is_demo'],
                'password_hash': password_hash,
            }.items():
                if getattr(existing, field_name) != value:
                    setattr(existing, field_name, value)
            existing.admin_id = None
            db.commit()
            calendar = existing
        else:
            calendar = Calendar(
                admin_id=None,
                name=item['name'],
                slug=item['slug'],
                description=item['description'],
                password_hash=password_hash,
                theme=item['theme'],
                palette=item['palette'],
                duration_days=item['duration_days'],
                start_date=item['start_date'],
                end_date=item['end_date'],
                is_published=item['is_published'],
                is_demo=item['is_demo'],
            )
            db.add(calendar)
            db.commit()
            db.refresh(calendar)

        existing_days = {day.day_number: day for day in calendar.days}
        for day in item['days']:
            day_record = existing_days.get(day['day_number'])
            if day_record is None:
                db.add(CalendarDay(
                    calendar_id=calendar.id,
                    day_number=day['day_number'],
                    title=day['title'],
                    content_type=day.get('content_type', 'message'),
                    content=day.get('content'),
                    media_path=day.get('media_path'),
                    content_metadata=day.get('metadata', {}),
                    position=day['day_number'],
                ))
                continue

            should_update = (
                day_record.title != day['title']
                or day_record.content_type != day.get('content_type', 'message')
                or day_record.content != day.get('content')
                or day_record.media_path != day.get('media_path')
                or day_record.content_metadata != day.get('metadata', {})
            )
            if should_update:
                day_record.title = day['title']
                day_record.content_type = day.get('content_type', 'message')
                day_record.content = day.get('content')
                day_record.media_path = day.get('media_path')
                day_record.content_metadata = day.get('metadata', {})
                day_record.position = day['day_number']
        db.commit()
