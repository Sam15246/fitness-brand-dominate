"""create product_image_variants junction table for many-to-many image-variant linkage

Revision ID: 032_create_product_image_variants_junction
Revises: 031_add_variant_pricing_fields
Create Date: 2026-05-19 00:00:00.000000

PURPOSE:
========
Enable images to be linked to multiple variants.
- One image can be assigned to many variants (e.g., a hero shot for all sizes)
- One variant can have many images (e.g., product photos)
- Images without variant linkage (variant_id IS NULL) are "general" images

SCHEMA:
=======
product_image_variants (
  id: PK
  product_image_id: FK → product_images.id (CASCADE delete)
  product_variant_id: FK → product_variants.id (CASCADE delete)
  created_at: timestamp
)

Composite unique constraint: (product_image_id, product_variant_id)
Indexes: product_image_id, product_variant_id for query performance
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '032_create_product_image_variants_junction'
down_revision = '031_add_variant_pricing_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Create junction table
    op.create_table(
        'product_image_variants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_image_id', sa.Integer(), nullable=False),
        sa.Column('product_variant_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['product_image_id'], ['product_images.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_variant_id'], ['product_variants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_image_id', 'product_variant_id', name='uq_product_image_variant'),
    )
    
    # Create indexes for query performance
    op.create_index('idx_product_image_id', 'product_image_variants', ['product_image_id'])
    op.create_index('idx_product_variant_id', 'product_image_variants', ['product_variant_id'])


def downgrade():
    op.drop_index('idx_product_variant_id', table_name='product_image_variants')
    op.drop_index('idx_product_image_id', table_name='product_image_variants')
    op.drop_table('product_image_variants')
