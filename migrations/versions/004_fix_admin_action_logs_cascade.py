"""Fix AdminActionLog FK constraint to allow NULL admin_id for deleted admins.

Revision ID: fix_admin_logs_nullable_004
Revises: create_review_table_003
Create Date: 2026-02-27

ISSUE: admin_id column needs to be nullable to allow SET NULL on deletion.
SOLUTION: Use batch mode for SQLite compatibility.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'fix_admin_logs_nullable_004'
down_revision = 'create_review_table_003'
branch_labels = None
depends_on = None


def upgrade():
    """Modify admin_id to be NULLABLE using batch mode."""
    conn = op.get_bind()
    dialect_name = conn.dialect.name
    
    if dialect_name == 'sqlite':
        with op.batch_alter_table('admin_action_logs', schema=None) as batch_op:
            try:
                batch_op.alter_column('admin_id', existing_type=sa.Integer(), nullable=True)
            except Exception:
                pass
    else:
        try:
            op.alter_column('admin_action_logs', 'admin_id', existing_type=sa.Integer(), nullable=True)
        except Exception:
            pass


def downgrade():
    """Revert admin_id to NOT NULL."""
    conn = op.get_bind()
    dialect_name = conn.dialect.name
    
    if dialect_name == 'sqlite':
        with op.batch_alter_table('admin_action_logs', schema=None) as batch_op:
            try:
                batch_op.alter_column('admin_id', existing_type=sa.Integer(), nullable=False)
            except Exception:
                pass
    else:
        try:
            op.alter_column('admin_action_logs', 'admin_id', existing_type=sa.Integer(), nullable=False)
        except Exception:
            pass


