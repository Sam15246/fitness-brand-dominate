"""Add missing operational composite indexes.

Revision ID: 023
Revises: 022
Create Date: 2026-03-15

Adds only the composite indexes still missing from existing index set:
- coupon_codes(is_active, expires_at)
- inventory_logs(product_id, created_at)
"""

from alembic import op
from sqlalchemy import inspect


revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def _index_with_columns_exists(inspector, table_name, wanted_columns):
    wanted = tuple(wanted_columns)
    for index in inspector.get_indexes(table_name):
        if tuple(index.get('column_names') or []) == wanted:
            return True
    return False


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    if not _index_with_columns_exists(inspector, 'coupon_codes', ['is_active', 'expires_at']):
        op.create_index(
            'idx_coupon_active_expiry',
            'coupon_codes',
            ['is_active', 'expires_at'],
            unique=False,
        )

    if not _index_with_columns_exists(inspector, 'inventory_logs', ['product_id', 'created_at']):
        op.create_index(
            'idx_inventory_logs_product',
            'inventory_logs',
            ['product_id', 'created_at'],
            unique=False,
        )


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    inventory_indexes = {idx['name'] for idx in inspector.get_indexes('inventory_logs')}
    coupon_indexes = {idx['name'] for idx in inspector.get_indexes('coupon_codes')}

    if 'idx_inventory_logs_product' in inventory_indexes:
        op.drop_index('idx_inventory_logs_product', table_name='inventory_logs')

    if 'idx_coupon_active_expiry' in coupon_indexes:
        op.drop_index('idx_coupon_active_expiry', table_name='coupon_codes')
