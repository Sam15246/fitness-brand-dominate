"""Add is_coming_soon flag to products.

Revision ID: 027
Revises: 026
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '027'
down_revision = '026'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('products')]

    if 'is_coming_soon' not in columns:
        op.add_column('products', sa.Column('is_coming_soon', sa.Boolean(), server_default='false', nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('products')]

    if 'is_coming_soon' in columns:
        op.drop_column('products', 'is_coming_soon')
