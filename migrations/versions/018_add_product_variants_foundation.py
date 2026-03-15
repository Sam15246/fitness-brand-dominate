"""Add product variants foundation with nullable references for transition.

Revision ID: 018
Revises: 017
Create Date: 2026-03-15

STEP 1 SCOPE:
- Create product_variants table
- Add nullable variant_id to cart_items
- Add nullable variant_id + variant_snapshot to order_items

This migration is intentionally backward-compatible.
Backfill/default-variant creation and NOT NULL enforcement will be done in a follow-up migration.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    dialect = conn.dialect.name

    existing_tables = set(inspector.get_table_names())

    if 'product_variants' not in existing_tables:
        op.create_table(
            'product_variants',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=False),
            sa.Column('sku', sa.String(length=100), nullable=False),
            sa.Column('option_values', sa.JSON(), nullable=False),
            sa.Column('price_override', sa.Integer(), nullable=True),
            sa.Column('stock_quantity', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('weight_grams', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['product_id'], ['products.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('sku'),
            sa.CheckConstraint('stock_quantity >= 0', name='ck_variant_stock_non_negative'),
        )

        op.create_index('ix_product_variants_product_id', 'product_variants', ['product_id'], unique=False)
        op.create_index('ix_product_variants_sku', 'product_variants', ['sku'], unique=True)
        op.create_index('ix_product_variants_stock_quantity', 'product_variants', ['stock_quantity'], unique=False)
        op.create_index('ix_product_variants_is_active', 'product_variants', ['is_active'], unique=False)
        op.create_index('ix_product_variants_created_at', 'product_variants', ['created_at'], unique=False)

    cart_columns = {c['name'] for c in inspector.get_columns('cart_items')}
    if 'variant_id' not in cart_columns:
        op.add_column('cart_items', sa.Column('variant_id', sa.Integer(), nullable=True))
        op.create_index('ix_cart_items_variant_id', 'cart_items', ['variant_id'], unique=False)
        if dialect != 'sqlite':
            op.create_foreign_key(
                'fk_cart_items_variant_id',
                'cart_items',
                'product_variants',
                ['variant_id'],
                ['id'],
            )

    order_item_columns = {c['name'] for c in inspector.get_columns('order_items')}
    if 'variant_id' not in order_item_columns:
        op.add_column('order_items', sa.Column('variant_id', sa.Integer(), nullable=True))
        op.create_index('ix_order_items_variant_id', 'order_items', ['variant_id'], unique=False)
        if dialect != 'sqlite':
            op.create_foreign_key(
                'fk_order_items_variant_id',
                'order_items',
                'product_variants',
                ['variant_id'],
                ['id'],
            )

    if 'variant_snapshot' not in order_item_columns:
        op.add_column('order_items', sa.Column('variant_snapshot', sa.JSON(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    dialect = conn.dialect.name

    order_item_columns = {c['name'] for c in inspector.get_columns('order_items')}
    if 'variant_snapshot' in order_item_columns:
        op.drop_column('order_items', 'variant_snapshot')

    if 'variant_id' in order_item_columns:
        if 'ix_order_items_variant_id' in {ix['name'] for ix in inspector.get_indexes('order_items')}:
            op.drop_index('ix_order_items_variant_id', table_name='order_items')
        if dialect != 'sqlite':
            existing_fks = {fk['name'] for fk in inspector.get_foreign_keys('order_items') if fk.get('name')}
            if 'fk_order_items_variant_id' in existing_fks:
                op.drop_constraint('fk_order_items_variant_id', 'order_items', type_='foreignkey')
        op.drop_column('order_items', 'variant_id')

    cart_columns = {c['name'] for c in inspector.get_columns('cart_items')}
    if 'variant_id' in cart_columns:
        if 'ix_cart_items_variant_id' in {ix['name'] for ix in inspector.get_indexes('cart_items')}:
            op.drop_index('ix_cart_items_variant_id', table_name='cart_items')
        if dialect != 'sqlite':
            existing_fks = {fk['name'] for fk in inspector.get_foreign_keys('cart_items') if fk.get('name')}
            if 'fk_cart_items_variant_id' in existing_fks:
                op.drop_constraint('fk_cart_items_variant_id', 'cart_items', type_='foreignkey')
        op.drop_column('cart_items', 'variant_id')

    if 'product_variants' in set(inspector.get_table_names()):
        idx_names = {ix['name'] for ix in inspector.get_indexes('product_variants')}
        for idx in [
            'ix_product_variants_created_at',
            'ix_product_variants_is_active',
            'ix_product_variants_stock_quantity',
            'ix_product_variants_sku',
            'ix_product_variants_product_id',
        ]:
            if idx in idx_names:
                op.drop_index(idx, table_name='product_variants')
        op.drop_table('product_variants')
