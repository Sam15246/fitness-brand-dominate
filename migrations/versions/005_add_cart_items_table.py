"""Add CartItem table for persistent user carts.

Revision ID: add_cart_items_005
Revises: fix_admin_action_logs_cascade
Create Date: 2026-02-28

This migration creates the cart_items table for persistent cart storage:
- id: Primary key
- user_id: Foreign key to User
- product_id: Foreign key to Product
- quantity: Number of items (>0)
- created_at: When item was added
- updated_at: When quantity was last changed

CART PERSISTENCE SYSTEM:
- Logged-in users: Cart stored in DB (persists across sessions/devices)
- Guest users: Cart stored in session (temporary)
- Unique constraint: one row per product per user
- Automatically cleared on checkout or explicit removal

MIGRATION SAFETY:
- New table (no data loss)
- Foreign key constraints to users and products
- Check constraint on quantity (> 0)
- Unique constraint prevents duplicate entries
- Indexed columns for performance
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic
revision = 'add_cart_items_005'
down_revision = 'fix_admin_logs_nullable_004'
branch_labels = None
depends_on = None


def upgrade():
    """Create cart_items table."""
    # Check if table already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'cart_items' not in inspector.get_table_names():
        op.create_table(
            'cart_items',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.CheckConstraint('quantity > 0', name='ck_cart_quantity_positive'),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'product_id', name='uq_user_product_cart')
        )
        # Create indexes
        with op.batch_alter_table('cart_items', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_cart_items_user_id'), ['user_id'], unique=False)
            batch_op.create_index(batch_op.f('ix_cart_items_product_id'), ['product_id'], unique=False)


def downgrade():
    """Drop cart_items table."""
    with op.batch_alter_table('cart_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_cart_items_product_id'))
        batch_op.drop_index(batch_op.f('ix_cart_items_user_id'))
    
    op.drop_table('cart_items')
