"""Add order currency code and exchange rates foundation.

Revision ID: 026
Revises: 025
Create Date: 2026-04-19

Adds:
- orders.currency_code
- exchange_rates table for historical FX snapshots
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '026'
down_revision = '025'
branch_labels = None
depends_on = None


def _table_columns(inspector, table_name):
    return {column['name'] for column in inspector.get_columns(table_name)}


def _table_indexes(inspector, table_name):
    return {index['name'] for index in inspector.get_indexes(table_name)}


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    order_columns = _table_columns(inspector, 'orders')
    order_indexes = _table_indexes(inspector, 'orders')

    if 'currency_code' not in order_columns:
        op.add_column('orders', sa.Column('currency_code', sa.String(length=3), nullable=False, server_default='INR'))

    # Backfill for safety in environments that created the column without default.
    conn.execute(sa.text("UPDATE orders SET currency_code = 'INR' WHERE currency_code IS NULL"))

    if 'ix_orders_currency_code' not in order_indexes:
        op.create_index('ix_orders_currency_code', 'orders', ['currency_code'], unique=False)

    tables = set(inspector.get_table_names())
    if 'exchange_rates' not in tables:
        op.create_table(
            'exchange_rates',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('base_currency', sa.String(length=3), nullable=False),
            sa.Column('quote_currency', sa.String(length=3), nullable=False),
            sa.Column('rate_to_quote', sa.Numeric(precision=18, scale=8), nullable=False),
            sa.Column('effective_at', sa.DateTime(), nullable=False),
            sa.Column('source', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.CheckConstraint('base_currency <> quote_currency', name='ck_exchange_rates_pair_distinct'),
            sa.CheckConstraint('rate_to_quote > 0', name='ck_exchange_rates_rate_positive'),
            sa.UniqueConstraint('base_currency', 'quote_currency', 'effective_at', name='uq_exchange_rates_pair_effective_at'),
        )
        op.create_index('ix_exchange_rates_base_currency', 'exchange_rates', ['base_currency'], unique=False)
        op.create_index('ix_exchange_rates_quote_currency', 'exchange_rates', ['quote_currency'], unique=False)
        op.create_index('ix_exchange_rates_effective_at', 'exchange_rates', ['effective_at'], unique=False)


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    tables = set(inspector.get_table_names())
    if 'exchange_rates' in tables:
        indexes = _table_indexes(inspector, 'exchange_rates')
        if 'ix_exchange_rates_effective_at' in indexes:
            op.drop_index('ix_exchange_rates_effective_at', table_name='exchange_rates')
        if 'ix_exchange_rates_quote_currency' in indexes:
            op.drop_index('ix_exchange_rates_quote_currency', table_name='exchange_rates')
        if 'ix_exchange_rates_base_currency' in indexes:
            op.drop_index('ix_exchange_rates_base_currency', table_name='exchange_rates')
        op.drop_table('exchange_rates')

    order_columns = _table_columns(inspector, 'orders')
    order_indexes = _table_indexes(inspector, 'orders')
    if 'ix_orders_currency_code' in order_indexes:
        op.drop_index('ix_orders_currency_code', table_name='orders')
    if 'currency_code' in order_columns:
        op.drop_column('orders', 'currency_code')
