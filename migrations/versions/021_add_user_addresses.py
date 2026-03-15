"""Add user address book and optional order address reference.

Revision ID: 021
Revises: 020
Create Date: 2026-03-15

Phase 3 schema scope:
- Create user_addresses table
- Add optional orders.address_id FK to user_addresses

Order snapshot fields are preserved and unchanged.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    dialect = conn.dialect.name

    existing_tables = set(inspector.get_table_names())

    if 'user_addresses' not in existing_tables:
        op.create_table(
            'user_addresses',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('label', sa.String(length=50), nullable=False, server_default='Home'),
            sa.Column('full_name', sa.String(length=255), nullable=False),
            sa.Column('phone', sa.String(length=20), nullable=False),
            sa.Column('street_line1', sa.String(length=255), nullable=False),
            sa.Column('street_line2', sa.String(length=255), nullable=True),
            sa.Column('landmark', sa.String(length=255), nullable=True),
            sa.Column('city', sa.String(length=100), nullable=False),
            sa.Column('state', sa.String(length=100), nullable=False),
            sa.Column('pincode', sa.String(length=10), nullable=False),
            sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('lat', sa.Numeric(9, 6), nullable=True),
            sa.Column('lng', sa.Numeric(9, 6), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_user_addresses_user_id', 'user_addresses', ['user_id'], unique=False)
        op.create_index('ix_user_addresses_is_default', 'user_addresses', ['is_default'], unique=False)
        op.create_index('ix_user_addresses_created_at', 'user_addresses', ['created_at'], unique=False)

    orders_columns = {c['name'] for c in inspector.get_columns('orders')}
    if 'address_id' not in orders_columns:
        op.add_column('orders', sa.Column('address_id', sa.Integer(), nullable=True))
        op.create_index('ix_orders_address_id', 'orders', ['address_id'], unique=False)
        if dialect != 'sqlite':
            op.create_foreign_key(
                'fk_orders_address_id',
                'orders',
                'user_addresses',
                ['address_id'],
                ['id'],
            )


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    dialect = conn.dialect.name

    orders_columns = {c['name'] for c in inspector.get_columns('orders')}
    if 'address_id' in orders_columns:
        indexes = {ix['name'] for ix in inspector.get_indexes('orders')}
        if 'ix_orders_address_id' in indexes:
            op.drop_index('ix_orders_address_id', table_name='orders')

        if dialect != 'sqlite':
            fks = {fk['name'] for fk in inspector.get_foreign_keys('orders') if fk.get('name')}
            if 'fk_orders_address_id' in fks:
                op.drop_constraint('fk_orders_address_id', 'orders', type_='foreignkey')

        op.drop_column('orders', 'address_id')

    if 'user_addresses' in set(inspector.get_table_names()):
        indexes = {ix['name'] for ix in inspector.get_indexes('user_addresses')}
        for idx in ['ix_user_addresses_created_at', 'ix_user_addresses_is_default', 'ix_user_addresses_user_id']:
            if idx in indexes:
                op.drop_index(idx, table_name='user_addresses')
        op.drop_table('user_addresses')
