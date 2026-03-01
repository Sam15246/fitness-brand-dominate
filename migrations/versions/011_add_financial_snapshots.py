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
    # Add financial snapshot columns to orders table
    with op.batch_alter_table('orders', schema=None) as batch_op:
        # Snapshot fields - all in paise (smallest unit)
        batch_op.add_column(sa.Column('subtotal_amount', sa.Integer(), nullable=True, comment='Sum of all OrderItem.subtotal (immutable)'))
        batch_op.add_column(sa.Column('shipping_amount', sa.Integer(), nullable=True, default=0, comment='Shipping cost in paise'))
        batch_op.add_column(sa.Column('discount_amount', sa.Integer(), nullable=True, default=0, comment='Total discounts applied'))
        batch_op.add_column(sa.Column('tax_amount', sa.Integer(), nullable=True, default=0, comment='GST or taxes (currently 0)'))
        batch_op.add_column(sa.Column('total_amount', sa.Integer(), nullable=True, comment='Final amount paid (immutable snapshot)'))
        
        # Add index on total_amount for reporting
        batch_op.create_index('ix_orders_total_amount', ['total_amount'])


def downgrade():
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_index('ix_orders_total_amount')
        batch_op.drop_column('tax_amount')
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('shipping_amount')
        batch_op.drop_column('subtotal_amount')
        batch_op.drop_column('total_amount')
