from __future__ import annotations

import base64
import logging
import secrets
import smtplib
from datetime import datetime
from email.message import EmailMessage

from app.core.config import get_settings
from app.models.calendar import CalendarReminder

logger = logging.getLogger('advent.reminders')


def mark_reminders_as_sent(reminders: list[CalendarReminder]) -> list[str]:
    sent_emails: list[str] = []
    for reminder in reminders:
        reminder.sent_at = datetime.utcnow()
        sent_emails.append(reminder.email)
        logger.info('Reminder simulated for %s', reminder.email)
    return sent_emails


def generate_feedback_code() -> str:
    token = secrets.token_hex(3).upper()
    return f'ADV-{token}'


def send_account_created_email(to_email: str, admin_name: str | None = None) -> bool:
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        logger.info('SMTP email disabled; account-created notification not sent to %s', to_email)
        return False

    try:
        msg = EmailMessage()
        msg['Subject'] = 'Cuenta creada en Advent Calendar'
        msg['From'] = settings.smtp_from or settings.smtp_user
        msg['To'] = to_email
        sender_name = (admin_name or 'Administrador').strip() or 'Administrador'
        msg.set_content(
            'Hola ' + sender_name + ',\n\n'
            'Tu cuenta de administrador en Advent Calendar ya ha sido creada.\n'
            'Puedes entrar en la web y empezar a usar el panel de administración.\n\n'
            'Gracias por confiar en Advent Calendar.'
        )

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

        logger.info('Account created email sent to %s', to_email)
        return True
    except Exception:
        logger.exception('Failed to send account created email to %s', to_email)
        return False


def send_feedback_email(
    feedback_type: str,
    title: str,
    description: str,
    tracking_code: str | None = None,
    image_name: str | None = None,
    image_data: str | None = None,
) -> bool:
    settings = get_settings()
    destination = (settings.smtp_user or settings.smtp_from or 'codefrv@gmail.com').strip()
    if not settings.smtp_host or not destination or not settings.smtp_password:
        logger.info('SMTP email disabled; feedback message not sent to %s', destination)
        return False

    try:
        code = tracking_code or generate_feedback_code()
        label = 'Sugerencia' if feedback_type == 'suggestion' else 'Reporte de error'
        msg = EmailMessage()
        msg['Subject'] = f'[Advent Calendar] {label} #{code}'
        msg['From'] = settings.smtp_from or settings.smtp_user
        msg['To'] = destination

        content_lines = [
            f'Tipo: {label}',
            f'Código: {code}',
            f'Título: {title}',
            '',
            'Descripción:',
            description,
        ]
        if image_name:
            content_lines.extend(['', f'Imagen adjunta: {image_name}'])
        msg.set_content('\n'.join(content_lines))

        if image_data and image_data.startswith('data:image/'):
            header, encoded = image_data.split(',', 1)
            mime_type = header.replace('data:', '').split(';', 1)[0]
            image_bytes = base64.b64decode(encoded)
            subtype = mime_type.split('/')[-1] if '/' in mime_type else 'png'
            msg.add_attachment(
                image_bytes,
                maintype='image',
                subtype=subtype,
                filename=image_name or f'{code}.{subtype}',
            )

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

        logger.info('Feedback email sent with code %s to %s', code, destination)
        return True
    except Exception:
        logger.exception('Failed to send feedback email for code %s', tracking_code or 'unknown')
        return False
