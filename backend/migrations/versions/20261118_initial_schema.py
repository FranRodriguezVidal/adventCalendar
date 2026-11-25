"""initial schema

Revision ID: 20261118_initial_schema
Revises: 
Create Date: 2026-11-18 13:50:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '20261118_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'admin_users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_admin_users_email'), 'admin_users', ['email'], unique=True)
    op.create_index(op.f('ix_admin_users_id'), 'admin_users', ['id'], unique=False)

    op.create_table(
        'calendars',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('theme', sa.String(length=120), nullable=False),
        sa.Column('palette', sa.JSON(), nullable=False),
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False),
        sa.Column('is_demo', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index(op.f('ix_calendars_id'), 'calendars', ['id'], unique=False)
    op.create_index(op.f('ix_calendars_slug'), 'calendars', ['slug'], unique=True)

    op.create_table(
        'calendar_days',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('calendar_id', sa.Integer(), nullable=False),
        sa.Column('day_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=60), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('media_path', sa.String(length=255), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=False),
        sa.Column('is_unlocked_by_admin', sa.Boolean(), nullable=False),
        sa.Column('unlock_date', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['calendar_id'], ['calendars.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('calendar_id', 'day_number', name='uq_calendar_day_number'),
    )
    op.create_index(op.f('ix_calendar_days_calendar_id'), 'calendar_days', ['calendar_id'], unique=False)
    op.create_index(op.f('ix_calendar_days_id'), 'calendar_days', ['id'], unique=False)

    op.create_table(
        'calendar_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('calendar_id', sa.Integer(), nullable=False),
        sa.Column('setting_key', sa.String(length=120), nullable=False),
        sa.Column('setting_value', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['calendar_id'], ['calendars.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('calendar_id', 'setting_key', name='uq_calendar_setting_key'),
    )
    op.create_index(op.f('ix_calendar_settings_calendar_id'), 'calendar_settings', ['calendar_id'], unique=False)
    op.create_index(op.f('ix_calendar_settings_id'), 'calendar_settings', ['id'], unique=False)

    op.create_table(
        'open_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('calendar_id', sa.Integer(), nullable=False),
        sa.Column('calendar_day_id', sa.Integer(), nullable=False),
        sa.Column('opened_at', sa.DateTime(), nullable=False),
        sa.Column('access_session_id', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['calendar_id'], ['calendars.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['calendar_day_id'], ['calendar_days.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_open_events_calendar_id'), 'open_events', ['calendar_id'], unique=False)
    op.create_index(op.f('ix_open_events_id'), 'open_events', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_open_events_id'), table_name='open_events')
    op.drop_index(op.f('ix_open_events_calendar_id'), table_name='open_events')
    op.drop_table('open_events')

    op.drop_index(op.f('ix_calendar_settings_id'), table_name='calendar_settings')
    op.drop_index(op.f('ix_calendar_settings_calendar_id'), table_name='calendar_settings')
    op.drop_table('calendar_settings')

    op.drop_index(op.f('ix_calendar_days_id'), table_name='calendar_days')
    op.drop_index(op.f('ix_calendar_days_calendar_id'), table_name='calendar_days')
    op.drop_table('calendar_days')

    op.drop_index(op.f('ix_calendars_slug'), table_name='calendars')
    op.drop_index(op.f('ix_calendars_id'), table_name='calendars')
    op.drop_table('calendars')

    op.drop_index(op.f('ix_admin_users_id'), table_name='admin_users')
    op.drop_index(op.f('ix_admin_users_email'), table_name='admin_users')
    op.drop_table('admin_users')
