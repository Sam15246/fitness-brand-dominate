"""Add CouponCode model for flexible discount management.

Revision ID: 016
Revises: 015
Create Date: 2026-03-04

This migration:

1. Creates coupon_codes table
   - Supports multiple coupon types: affiliate, promotional, seasonal, loyalty
   - Flexible discount: percent-based or fixed amount
   - Usage tracking: current_uses and max_uses limits
   - Expiry support: optional expires_at timestamp
   - Audit trail: created_by_user_id and timestamps

2. Updates orders table
   - Adds coupon_id FK to coupon_codes table
   - Adds applied_discount (actual discount amount in paise)
   - Adds discount_type (affiliate, promotional, seasonal, loyalty)
   - Maintains backward compatibility (all nullable)

BUSINESS LOGIC:
- Each coupon is unique (UNIQUE constraint on code column)
- Discount: either percent OR fixed amount (CHECK constraint)
- Usage limits: can be unlimited (NULL) or capped
- Expiry: optional, no expire = never expires
- Affiliate coupons: link to affiliate user via affiliate_id
- Promotional coupons: affiliate_id = NULL

COMMISSION CALCULATION CHANGE:
- Commission now calculated on actual revenue (after discount) - Option A
- Database-level: handled in Order.confirm_order() method
- Formula: commission = (subtotal - discount) * (commission_percent / 100)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Create coupon_codes table
    op.create_table(
        'coupon_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('discount_percent', sa.Integer(), nullable=True),
        sa.Column('discount_amount_fixed', sa.Integer(), nullable=True),
        sa.Column('coupon_type', sa.String(20), nullable=False, default='promotional', index=True),
        sa.Column('affiliate_id', sa.Integer(), nullable=True, index=True),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('current_uses', sa.Integer(), nullable=False, default=0),
        sa.Column('min_order_value', sa.Integer(), nullable=False, default=0),
        sa.Column('max_discount', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, index=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['affiliate_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('(discount_percent IS NOT NULL OR discount_amount_fixed IS NOT NULL)', name='ck_coupon_has_discount'),
        sa.CheckConstraint('discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)', name='ck_coupon_percent_valid'),
        sa.CheckConstraint('discount_amount_fixed IS NULL OR discount_amount_fixed >= 0', name='ck_coupon_fixed_non_negative'),
        sa.CheckConstraint('max_uses IS NULL OR max_uses > 0', name='ck_coupon_max_uses_positive'),
        sa.CheckConstraint('current_uses >= 0', name='ck_coupon_current_uses_non_negative'),
        sa.CheckConstraint('min_order_value >= 0', name='ck_coupon_min_order_non_negative'),
    )
    
    # Add columns to orders table
    orders_columns = {col['name'] for col in inspector.get_columns('orders')}
    
    if 'coupon_id' not in orders_columns:
        op.add_column('orders', sa.Column('coupon_id', sa.Integer(), nullable=True, index=True))
        op.create_foreign_key('fk_orders_coupon_id', 'orders', 'coupon_codes', ['coupon_id'], ['id'])
    
    if 'applied_discount' not in orders_columns:
        op.add_column('orders', sa.Column('applied_discount', sa.Integer(), nullable=False, server_default='0'))
    
    if 'discount_type' not in orders_columns:
        op.add_column('orders', sa.Column('discount_type', sa.String(20), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if columns exist before dropping them
    orders_columns = {col['name'] for col in inspector.get_columns('orders')}
    
    if 'coupon_id' in orders_columns:
        op.drop_constraint('fk_orders_coupon_id', 'orders', type_='foreignkey')
        op.drop_column('orders', 'coupon_id')
    
    if 'applied_discount' in orders_columns:
        op.drop_column('orders', 'applied_discount')
    
    if 'discount_type' in orders_columns:
        op.drop_column('orders', 'discount_type')
    
    op.drop_table('coupon_codes')
