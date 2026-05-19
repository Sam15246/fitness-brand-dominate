"""add variant-level MRP and discount fields

Revision ID: 031_add_variant_pricing_fields
Revises: 030_add_coupon_per_user_limit_and_available_quantity
Create Date: 2026-05-19 00:00:00.000000

PURPOSE:
========
Enable per-variant pricing override beyond price_override.
- price_original: MRP (original/list price) for the variant
- price_discounted: Discounted price for the variant
- is_discount_active: Toggle discount for the variant

DESIGN:
- All fields nullable
- If NULL, variant uses product-level pricing
- If set, overrides product-level pricing
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '031_add_variant_pricing_fields'
down_revision = '030_add_coupon_per_user_limit_and_available_quantity'
branch_labels = None
depends_on = None


def upgrade():
    # Add pricing fields to product_variants
    op.add_column('product_variants', sa.Column('price_original', sa.Integer(), nullable=True))
    op.add_column('product_variants', sa.Column('price_discounted', sa.Integer(), nullable=True))
    op.add_column('product_variants', sa.Column('is_discount_active', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column('product_variants', 'is_discount_active')
    op.drop_column('product_variants', 'price_discounted')
    op.drop_column('product_variants', 'price_original')
