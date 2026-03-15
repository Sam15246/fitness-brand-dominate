"""Enforce variant integrity on cart and order items.

Revision ID: 020
Revises: 019
Create Date: 2026-03-15

STEP SCOPE:
- Enforce NOT NULL on cart_items.variant_id
- Enforce NOT NULL on order_items.variant_id
- Replace cart uniqueness from (user_id, product_id) to (user_id, variant_id)

This migration includes safety checks and will fail fast if nullable backfill is incomplete.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def _get_scalar(conn, query):
    return conn.execute(sa.text(query)).scalar()


def _unique_names(inspector, table_name):
    return {u['name'] for u in inspector.get_unique_constraints(table_name) if u.get('name')}


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    cart_nulls = _get_scalar(conn, "SELECT COUNT(*) FROM cart_items WHERE variant_id IS NULL")
    order_item_nulls = _get_scalar(conn, "SELECT COUNT(*) FROM order_items WHERE variant_id IS NULL")

    if cart_nulls and int(cart_nulls) > 0:
        raise RuntimeError(f'Cannot enforce cart_items.variant_id NOT NULL; found {cart_nulls} NULL rows')

    if order_item_nulls and int(order_item_nulls) > 0:
        raise RuntimeError(f'Cannot enforce order_items.variant_id NOT NULL; found {order_item_nulls} NULL rows')

    # Enforce NOT NULL on order_items.variant_id
    with op.batch_alter_table('order_items') as batch_op:
        batch_op.alter_column('variant_id', existing_type=sa.Integer(), nullable=False)

    # Enforce NOT NULL + unique contract on cart_items
    current_uniques = _unique_names(inspector, 'cart_items')
    with op.batch_alter_table('cart_items') as batch_op:
        batch_op.alter_column('variant_id', existing_type=sa.Integer(), nullable=False)

        if 'uq_user_product_cart' in current_uniques:
            batch_op.drop_constraint('uq_user_product_cart', type_='unique')

        # Re-check names in case it already exists from prior runs
        if 'uq_user_variant_cart' not in current_uniques:
            batch_op.create_unique_constraint('uq_user_variant_cart', ['user_id', 'variant_id'])


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    current_uniques = _unique_names(inspector, 'cart_items')

    with op.batch_alter_table('cart_items') as batch_op:
        if 'uq_user_variant_cart' in current_uniques:
            batch_op.drop_constraint('uq_user_variant_cart', type_='unique')

        if 'uq_user_product_cart' not in current_uniques:
            batch_op.create_unique_constraint('uq_user_product_cart', ['user_id', 'product_id'])

        batch_op.alter_column('variant_id', existing_type=sa.Integer(), nullable=True)

    with op.batch_alter_table('order_items') as batch_op:
        batch_op.alter_column('variant_id', existing_type=sa.Integer(), nullable=True)
