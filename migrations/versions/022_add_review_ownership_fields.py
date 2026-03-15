"""Add review ownership fields for authentic customer review support.

Revision ID: 022
Revises: 021
Create Date: 2026-03-15

Phase 4A schema scope:
- Add nullable reviews.user_id FK
- Add nullable reviews.order_item_id FK
- Add indexes for both new columns

Existing admin-managed testimonials remain valid with NULL ownership fields.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    dialect = conn.dialect.name

    review_columns = {c['name'] for c in inspector.get_columns('reviews')}

    if 'user_id' not in review_columns:
        op.add_column('reviews', sa.Column('user_id', sa.Integer(), nullable=True))
        op.create_index('ix_reviews_user_id', 'reviews', ['user_id'], unique=False)
        if dialect != 'sqlite':
            op.create_foreign_key(
                'fk_reviews_user_id',
                'reviews',
                'users',
                ['user_id'],
                ['id'],
            )

    if 'order_item_id' not in review_columns:
        op.add_column('reviews', sa.Column('order_item_id', sa.Integer(), nullable=True))
        op.create_index('ix_reviews_order_item_id', 'reviews', ['order_item_id'], unique=False)
        if dialect != 'sqlite':
            op.create_foreign_key(
                'fk_reviews_order_item_id',
                'reviews',
                'order_items',
                ['order_item_id'],
                ['id'],
            )


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    dialect = conn.dialect.name

    review_columns = {c['name'] for c in inspector.get_columns('reviews')}
    review_indexes = {ix['name'] for ix in inspector.get_indexes('reviews')}
    review_fks = {fk['name'] for fk in inspector.get_foreign_keys('reviews') if fk.get('name')}

    if 'order_item_id' in review_columns:
        if 'ix_reviews_order_item_id' in review_indexes:
            op.drop_index('ix_reviews_order_item_id', table_name='reviews')
        if dialect != 'sqlite' and 'fk_reviews_order_item_id' in review_fks:
            op.drop_constraint('fk_reviews_order_item_id', 'reviews', type_='foreignkey')
        op.drop_column('reviews', 'order_item_id')

    if 'user_id' in review_columns:
        if 'ix_reviews_user_id' in review_indexes:
            op.drop_index('ix_reviews_user_id', table_name='reviews')
        if dialect != 'sqlite' and 'fk_reviews_user_id' in review_fks:
            op.drop_constraint('fk_reviews_user_id', 'reviews', type_='foreignkey')
        op.drop_column('reviews', 'user_id')
