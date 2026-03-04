"""Increase order_number column length to accommodate format.

Revision ID: 008
Revises: 007
Create Date: 2026-02-28

ISSUE:
======
Order numbers follow format: ORD-YYYYMMDDHHMMSS-XXXXXX (25 characters)
But column was VARCHAR(20), causing StringDataRightTruncation error

SOLUTION:
=========
Increase order_number column to VARCHAR(30) for safety margin

SAFE TO RUN:
============
- Existing data unchanged (all order_numbers < 30 chars)
- Just increases max length
- No data loss risk
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    """Increase order_number column from VARCHAR(20) to VARCHAR(30)."""
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        return

    # PostgreSQL syntax (works on production)
    op.alter_column(
        'orders',
        'order_number',
        type_=sa.String(30),
        existing_type=sa.String(20),
        existing_nullable=False,
        existing_server_default=None
    )


def downgrade():
    """Revert order_number column back to VARCHAR(20)."""
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        return

    # Note: This could fail if any order_numbers are > 20 chars
    op.alter_column(
        'orders',
        'order_number',
        type_=sa.String(20),
        existing_type=sa.String(30),
        existing_nullable=False,
        existing_server_default=None
    )
