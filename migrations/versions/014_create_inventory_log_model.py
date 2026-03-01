"""Create InventoryLog model for audit trail.

Revision ID: 014
Revises: 013
Create Date: 2026-03-01

InventoryLog provides:
1. Complete audit trail of all stock changes
2. Debugging for stock discrepancies
3. Analytics on product velocity
4. Preparation for warehouse management system
5. Reconciliation with accounting

CHANGE TYPES:
- sale: Stock reduced for confirmed orders
- return: Stock restored from customer returns
- manual_adjustment: Admin inventory correction
- received: New inventory from supplier

SCALABILITY:
- reference_order_id allows linking to orders
- created_by enables attribution to admin actions
- Minimal data footprint (just quantity and reason)
- Enables easy reporting and dashboards

FUTURE:
- Integration with warehouse system
- Barcode scanning creates entries automatically
- Reconciliation reports against physical count
- Stock valuation (quantity × unit cost)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Only create table if it doesn't exist (idempotent)
    if 'inventory_logs' not in inspector.get_table_names():
        op.create_table(
            'inventory_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=False),
            sa.Column('change_type', sa.String(20), nullable=False, comment='sale, return, manual_adjustment, received'),
            sa.Column('quantity', sa.Integer(), nullable=False, comment='Quantity changed (positive or negative)'),
            sa.Column('reference_order_id', sa.Integer(), nullable=True, comment='Order ID if change_type is sale/return'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('created_by', sa.Integer(), nullable=True, comment='Admin user ID if manual adjustment'),
            sa.Column('notes', sa.Text(), nullable=True, comment='Reason for manual adjustment'),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
            sa.ForeignKeyConstraint(['reference_order_id'], ['orders.id'], ),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
        )
        
        # Indexes for common queries
        op.create_index('ix_inventory_logs_product_id', 'inventory_logs', ['product_id'])
        op.create_index('ix_inventory_logs_change_type', 'inventory_logs', ['change_type'])
        op.create_index('ix_inventory_logs_created_at', 'inventory_logs', ['created_at'])
        op.create_index('ix_inventory_logs_order_id', 'inventory_logs', ['reference_order_id'])


def downgrade():
    op.drop_table('inventory_logs')
