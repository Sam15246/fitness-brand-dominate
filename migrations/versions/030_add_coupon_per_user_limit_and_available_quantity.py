"""add coupon per-user limit and make available_quantity derived

Revision ID: 030_add_coupon_per_user_limit_and_available_quantity
Revises: 027
Create Date: 2026-05-16 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '030_add_coupon_per_user_limit_and_available_quantity'
down_revision = '027'
branch_labels = None
depends_on = None


def upgrade():
    # Add per_user_limit column to coupon_codes
    op.add_column('coupon_codes', sa.Column('per_user_limit', sa.Integer(), nullable=True))
    # No DB-level change for available_quantity: computed at runtime


def downgrade():
    op.drop_column('coupon_codes', 'per_user_limit')
