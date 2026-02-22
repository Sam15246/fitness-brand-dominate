"""Create Review table for admin-controlled product reviews.

Revision ID: create_review_table_003
Revises: add_pricing_fields_002
Create Date: 2026-02-22

This migration creates the Review table with the following fields:
- id: Primary key
- product_id: Foreign key to Product
- name: Reviewer name (e.g., "Rahul Sharma")
- role: Reviewer role (e.g., "Fitness Coach", "Powerlifter")
- rating: 1-5 star rating
- title: Optional short headline
- comment: Review text
- is_approved: Admin approval toggle (True by default)
- created_at / updated_at: Timestamps

REVIEW SYSTEM:
- Admin-controlled (users cannot submit reviews yet)
- Future: Enable customer submissions with approval workflow
- Approved reviews only displayed (is_approved = True)
- Average rating auto-calculated

MIGRATION SAFETY:
- New table (no data loss)
- Foreign key constraint to products table
- Check constraint on rating (1-5 range)
- Indexed columns for performance
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic
revision = 'create_review_table_003'
down_revision = 'add_pricing_fields_002'
branch_labels = None
depends_on = None


def upgrade():
    """Create reviews table."""
    # Check if table already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'reviews' not in inspector.get_table_names():
        op.create_table(
            'reviews',
            sa.Column('id', sa.Integer, nullable=False),
            sa.Column('product_id', sa.Integer, nullable=False),
            sa.Column('name', sa.String(120), nullable=False),
            sa.Column('role', sa.String(100), nullable=True),
            sa.Column('rating', sa.Integer, nullable=False),
            sa.Column('title', sa.String(150), nullable=True),
            sa.Column('comment', sa.Text, nullable=False),
            sa.Column('is_approved', sa.Boolean, nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.current_timestamp()),
            sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.current_timestamp()),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_reviews_rating_range')
        )
        
        # Create indexes for performance
        op.create_index(op.f('ix_reviews_product_id'), 'reviews', ['product_id'], unique=False)
        op.create_index(op.f('ix_reviews_is_approved'), 'reviews', ['is_approved'], unique=False)
        op.create_index(op.f('ix_reviews_created_at'), 'reviews', ['created_at'], unique=False)


def downgrade():
    """Drop reviews table."""
    op.drop_index(op.f('ix_reviews_created_at'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_is_approved'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_product_id'), table_name='reviews')
    op.drop_table('reviews')
