"""Add smart pricing fields to Product model for discount management.

Revision ID: add_pricing_fields_002
Revises: add_storage_path_001
Create Date: 2026-02-22

This migration adds the following fields to Product table:
- price_original: Original MRP in paise
- price_discounted: Discounted price in paise
- is_discount_active: Boolean toggle for discount

PRICING LOGIC:
- If is_discount_active = True and price_discounted < price_original
- Then show discount badge with auto-calculated percentage
- Otherwise show only regular price

MIGRATION SAFETY:
- All new columns are nullable with defaults
- Existing products unaffected
- Backwards compatible
- No data loss
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = 'add_pricing_fields_002'
down_revision = 'add_storage_path_001'
branch_labels = None
depends_on = None


def upgrade():
    """Add pricing fields to products table."""
    # Add original price (nullable, optional for existing products)
    op.add_column(
        'products',
        sa.Column('price_original', sa.Integer, nullable=True)
    )
    
    # Add discounted price (nullable, optional for existing products)
    op.add_column(
        'products',
        sa.Column('price_discounted', sa.Integer, nullable=True)
    )
    
    # Add discount active toggle (default False for existing products)
    op.add_column(
        'products',
        sa.Column('is_discount_active', sa.Boolean, nullable=False, server_default='0')
    )


def downgrade():
    """Remove pricing fields from products table."""
    op.drop_column('products', 'price_original')
    op.drop_column('products', 'price_discounted')
    op.drop_column('products', 'is_discount_active')
