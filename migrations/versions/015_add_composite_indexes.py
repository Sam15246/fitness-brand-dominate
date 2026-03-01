"""Add composite indexes for scalability.

Revision ID: 015
Revises: 014
Create Date: 2026-03-01

Composite indexes optimize common reporting and filtering queries:

1. (status, created_at) on orders
   - Finds recent pending orders
   - Reporting: orders by status and date range
   - Analytics: daily order counts

2. (affiliate_id, status) on orders
   - Affiliate dashboard: view their orders and commissions
   - Commission calculation: confirmed orders only
   - Affiliate performance analytics

3. (product_id, created_at) on order_items
   - Product analytics: sales over time
   - Best sellers: sorted by sales date
   - Reporting: product revenue by period

These indexes support the existing query patterns without breaking changes.
"""
from alembic import op
from sqlalchemy import inspect


revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Get existing indexes to avoid duplicates
    orders_indexes = {idx['name'] for idx in inspector.get_indexes('orders')}
    order_items_indexes = {idx['name'] for idx in inspector.get_indexes('order_items')}
    
    # Composite index: status + created_at (for finding recent orders by status)
    if 'ix_orders_status_created_at' not in orders_indexes:
        op.create_index(
            'ix_orders_status_created_at',
            'orders',
            ['status', 'created_at'],
            unique=False
        )
    
    # Composite index: affiliate_id + status (for affiliate dashboard)
    if 'ix_orders_affiliate_status' not in orders_indexes:
        op.create_index(
            'ix_orders_affiliate_status',
            'orders',
            ['affiliate_id', 'status'],
            unique=False
        )
    
    # Composite index: product_id + created_at (for product analytics)
    if 'ix_order_items_product_created_at' not in order_items_indexes:
        op.create_index(
            'ix_order_items_product_created_at',
            'order_items',
            ['product_id', 'created_at'],
            unique=False
        )


def downgrade():
    op.drop_index('ix_order_items_product_created_at', table_name='order_items')
    op.drop_index('ix_orders_affiliate_status', table_name='orders')
    op.drop_index('ix_orders_status_created_at', table_name='orders')
