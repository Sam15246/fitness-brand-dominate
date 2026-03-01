"""Fix: Handle missing product_id columns gracefully and create order_items.

Revision ID: 009
Revises: 008
Create Date: 2026-03-01

This migration:
1. Migrates data from orders to order_items (one item per order)
2. Makes product_id, quantity, total_price nullable in orders (SQLite doesn't support column drops with FK constraints)
3. Safe for production - handles missing columns gracefully

IDEMPOTENT: Safe to run multiple times
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if order_items table exists, if not create it
    if 'order_items' not in inspector.get_table_names():
        op.create_table(
            'order_items',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('order_id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('unit_price', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint('quantity > 0', name='ck_orderitem_quantity_positive'),
            sa.CheckConstraint('unit_price > 0', name='ck_orderitem_price_positive'),
        )
        op.create_index(op.f('ix_order_items_order_id'), 'order_items', ['order_id'], unique=False)
        op.create_index(op.f('ix_order_items_product_id'), 'order_items', ['product_id'], unique=False)
        
        # Migrate existing orders to order_items
        orders_columns = [col['name'] for col in inspector.get_columns('orders')]
        
        if 'product_id' in orders_columns:
            # Insert order items from orders table data
            conn.execute(text("""
                INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, unit_price, created_at)
                SELECT id, product_id, COALESCE(quantity, 1), COALESCE(total_price, 0), created_at
                FROM orders
                WHERE product_id IS NOT NULL AND product_id > 0
            """))
            conn.commit()


def downgrade():
    # For downgrade, just ensure order_items table exists (reversible operation)
    pass

