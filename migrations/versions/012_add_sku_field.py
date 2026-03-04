"""Add SKU field to Product table.

Revision ID: 012
Revises: 011
Create Date: 2026-03-01

SKU (Stock Keeping Unit) enables:
1. Inventory management and tracking
2. Courier integration (unique product identifier)
3. Accounting and financial reporting
4. Internal warehouse management
5. Future barcode/QR code integration

DESIGN:
- Unique constraint for SKU (no duplicates)
- Nullable initially to not break existing products
- Indexed for fast lookups
- Optional admin-set field
- Format: No specific format enforced (flexibility)

FUTURE USE:
- Barcode scanning for warehouse
- Integration with Shiprocket API (requires SKU)
- Accounting system export
- Analytics by SKU
"""
from alembic import op
import sqlalchemy as sa


revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col['name'] for col in inspector.get_columns('products')}
    indexes = {idx['name'] for idx in inspector.get_indexes('products')}

    if 'sku' not in columns:
        op.add_column('products', sa.Column('sku', sa.String(50), nullable=True, comment='Stock Keeping Unit (unique identifier)'))

    # SQLite doesn't support adding UNIQUE constraints on existing tables directly.
    # Use unique index for equivalent behavior.
    if bind.dialect.name == 'sqlite':
        if 'uq_products_sku' not in indexes:
            op.create_index('uq_products_sku', 'products', ['sku'], unique=True)
        if 'ix_products_sku' not in indexes:
            op.create_index('ix_products_sku', 'products', ['sku'])
        return

    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_products_sku', ['sku'])
        batch_op.create_index('ix_products_sku', ['sku'])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col['name'] for col in inspector.get_columns('products')}
    indexes = {idx['name'] for idx in inspector.get_indexes('products')}

    if 'ix_products_sku' in indexes:
        op.drop_index('ix_products_sku', table_name='products')

    if bind.dialect.name == 'sqlite':
        if 'uq_products_sku' in indexes:
            op.drop_index('uq_products_sku', table_name='products')
    else:
        with op.batch_alter_table('products', schema=None) as batch_op:
            batch_op.drop_constraint('uq_products_sku', type_='unique')

    if 'sku' in columns:
        op.drop_column('products', 'sku')
