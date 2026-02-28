"""Add ProductCategory model with hierarchical support.

Revision ID: 007
Revises: 006
Create Date: 2026-02-28

This migration adds:
1. product_categories table with self-referencing FK for nested categories
2. category_id FK to products table
3. Supports unlimited nesting depth (BARS > Pull-Up Bars > Wall Mounted)

MIGRATION SAFETY:
- New table (no data loss)
- category_id is nullable (existing products unaffected)
- Can assign categories post-migration

IDEMPOTENT: Safe to run multiple times (checks for existing tables/columns)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Create product_categories table (only if it doesn't exist)
    if 'product_categories' not in inspector.get_table_names():
        op.create_table(
            'product_categories',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('slug', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('parent_id', sa.Integer(), nullable=True),
            sa.Column('icon', sa.String(length=50), nullable=True),
            sa.Column('display_order', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['parent_id'], ['product_categories.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint('display_order >= 0', name='ck_category_display_order_non_negative'),
        )
        
        # Create indexes
        op.create_index(op.f('ix_product_categories_slug'), 'product_categories', ['slug'], unique=True)
        op.create_index(op.f('ix_product_categories_parent_id'), 'product_categories', ['parent_id'], unique=False)
        op.create_index(op.f('ix_product_categories_is_active'), 'product_categories', ['is_active'], unique=False)
    
    # Add category_id to products table (only if it doesn't exist)
    products_columns = [col['name'] for col in inspector.get_columns('products')]
    
    if 'category_id' not in products_columns:
        with op.batch_alter_table('products', schema=None) as batch_op:
            batch_op.add_column(sa.Column('category_id', sa.Integer(), nullable=True))
            batch_op.create_index(batch_op.f('ix_products_category_id'), ['category_id'], unique=False)
            batch_op.create_foreign_key('fk_products_category_id', 'product_categories', ['category_id'], ['id'])
    
    # OPTIONAL: Seed with default category (uncommit if you want)
    # from datetime import datetime
    # op.execute(
    #     f"""
    #     INSERT INTO product_categories (name, slug, description, parent_id, display_order, is_active, created_at, updated_at)
    #     VALUES ('Uncategorized', 'uncategorized', 'Products without assigned category', NULL, 999, 1, '{datetime.utcnow()}', '{datetime.utcnow()}')
    #     """
    # )


def downgrade():
    # Remove category_id from products
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_constraint('fk_products_category_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_products_category_id'))
        batch_op.drop_column('category_id')
    
    # Drop indexes
    op.drop_index(op.f('ix_product_categories_is_active'), table_name='product_categories')
    op.drop_index(op.f('ix_product_categories_parent_id'), table_name='product_categories')
    op.drop_index(op.f('ix_product_categories_slug'), table_name='product_categories')
    
    # Drop table
    op.drop_table('product_categories')
