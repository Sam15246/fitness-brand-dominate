"""Add financial snapshot fields to Order table.

Revision ID: 011
Revises: 010
Create Date: 2026-03-01

Adds immutable financial tracking fields to Order:
- subtotal_amount: Sum of all OrderItem subtotals
- shipping_amount: Shipping cost for this order
- discount_amount: Total discounts applied
- tax_amount: GST or other taxes (currently 0, ready for future)
- total_amount: Final amount paid (immutable snapshot)

These fields preserve historical financial data and enable:
1. Accurate financial reporting (no recalculation of old orders)
2. Easy reconciliation with payment gateways
3. Future tax system implementation without data migration
4. Shipping cost calculation and integration

BACKWARD COMPATIBILITY:
- All fields nullable initially
- Populated when order is created or confirmed
- get_total_price() method still works (uses OrderItem.subtotal)
- get_total_price() intentionally kept for compatibility

SCALABILITY:
- Prepared for multiple payment methods
- Ready for partial refunds (track refunded_amount separately)
- Tax system ready (set tax_enabled flag when needed)
"""
from alembic import op
import sqlalchemy as sa


revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col['name'] for col in inspector.get_columns('orders')}

    # Add financial snapshot columns to orders table (idempotent)
    if 'subtotal_amount' not in columns:
        op.add_column('orders', sa.Column('subtotal_amount', sa.Integer(), nullable=True, comment='Sum of all OrderItem.subtotal (immutable)'))
    if 'shipping_amount' not in columns:
        op.add_column('orders', sa.Column('shipping_amount', sa.Integer(), nullable=True, default=0, comment='Shipping cost in paise'))
    if 'discount_amount' not in columns:
        op.add_column('orders', sa.Column('discount_amount', sa.Integer(), nullable=True, default=0, comment='Total discounts applied'))
    if 'tax_amount' not in columns:
        op.add_column('orders', sa.Column('tax_amount', sa.Integer(), nullable=True, default=0, comment='GST or taxes (currently 0)'))
    if 'total_amount' not in columns:
        op.add_column('orders', sa.Column('total_amount', sa.Integer(), nullable=True, comment='Final amount paid (immutable snapshot)'))

    indexes = {idx['name'] for idx in inspector.get_indexes('orders')}
    if 'ix_orders_total_amount' not in indexes:
        op.create_index('ix_orders_total_amount', 'orders', ['total_amount'])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col['name'] for col in inspector.get_columns('orders')}
    indexes = {idx['name'] for idx in inspector.get_indexes('orders')}

    if 'ix_orders_total_amount' in indexes:
        op.drop_index('ix_orders_total_amount', table_name='orders')

    for col in ['tax_amount', 'discount_amount', 'shipping_amount', 'subtotal_amount', 'total_amount']:
        if col in columns:
            op.drop_column('orders', col)
