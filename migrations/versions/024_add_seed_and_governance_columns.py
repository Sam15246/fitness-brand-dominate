"""Add seed and governance columns for future scale.

Revision ID: 024
Revises: 023
Create Date: 2026-03-15

Adds:
- users.deleted_at
- products.hsn_code, products.tax_rate, products.deleted_at
- product_categories.meta_title, product_categories.meta_desc
- affiliate_profiles.tier
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def _table_columns(inspector, table_name):
    return {column['name'] for column in inspector.get_columns(table_name)}


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    user_columns = _table_columns(inspector, 'users')
    if 'deleted_at' not in user_columns:
        op.add_column('users', sa.Column('deleted_at', sa.DateTime(), nullable=True))
        op.create_index('ix_users_deleted_at', 'users', ['deleted_at'], unique=False)

    product_columns = _table_columns(inspector, 'products')
    if 'hsn_code' not in product_columns:
        op.add_column('products', sa.Column('hsn_code', sa.String(length=10), nullable=True))
    if 'tax_rate' not in product_columns:
        op.add_column('products', sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False, server_default='18.00'))
    if 'deleted_at' not in product_columns:
        op.add_column('products', sa.Column('deleted_at', sa.DateTime(), nullable=True))
        op.create_index('ix_products_deleted_at', 'products', ['deleted_at'], unique=False)

    category_columns = _table_columns(inspector, 'product_categories')
    if 'meta_title' not in category_columns:
        op.add_column('product_categories', sa.Column('meta_title', sa.String(length=255), nullable=True))
    if 'meta_desc' not in category_columns:
        op.add_column('product_categories', sa.Column('meta_desc', sa.Text(), nullable=True))

    affiliate_columns = _table_columns(inspector, 'affiliate_profiles')
    if 'tier' not in affiliate_columns:
        op.add_column('affiliate_profiles', sa.Column('tier', sa.String(length=20), nullable=False, server_default='bronze'))
        op.create_index('ix_affiliate_profiles_tier', 'affiliate_profiles', ['tier'], unique=False)


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    affiliate_columns = _table_columns(inspector, 'affiliate_profiles')
    if 'tier' in affiliate_columns:
        indexes = {idx['name'] for idx in inspector.get_indexes('affiliate_profiles')}
        if 'ix_affiliate_profiles_tier' in indexes:
            op.drop_index('ix_affiliate_profiles_tier', table_name='affiliate_profiles')
        op.drop_column('affiliate_profiles', 'tier')

    category_columns = _table_columns(inspector, 'product_categories')
    if 'meta_desc' in category_columns:
        op.drop_column('product_categories', 'meta_desc')
    if 'meta_title' in category_columns:
        op.drop_column('product_categories', 'meta_title')

    product_columns = _table_columns(inspector, 'products')
    indexes = {idx['name'] for idx in inspector.get_indexes('products')}
    if 'deleted_at' in product_columns:
        if 'ix_products_deleted_at' in indexes:
            op.drop_index('ix_products_deleted_at', table_name='products')
        op.drop_column('products', 'deleted_at')
    if 'tax_rate' in product_columns:
        op.drop_column('products', 'tax_rate')
    if 'hsn_code' in product_columns:
        op.drop_column('products', 'hsn_code')

    user_columns = _table_columns(inspector, 'users')
    indexes = {idx['name'] for idx in inspector.get_indexes('users')}
    if 'deleted_at' in user_columns:
        if 'ix_users_deleted_at' in indexes:
            op.drop_index('ix_users_deleted_at', table_name='users')
        op.drop_column('users', 'deleted_at')
