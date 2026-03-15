"""Backfill default variants and populate variant references.

Revision ID: 019
Revises: 018
Create Date: 2026-03-15

STEP 2 SCOPE:
- Create one default variant for products missing variants
- Backfill cart_items.variant_id from product_id
- Backfill order_items.variant_id from product_id
- Backfill order_items.variant_snapshot from product_variants.option_values

This migration intentionally does NOT enforce NOT NULL yet.
Enforcement should be done only after production verification.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from datetime import datetime


revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def _to_json_payload(conn, payload):
    """Return JSON payload compatible with current SQL dialect."""
    # JSON columns in both SQLite and PostgreSQL accept plain JSON strings.
    return payload


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    table_names = set(inspector.get_table_names())
    if 'product_variants' not in table_names:
        raise RuntimeError('product_variants table is required before running revision 019')

    # 1) Create default variants for products that do not have one yet.
    products = conn.execute(
        sa.text(
            """
            SELECT p.id, p.price, p.stock_quantity, p.weight_grams, p.is_active
            FROM products p
            WHERE NOT EXISTS (
                SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id
            )
            """
        )
    ).fetchall()

    now = datetime.utcnow()
    for product in products:
        fallback_sku = f"PV-{product.id}-DEFAULT"

        conn.execute(
            sa.text(
                """
                INSERT INTO product_variants (
                    product_id,
                    sku,
                    option_values,
                    price_override,
                    stock_quantity,
                    weight_grams,
                    is_active,
                    created_at
                ) VALUES (
                    :product_id,
                    :sku,
                    :option_values,
                    :price_override,
                    :stock_quantity,
                    :weight_grams,
                    :is_active,
                    :created_at
                )
                """
            ),
            {
                'product_id': product.id,
                'sku': fallback_sku,
                'option_values': _to_json_payload(conn, '{}'),
                'price_override': product.price,
                'stock_quantity': product.stock_quantity,
                'weight_grams': product.weight_grams,
                'is_active': product.is_active,
                'created_at': now,
            },
        )

    # 2) Backfill cart_items.variant_id for legacy rows.
    conn.execute(
        sa.text(
            """
            UPDATE cart_items
            SET variant_id = (
                SELECT pv.id
                FROM product_variants pv
                WHERE pv.product_id = cart_items.product_id
                ORDER BY pv.id ASC
                LIMIT 1
            )
            WHERE variant_id IS NULL
            """
        )
    )

    # 3) Backfill order_items.variant_id for legacy rows.
    conn.execute(
        sa.text(
            """
            UPDATE order_items
            SET variant_id = (
                SELECT pv.id
                FROM product_variants pv
                WHERE pv.product_id = order_items.product_id
                ORDER BY pv.id ASC
                LIMIT 1
            )
            WHERE variant_id IS NULL
            """
        )
    )

    # 4) Backfill variant snapshot from resolved variant.
    conn.execute(
        sa.text(
            """
            UPDATE order_items
            SET variant_snapshot = (
                SELECT pv.option_values
                FROM product_variants pv
                WHERE pv.id = order_items.variant_id
            )
            WHERE variant_id IS NOT NULL
              AND variant_snapshot IS NULL
            """
        )
    )


def downgrade():
    conn = op.get_bind()

    # Rollback only the backfilled references. Keep variants table/rows intact to avoid destructive data loss.
    conn.execute(sa.text("UPDATE cart_items SET variant_id = NULL"))
    conn.execute(sa.text("UPDATE order_items SET variant_snapshot = NULL"))
    conn.execute(sa.text("UPDATE order_items SET variant_id = NULL"))
