"""Refactor orders to standards-compliant multi-item model.

Revision ID: 006
Revises: add_cart_items_005
Create Date: 2026-02-28

This migration:
1. Creates order_items table for line items
2. Removes product_id, quantity, total_price from orders table
3. Maintains data integrity for existing orders

IDEMPOTENT: Safe to run multiple times (checks for existing tables/columns)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '006'
down_revision = 'add_cart_items_005'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Create order_items table (only if it doesn't exist)
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
    
    # Check if orders table still has old columns
    orders_columns = [col['name'] for col in inspector.get_columns('orders')]
    
    if 'product_id' in orders_columns:
        # Drop constraints first (only if they exist)
        try:
            op.drop_constraint('ck_orders_quantity_positive', 'orders', type_='check')
        except Exception:
            pass  # Constraint might not exist
        
        try:
            op.drop_constraint('ck_orders_total_price_positive', 'orders', type_='check')
        except Exception:
            pass
        
        # Drop foreign key to products (only if it exists)
        try:
            op.drop_constraint('orders_product_id_fkey', 'orders', type_='foreignkey')
        except Exception:
            pass
        
        # Drop columns (only if they exist)
        if 'product_id' in orders_columns:
            op.drop_column('orders', 'product_id')
        if 'quantity' in orders_columns:
            op.drop_column('orders', 'quantity')
        if 'total_price' in orders_columns:
            op.drop_column('orders', 'total_price')


def downgrade():
    # Add columns back to orders table
    op.add_column('orders', sa.Column('total_price', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('orders', sa.Column('product_id', sa.Integer(), nullable=False, server_default='0'))
    
    # Re-add foreign key
    op.create_foreign_key('orders_product_id_fkey', 'orders', 'products', ['product_id'], ['id'])
    
    # Re-add constraints
    op.create_check_constraint('ck_orders_quantity_positive', 'orders', 'quantity > 0')
    op.create_check_constraint('ck_orders_total_price_positive', 'orders', 'total_price > 0')
    
    # Drop order_items table
    op.drop_index(op.f('ix_order_items_product_id'), table_name='order_items')
    op.drop_index(op.f('ix_order_items_order_id'), table_name='order_items')
    op.drop_table('order_items')
