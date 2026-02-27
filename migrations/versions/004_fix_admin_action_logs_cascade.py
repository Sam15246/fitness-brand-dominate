"""Fix AdminActionLog FK constraint to allow NULL admin_id for deleted admins.

Revision ID: fix_admin_logs_nullable_004
Revises: create_review_table_003
Create Date: 2026-02-27

ISSUE DESCRIPTION:
==================
When deleting an admin user, orphaned admin_action_logs records cause a constraint
violation because:
- admin_id column has NOT NULL constraint
- FK was using default SET NULL behavior (attempting to set admin_id = NULL)
- Database rejects NULL on NOT NULL column (psycopg2.errors.NotNullViolation)

SOLUTION:
=========
Change admin_id column to be NULLABLE (nullable=True), allowing SET NULL behavior.
When an admin user is deleted, their action logs remain with admin_id = NULL.

Why this is better than CASCADE:
- Preserves audit trail for compliance (GDPR, SOX, etc.)
- Enables forensic investigation of deleted admins' actions
- Maintains data integrity and accountability
- Logs show "(deleted admin)" for investigation purposes
- Follows security best practices for immutable audit logs

MIGRATION SAFETY:
- Idempotent: Safely handles already-fixed databases
- No data loss (we preserve all logs)
- No downtime required
- Backwards compatible
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = 'fix_admin_logs_nullable_004'
down_revision = 'create_review_table_003'
branch_labels = None
depends_on = None


def upgrade():
    """Modify admin_id to be NULLABLE in admin_action_logs."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get existing columns to check if already nullable
    columns = inspector.get_columns('admin_action_logs')
    admin_id_col = next((c for c in columns if c['name'] == 'admin_id'), None)
    
    # Only modify if it's currently NOT NULL
    if admin_id_col and not admin_id_col['nullable']:
        # Alter column to be nullable
        op.alter_column(
            'admin_action_logs',
            'admin_id',
            existing_type=sa.Integer(),
            nullable=True
        )
        print("Modified admin_id column to be nullable")
    
    # Get existing foreign keys on admin_action_logs
    try:
        fks = inspector.get_foreign_keys('admin_action_logs')
        
        # Find and drop the old FK constraint
        for fk in fks:
            if fk['constrained_columns'] == ['admin_id']:
                # Drop the existing constraint
                op.drop_constraint(fk['name'], 'admin_action_logs', type_='foreignkey')
                print(f"Dropped existing FK constraint: {fk['name']}")
                break
    except Exception as e:
        print(f"Note: Could not inspect existing FKs: {e}")
    
    # Create new FK with SET NULL (preserves audit trail)
    op.create_foreign_key(
        'fk_admin_action_logs_admin_id_users',
        'admin_action_logs',
        'users',
        ['admin_id'],
        ['id'],
        ondelete='SET NULL'
    )
    print("Created new FK with SET NULL: fk_admin_action_logs_admin_id_users")


def downgrade():
    """Revert to NOT NULL constraint."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Drop the SET NULL FK
    try:
        fks = inspector.get_foreign_keys('admin_action_logs')
        for fk in fks:
            if fk['constrained_columns'] == ['admin_id']:
                op.drop_constraint(fk['name'], 'admin_action_logs', type_='foreignkey')
                break
    except Exception as e:
        print(f"Note: Could not drop FK: {e}")
    
    # Recreate with NOT NULL
    op.alter_column(
        'admin_action_logs',
        'admin_id',
        existing_type=sa.Integer(),
        nullable=False
    )
    
    op.create_foreign_key(
        'fk_admin_action_logs_admin_id_users',
        'admin_action_logs',
        'users',
        ['admin_id'],
        ['id']
    )

