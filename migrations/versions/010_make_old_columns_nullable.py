"""Fix: Make old order columns nullable to allow new ORDER_ITEMS workflow.

Revision ID: 010
Revises: 009
Create Date: 2026-03-01

This migration makes product_id, quantity, total_price nullable in orders table.
These columns are kept for historical data but new orders won't use them.

IDEMPOTENT: Safe to run multiple times
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    orders_columns = [col['name'] for col in inspector.get_columns('orders')]
    
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # But first, let's try a simpler approach: just handle the NOT NULL constraint
    
    if 'product_id' in orders_columns:
        # For SQLite: We can't use ALTER COLUMN, so we'll use raw SQL
        # SQLite requires rebuilding the table to change constraints
        
        # Step 1: Rename old table
        conn.execute(text("ALTER TABLE orders RENAME TO orders_old"))
        conn.commit()
        
        # Step 2: Create new table with nullable columns
        conn.execute(text("""
            CREATE TABLE orders (
                id INTEGER NOT NULL,
                order_number VARCHAR(30) NOT NULL UNIQUE,
                user_id INTEGER,
                affiliate_id INTEGER,
                guest_name VARCHAR(120) NOT NULL,
                guest_phone VARCHAR(20) NOT NULL,
                guest_email VARCHAR(120) NOT NULL,
                city VARCHAR(100) NOT NULL,
                state VARCHAR(100) NOT NULL,
                pincode VARCHAR(6) NOT NULL,
                address TEXT NOT NULL,
                product_id INTEGER,
                quantity INTEGER,
                total_price INTEGER,
                commission_amount INTEGER NOT NULL DEFAULT 0,
                commission_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                shipping_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                tracking_number VARCHAR(100),
                courier_name VARCHAR(50),
                shipping_cost INTEGER,
                created_at DATETIME,
                updated_at DATETIME,
                confirmed_at DATETIME,
                shipped_at DATETIME,
                delivered_at DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(affiliate_id) REFERENCES users(id),
                CHECK (commission_amount >= 0)
            )
        """))
        conn.commit()
        
        # Step 3: Copy data from old table
        conn.execute(text("""
            INSERT INTO orders SELECT * FROM orders_old
        """))
        conn.commit()
        
        # Step 4: Drop old table
        conn.execute(text("DROP TABLE orders_old"))
        conn.commit()


def downgrade():
    # Just rollback to previous state - can't really undo SQLite table rebuild
    pass
