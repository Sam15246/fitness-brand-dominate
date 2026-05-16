from datetime import datetime
import secrets
from urllib.parse import quote

from flask import Blueprint, current_app, session
from flask_login import current_user

from app.business_logic import AffiliateManager
from app.models import AffiliateProfile, CartItem, CouponCode, Order, OrderItem, OrderStatus, Product, ProductImage, ProductVariant, Review, ShippingStatus, UserRole, db
from app.routes.api_v1_auth import register_api_v1_auth_routes
from app.routes.api_v1_admin import register_api_v1_admin_routes
from app.routes.api_v1_affiliate_content import register_api_v1_affiliate_content_routes
from app.routes.api_v1_cart import register_api_v1_cart_routes
from app.routes.api_v1_checkout_orders import register_api_v1_checkout_order_routes
from app.routes.api_v1_common import api_error, api_success
from app.routes.api_v1_products import register_api_v1_product_routes
from app.routes.api_v1_users import register_api_v1_user_routes
from app.utils import send_order_confirmation_email
from app.utils.image_urls import resolve_image_thumbnail_url, resolve_image_url


api_v1_bp = Blueprint('api_v1', __name__)


def _serialize_product_image(image):
    return {
        'id': image.id,
        'path': image.image_path,
        'url': resolve_image_url(image.image_path),
        'thumbnail_url': resolve_image_thumbnail_url(image.image_path),
        'is_primary': bool(image.is_primary),
        'display_order': image.display_order,
    }


def _serialize_product_variant(variant):
    return {
        'id': variant.id,
        'sku': variant.sku,
        'option_values': variant.option_values or {},
        'price_override': variant.price_override,
        'effective_price': variant.get_effective_price(),
        'stock_quantity': variant.stock_quantity,
        'weight_grams': variant.get_effective_weight_grams(),
        'is_active': bool(variant.is_active),
    }


def _serialize_product_card(product):
    primary_image = ProductImage.get_primary_image(product.id)
    return {
        'id': product.id,
        'name': product.name,
        'slug': product.slug,
        'description': product.description,
        'price': product.price,
        'price_display': product.get_price_display(),
        'price_original': product.price_original,
        'price_discounted': product.price_discounted,
        'is_discount_active': bool(product.is_discount_active),
        'discount_percentage': product.get_discount_percentage(),
        'in_stock': product.is_in_stock(),
        'is_coming_soon': bool(getattr(product, 'is_coming_soon', False)),
        'stock_quantity': product.stock_quantity,
        'average_rating': product.get_average_rating(),
        'review_count': product.get_review_count(),
        'primary_image': _serialize_product_image(primary_image) if primary_image else None,
    }


def _serialize_review(review):
    return {
        'id': review.id,
        'name': review.name,
        'role': review.role,
        'rating': review.rating,
        'title': review.title,
        'comment': review.comment,
        'is_verified_purchase': review.is_verified_purchase(),
        'created_at': review.created_at.isoformat() + 'Z' if review.created_at else None,
    }


def _serialize_review_eligible_order_item(item):
    product_name = item.product.name if item.product else 'Product'
    delivered_at = item.order.delivered_at or item.order.updated_at or item.order.created_at
    return {
        'order_item_id': item.id,
        'order_number': item.order.order_number,
        'product_name': product_name,
        'quantity': item.quantity,
        'delivered_at': delivered_at.isoformat() + 'Z' if delivered_at else None,
    }


def _get_review_eligible_order_items(user_id, product_id, include_reviewed=False):
    if not user_id or not product_id:
        return []

    query = (
        OrderItem.query
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.user_id == user_id,
            OrderItem.product_id == product_id,
            Order.status != OrderStatus.CANCELLED.value,
            Order.shipping_status == ShippingStatus.DELIVERED.value,
        )
    )

    if not include_reviewed:
        query = (
            query
            .outerjoin(Review, Review.order_item_id == OrderItem.id)
            .filter(Review.id.is_(None))
        )

    return (
        query
        .order_by(Order.confirmed_at.desc(), Order.created_at.desc(), OrderItem.created_at.desc())
        .all()
    )


def _parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_bool(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _variant_label(variant):
    """Return a human-readable label for a variant, e.g. '200gm'."""
    if not variant:
        return None
    vals = variant.option_values or {}
    if vals:
        return ' / '.join(str(v) for v in vals.values())
    return variant.sku or None


def _resolve_unit_price(product, variant=None):
    if variant:
        return variant.get_effective_price()
    if product.is_discount_active and product.price_discounted and product.price_discounted > 0:
        return product.price_discounted
    return product.price


def _get_or_create_default_variant(product):
    if not product:
        return None

    variant = ProductVariant.query.filter_by(product_id=product.id, is_active=True).order_by(ProductVariant.id.asc()).first()
    if variant:
        return variant

    variant = ProductVariant.query.filter_by(product_id=product.id).order_by(ProductVariant.id.asc()).first()
    if variant:
        return variant

    sku_base = f'PV-{product.id}-DEFAULT'
    sku = sku_base
    suffix = 1
    while ProductVariant.query.filter_by(sku=sku).first():
        suffix += 1
        sku = f'{sku_base}-{suffix}'

    variant = ProductVariant(
        product_id=product.id,
        sku=sku,
        option_values={},
        price_override=product.price,
        stock_quantity=product.stock_quantity,
        weight_grams=product.weight_grams,
        is_active=product.is_active,
    )
    db.session.add(variant)
    db.session.flush()
    return variant


def _get_session_cart():
    cart = session.get('cart')
    if not isinstance(cart, dict):
        cart = {}
        session['cart'] = cart
    return cart


def _merge_session_cart_into_db(user):
    if not user:
        return

    session_cart = _get_session_cart()
    if not session_cart:
        return

    for key, quantity in session_cart.items():
        parts = str(key).split(':')
        product_id = _parse_int(parts[0], 0)
        variant_id_from_cart = _parse_int(parts[1] if len(parts) > 1 else '0', 0)
        qty = max(_parse_int(quantity, 0), 0)

        if product_id <= 0 or qty <= 0:
            continue

        product = db.session.get(Product, product_id)
        if not product or not product.is_active:
            continue

        if variant_id_from_cart > 0:
            variant = ProductVariant.query.filter_by(
                id=variant_id_from_cart, product_id=product.id, is_active=True
            ).first()
            if not variant:
                variant = _get_or_create_default_variant(product)
        else:
            variant = _get_or_create_default_variant(product)
        available_stock = variant.stock_quantity if variant else product.stock_quantity
        if available_stock < 1:
            continue

        cart_item = CartItem.query.filter_by(
            user_id=user.id,
            product_id=product.id,
            variant_id=variant.id if variant else None,
        ).first()

        next_qty = min(qty if not cart_item else cart_item.quantity + qty, available_stock)
        if cart_item:
            cart_item.quantity = next_qty
            cart_item.updated_at = datetime.utcnow()
        else:
            db.session.add(
                CartItem(
                    user_id=user.id,
                    product_id=product.id,
                    variant_id=variant.id if variant else None,
                    quantity=next_qty,
                )
            )

    db.session.commit()
    session['cart'] = {}
    session.modified = True


def _build_cart_payload():
    items = []
    total = 0
    count = 0

    if current_user.is_authenticated:
        cart_rows = CartItem.query.filter_by(user_id=current_user.id).order_by(CartItem.updated_at.desc()).all()
        for row in cart_rows:
            product = row.product
            if not product or not product.is_active:
                continue

            variant = row.variant
            unit_price = _resolve_unit_price(product, variant)
            subtotal = unit_price * row.quantity

            items.append(
                {
                    'product_id': product.id,
                    'variant_id': variant.id if variant else None,
                    'variant_label': _variant_label(variant),
                    'quantity': row.quantity,
                    'unit_price': unit_price,
                    'unit_price_display': f'₹{unit_price / 100:.2f}',
                    'subtotal': subtotal,
                    'subtotal_display': f'₹{subtotal / 100:.2f}',
                    'product': _serialize_product_card(product),
                }
            )
            total += subtotal
            count += row.quantity
    else:
        cart = _get_session_cart()
        for key, quantity in cart.items():
            parts = str(key).split(':')
            product_id = _parse_int(parts[0], 0)
            variant_id_from_cart = _parse_int(parts[1] if len(parts) > 1 else '0', 0)
            qty = max(_parse_int(quantity, 0), 0)
            if product_id <= 0 or qty <= 0:
                continue

            product = db.session.get(Product, product_id)
            if not product or not product.is_active:
                continue

            if variant_id_from_cart > 0:
                variant = ProductVariant.query.filter_by(
                    id=variant_id_from_cart, product_id=product.id, is_active=True
                ).first()
                if not variant:
                    variant = _get_or_create_default_variant(product)
            else:
                variant = _get_or_create_default_variant(product)
            unit_price = _resolve_unit_price(product, variant)
            subtotal = unit_price * qty

            items.append(
                {
                    'product_id': product.id,
                    'variant_id': variant.id if variant else None,
                    'variant_label': _variant_label(variant),
                    'quantity': qty,
                    'unit_price': unit_price,
                    'unit_price_display': f'₹{unit_price / 100:.2f}',
                    'subtotal': subtotal,
                    'subtotal_display': f'₹{subtotal / 100:.2f}',
                    'product': _serialize_product_card(product),
                }
            )
            total += subtotal
            count += qty

    return {
        'items': items,
        'count': count,
        'total': total,
        'total_display': f'₹{total / 100:.2f}',
    }


def _generate_order_number():
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    random_suffix = secrets.token_hex(3).upper()
    return f'ORD-{timestamp}-{random_suffix}'


def _build_whatsapp_redirect_url(order, customer_data=None):
    if not order:
        return f'https://wa.me/{current_app.config["WHATSAPP_NUMBER"]}'

    if customer_data is None:
        customer_data = {
            'name': order.guest_name,
            'phone': order.guest_phone,
            'email': order.guest_email,
            'city': order.city,
            'state': order.state,
            'pincode': order.pincode,
            'address': order.address,
        }

    message_lines = [
        'Dominate -train anywhere Dominate everywhere',
        '',
        'My DETAILS:',
        f"Name: {customer_data['name']}",
        f"Phone: {customer_data['phone']}",
        f"Email: {customer_data['email']}",
        '',
        'DELIVERY ADDRESS:',
        f"{customer_data['address']}",
        f"{customer_data['city']}, {customer_data['state']} {customer_data['pincode']}",
        '',
        'Need to order the following ITEMS:',
    ]

    for idx, item in enumerate(order.items, 1):
        product_name = item.product.name if item.product else 'Product'
        price_display = f'₹{item.unit_price / 100:.2f}'
        message_lines.append(f'{idx}. {product_name}')
        message_lines.append(f'   Qty: {item.quantity} | Price: {price_display}')
        message_lines.append(f'   Order #: {order.order_number}')
        message_lines.append('')

    total_amount = order.get_total_price()
    message_lines.extend([
        'TOTAL AMOUNT:',
        f'₹{total_amount / 100:.2f}',
    ])

    message = '\n'.join(message_lines)
    encoded_message = quote(message)
    wa_number = current_app.config['WHATSAPP_NUMBER']
    return f'https://wa.me/{wa_number}?text={encoded_message}'


def _resolve_coupon(cart_total, coupon_code):
    code = (coupon_code or '').strip().upper()
    if not code:
        return None, 0, None

    coupon = CouponCode.query.filter_by(code=code).first()
    if not coupon:
        # If code matches an affiliate's code, treat it as an affiliate referral (no coupon)
        affiliate = AffiliateProfile.query.filter_by(affiliate_code=code).first()
        if affiliate:
            return None, 0, None
        return None, 0, api_error('Invalid coupon code', status=404, code='coupon_not_found')

    is_valid, reason = coupon.can_apply_to_order(cart_total)
    if not is_valid:
        return None, 0, api_error(f'Coupon code unavailable: {reason}', status=409, code='coupon_unavailable')

    discount = coupon.calculate_discount(cart_total)
    discount = min(discount, cart_total)  # Never exceed cart total
    return coupon, discount, None


def _clear_cart_internal():
    if current_user.is_authenticated:
        CartItem.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
    else:
        session['cart'] = {}
        session.modified = True


def _serialize_order_item(item):
    product = item.product
    return {
        'id': item.id,
        'product_id': item.product_id,
        'product_name': product.name if product else 'Product',
        'product_slug': product.slug if product else None,
        'quantity': item.quantity,
        'unit_price': item.unit_price,
        'unit_price_display': f'₹{item.unit_price / 100:.2f}',
        'subtotal': item.get_subtotal(),
        'subtotal_display': item.get_subtotal_display(),
    }


def _serialize_order(order):
    return {
        'id': order.id,
        'order_number': order.order_number,
        'currency_code': getattr(order, 'currency_code', 'INR'),
        'status': order.status,
        'shipping_status': order.shipping_status,
        'tracking_number': order.tracking_number,
        'courier_name': order.courier_name,
        'created_at': order.created_at.isoformat() + 'Z' if order.created_at else None,
        'guest_name': order.guest_name,
        'guest_email': order.guest_email,
        'guest_phone': order.guest_phone,
        'city': order.city,
        'state': order.state,
        'pincode': order.pincode,
        'address': order.address,
        'total_price': order.get_total_price(),
        'total_price_display': order.get_total_price_display(),
        'items': [_serialize_order_item(item) for item in order.items],
    }


def _serialize_policy_page(policy):
    return {
        'id': policy.id,
        'slug': policy.slug,
        'title': policy.title,
        'content': policy.content,
        'updated_at': policy.updated_at.isoformat() + 'Z' if policy.updated_at else None,
    }


def _is_admin(user):
    if not user:
        return False
    return user.role in {UserRole.ADMIN.value, UserRole.SUPERADMIN.value}


def _require_admin():
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    if not _is_admin(current_user):
        return api_error('Forbidden', status=403, code='forbidden')
    return None


def _serialize_admin_product(product):
    payload = _serialize_product_card(product)
    payload.update(
        {
            'description': product.description,
            'sku': product.sku,
            'weight_grams': product.weight_grams,
            'dimensions': product.dimensions,
            'image_url': product.image_url,
            'is_active': bool(product.is_active),
            'created_at': product.created_at.isoformat() + 'Z' if product.created_at else None,
            'updated_at': product.updated_at.isoformat() + 'Z' if product.updated_at else None,
        }
    )
    return payload


def _serialize_admin_user(user):
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'role': user.role,
        'is_active': bool(user.is_active),
        'has_affiliate_profile': AffiliateProfile.query.filter_by(user_id=user.id).first() is not None,
        'created_at': user.created_at.isoformat() + 'Z' if user.created_at else None,
    }


def _serialize_admin_review(review):
    product_name = review.product.name if review.product else None
    return {
        'id': review.id,
        'product_id': review.product_id,
        'product_name': product_name,
        'name': review.name,
        'rating': review.rating,
        'title': review.title,
        'comment': review.comment,
        'is_approved': bool(review.is_approved),
        'created_at': review.created_at.isoformat() + 'Z' if review.created_at else None,
    }


def _serialize_admin_coupon(coupon):
    return {
        'id': coupon.id,
        'code': coupon.code,
        'coupon_type': coupon.coupon_type,
        'discount_display': coupon.get_discount_display(),
        'is_active': bool(coupon.is_active),
        'current_uses': coupon.current_uses,
        'max_uses': coupon.max_uses,
        'expires_at': coupon.expires_at.isoformat() + 'Z' if coupon.expires_at else None,
        'created_at': coupon.created_at.isoformat() + 'Z' if coupon.created_at else None,
    }


def _serialize_admin_affiliate(profile):
    user = profile.user
    return {
        'id': profile.id,
        'user_id': profile.user_id,
        'user_name': user.name if user else None,
        'user_email': user.email if user else None,
        'affiliate_code': profile.affiliate_code,
        'commission_percent': profile.commission_percent,
        'wallet_balance': profile.wallet_balance,
        'wallet_balance_display': profile.get_wallet_balance_display(),
        'total_earned': profile.total_earned,
        'total_earned_display': profile.get_total_earned_display(),
        'is_active': bool(profile.is_active),
        'tier': profile.tier,
        'created_at': profile.created_at.isoformat() + 'Z' if profile.created_at else None,
    }


def _serialize_admin_commission(order):
    affiliate_name = order.affiliate.name if order.affiliate else None
    return {
        'order_id': order.id,
        'order_number': order.order_number,
        'affiliate_id': order.affiliate_id,
        'affiliate_name': affiliate_name,
        'commission_amount': order.commission_amount,
        'commission_amount_display': order.get_commission_amount_display(),
        'commission_status': order.commission_status,
        'status': order.status,
        'created_at': order.created_at.isoformat() + 'Z' if order.created_at else None,
    }


register_api_v1_auth_routes(api_v1_bp, _merge_session_cart_into_db)
register_api_v1_user_routes(api_v1_bp)
register_api_v1_product_routes(
    api_v1_bp,
    _parse_int,
    _serialize_product_card,
    _serialize_product_image,
    _serialize_product_variant,
    _serialize_review,
    _get_review_eligible_order_items,
    _serialize_review_eligible_order_item,
)
register_api_v1_cart_routes(
    api_v1_bp,
    _parse_int,
    _get_or_create_default_variant,
    _build_cart_payload,
    _get_session_cart,
)
register_api_v1_checkout_order_routes(
    api_v1_bp,
    _build_cart_payload,
    _resolve_coupon,
    _parse_int,
    _get_or_create_default_variant,
    _generate_order_number,
    _clear_cart_internal,
    _build_whatsapp_redirect_url,
    _serialize_order,
    send_order_confirmation_email,
    AffiliateManager.validate_affiliate_code,
)
register_api_v1_admin_routes(
    api_v1_bp,
    _parse_int,
    _parse_bool,
    _serialize_order,
    _serialize_product_image,
    _serialize_policy_page,
    _require_admin,
    _serialize_admin_product,
    _serialize_admin_user,
    _serialize_admin_review,
    _serialize_admin_coupon,
    _serialize_admin_affiliate,
    _serialize_admin_commission,
)
register_api_v1_affiliate_content_routes(
    api_v1_bp,
    _serialize_order,
    _serialize_admin_affiliate,
    _serialize_policy_page,
)


@api_v1_bp.get('/health')
def health():
    return api_success(
        data={
            'service': 'dominate-api',
            'version': 'v1',
            'status': 'ok',
        }
    )


