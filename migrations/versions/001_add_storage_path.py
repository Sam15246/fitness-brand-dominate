"""Add storage_path to ProductImage for pluggable storage architecture.

Revision ID: add_storage_path_001
Revises: (previous migration)
Create Date: 2024-02-21

This migration adds the storage_path column to ProductImage table
to support the new pluggable storage system (local or R2).

The storage_path is backend-specific:
- LocalStorage: Same as image_path (relative path)
- R2Storage: Bucket key (for deletion)

MIGRATION SAFETY:
- Sets default to NULL (safe for existing records)
- Can be populated gradually
- Backwards compatible
- No downtime required
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = 'add_storage_path_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add storage_path column to product_images table."""
    # Check if column already exists before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'storage_path' not in [c['name'] for c in inspector.get_columns('product_images')]:
        # Add nullable column (safe for existing records)
        op.add_column(
            'product_images',
            sa.Column('storage_path', sa.String(500), nullable=True)
        )
        
        # Populate storage_path with image_path for existing images
        # (LocalStorage uses image_path as storage key)
        op.execute(
            "UPDATE product_images SET storage_path = image_path WHERE storage_path IS NULL"
        )


def downgrade():
    """Remove storage_path column from product_images table."""
    op.drop_column('product_images', 'storage_path')
