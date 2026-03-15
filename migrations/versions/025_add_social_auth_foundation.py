"""Add social auth foundation on users.

Revision ID: 025
Revises: 024
Create Date: 2026-03-15

Adds:
- users.auth_provider
- users.auth_provider_id
- users.avatar_url
- users.full_name
- unique filtered index for (auth_provider, auth_provider_id) where provider id is not null
- makes users.password_hash nullable for OAuth-only accounts
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def _table_columns(inspector, table_name):
    return {column['name'] for column in inspector.get_columns(table_name)}


def _table_indexes(inspector, table_name):
    return {index['name'] for index in inspector.get_indexes(table_name)}


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    user_columns = _table_columns(inspector, 'users')

    if 'auth_provider' not in user_columns:
        op.add_column('users', sa.Column('auth_provider', sa.String(length=30), nullable=False, server_default='local'))
        op.create_index('ix_users_auth_provider', 'users', ['auth_provider'], unique=False)

    if 'auth_provider_id' not in user_columns:
        op.add_column('users', sa.Column('auth_provider_id', sa.String(length=255), nullable=True))
        op.create_index('ix_users_auth_provider_id', 'users', ['auth_provider_id'], unique=False)

    if 'avatar_url' not in user_columns:
        op.add_column('users', sa.Column('avatar_url', sa.Text(), nullable=True))

    if 'full_name' not in user_columns:
        op.add_column('users', sa.Column('full_name', sa.String(length=255), nullable=True))

    # Ensure existing rows are marked local for safe password-login semantics.
    conn.execute(sa.text("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL"))

    indexes = _table_indexes(inspector, 'users')
    if 'idx_users_provider' not in indexes:
        op.create_index(
            'idx_users_provider',
            'users',
            ['auth_provider', 'auth_provider_id'],
            unique=True,
            postgresql_where=sa.text('auth_provider_id IS NOT NULL'),
            sqlite_where=sa.text('auth_provider_id IS NOT NULL'),
        )

    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.String(length=255), nullable=True)


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    # Downgrade safety: cannot restore NOT NULL if null hashes exist.
    null_hash_count = conn.execute(sa.text('SELECT COUNT(*) FROM users WHERE password_hash IS NULL')).scalar() or 0
    if null_hash_count > 0:
        raise RuntimeError('Cannot downgrade: users.password_hash has NULL values from social-auth accounts.')

    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.String(length=255), nullable=False)

    indexes = _table_indexes(inspector, 'users')
    if 'idx_users_provider' in indexes:
        op.drop_index('idx_users_provider', table_name='users')

    user_columns = _table_columns(inspector, 'users')
    if 'full_name' in user_columns:
        op.drop_column('users', 'full_name')
    if 'avatar_url' in user_columns:
        op.drop_column('users', 'avatar_url')

    indexes = _table_indexes(inspector, 'users')
    if 'ix_users_auth_provider_id' in indexes:
        op.drop_index('ix_users_auth_provider_id', table_name='users')
    user_columns = _table_columns(inspector, 'users')
    if 'auth_provider_id' in user_columns:
        op.drop_column('users', 'auth_provider_id')

    indexes = _table_indexes(inspector, 'users')
    if 'ix_users_auth_provider' in indexes:
        op.drop_index('ix_users_auth_provider', table_name='users')
    user_columns = _table_columns(inspector, 'users')
    if 'auth_provider' in user_columns:
        op.drop_column('users', 'auth_provider')
