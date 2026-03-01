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
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sku', sa.String(50), nullable=True, comment='Stock Keeping Unit (unique identifier)'))
        batch_op.create_unique_constraint('uq_products_sku', ['sku'])
        batch_op.create_index('ix_products_sku', ['sku'])


def downgrade():
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_index('ix_products_sku')
        batch_op.drop_constraint('uq_products_sku', type_='unique')
        batch_op.drop_column('sku')
