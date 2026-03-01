"""Create Payment model for transaction tracking.

Revision ID: 013
Revises: 012
Create Date: 2026-03-01

Payment model separates payment lifecycle from order lifecycle:
1. Order = customer's purchase (what they bought)
2. Payment = financial transaction (how they paid)

This enables:
1. Multiple payment attempts for same order
2. Partial payments / installments (future)
3. Easy payment gateway integration (Razorpay, Stripe)
4. Clear audit trail of all payment attempts
5. Refund tracking

CURRENT STATE:
- gateway = "whatsapp_manual" (no automated payment)
- status = "pending" initially
- Automates when admin confirms order

FUTURE:
- gateway = "razorpay", "stripe"
- Multiple payment methods per order
- Partial refunds tracked separately
- Payment reconciliation reports

SCALABILITY:
- raw_response stores full API response (for debugging)
- transaction_id from payment gateway (for reconciliation)
- currency field ready for international orders
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Only create table if it doesn't exist (idempotent)
    if 'payments' not in inspector.get_table_names():
        op.create_table(
            'payments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('order_id', sa.Integer(), nullable=False),
            sa.Column('gateway', sa.String(50), nullable=True, comment='Payment gateway (whatsapp_manual, razorpay, stripe, etc)'),
            sa.Column('transaction_id', sa.String(100), nullable=True, comment='Unique ID from payment gateway'),
            sa.Column('amount', sa.Integer(), nullable=False, comment='Amount in paise'),
            sa.Column('currency', sa.String(3), nullable=False, default='INR', comment='ISO 4217 currency code'),
            sa.Column('status', sa.String(20), nullable=False, default='pending', comment='pending, completed, failed, cancelled'),
            sa.Column('raw_response', sa.Text(), nullable=True, comment='Full API response (JSON)'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.Column('paid_at', sa.DateTime(), nullable=True, comment='When payment was successfully completed'),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('transaction_id', name='uq_payments_transaction_id'),
        )
        
        # Indexes for common queries
        op.create_index('ix_payments_order_id', 'payments', ['order_id'])
        op.create_index('ix_payments_status', 'payments', ['status'])
        op.create_index('ix_payments_gateway', 'payments', ['gateway'])
        op.create_index('ix_payments_created_at', 'payments', ['created_at'])


def downgrade():
    op.drop_table('payments')
