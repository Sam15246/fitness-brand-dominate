"""
Add password reset fields to users table.

Revision ID: 017
Revises: 016
Create Date: 2026-03-06

FIELDS ADDED:
=============
- reset_token: VARCHAR(500) - Cryptographically signed token (nullable, unique)
- reset_expires: DATETIME - Expiration timestamp (nullable)

SECURITY DESIGN:
================
- Token is URL-safe and tamper-proof (itsdangerous library)
- Expires in 24 hours (configurable)
- Single-use (cleared after password reset)
- Null when no reset pending
- Unique constraint prevents token reuse
- Indexed for fast lookups during verification

MIGRATION SAFETY:
=================
- Nullable fields (no data loss on existing users)
- Indexes added for performance
- Rollback supported (downgrade removes fields)
- No data migration needed (fields start as NULL)
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add password reset fields to users table.
    
    UPGRADE STEPS:
    1. Add reset_token column (nullable, unique, indexed)
    2. Add reset_expires column (nullable, indexed)
    3. Create unique index on reset_token (prevent duplicate tokens)
    4. Create index on reset_expires (fast expiry checks)
    """
    # Add reset_token column
    op.add_column('users', sa.Column('reset_token', sa.String(500), nullable=True))
    
    # Add reset_expires column
    op.add_column('users', sa.Column('reset_expires', sa.DateTime(), nullable=True))
    
    # Create unique index on reset_token (ensures token uniqueness)
    op.create_index(
        'ix_users_reset_token',
        'users',
        ['reset_token'],
        unique=True
    )
    
    # Create index on reset_expires (fast expiry lookups)
    op.create_index(
        'ix_users_reset_expires',
        'users',
        ['reset_expires'],
        unique=False
    )


def downgrade():
    """
    Remove password reset fields from users table.
    
    DOWNGRADE STEPS:
    1. Drop indexes
    2. Drop columns
    
    WARNING: This will delete any pending password reset tokens.
    Users with pending resets will need to request new tokens.
    """
    # Drop indexes first
    op.drop_index('ix_users_reset_expires', table_name='users')
    op.drop_index('ix_users_reset_token', table_name='users')
    
    # Drop columns
    op.drop_column('users', 'reset_expires')
    op.drop_column('users', 'reset_token')
