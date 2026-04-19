from datetime import datetime
import secrets
from urllib.parse import quote

from flask import Blueprint, current_app, jsonify, request, session, url_for
from flask_login import current_user, login_user, logout_user
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from app.business_logic import AffiliateManager, OrderManager
from app.models import AffiliateProfile, CartItem, CommissionStatus, CouponCode, Order, OrderItem, OrderStatus, PolicyPage, Product, ProductImage, ProductVariant, Review, ShippingStatus, User, UserAddress, UserRole, db
from app.storage import get_storage
from app.utils import send_order_confirmation_email
from app.utils.image_urls import resolve_image_thumbnail_url, resolve_image_url


api_v1_bp = Blueprint('api_v1', __name__)


def api_success(data=None, meta=None, status=200):
    """Return a standardized success envelope for SPA/API clients."""
    payload = {
        'success': True,
        'data': data if data is not None else {},
        'error': None,
        'meta': {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
    }
    if meta:
        payload['meta'].update(meta)
    return jsonify(payload), status


def api_error(message, status=400, code=None, meta=None):
    """Return a standardized error envelope for SPA/API clients."""
    payload = {
        'success': False,
        'data': {},
        'error': {
            'message': message,
            'code': code or 'bad_request',
        },
        'meta': {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
    }
    if meta:
        payload['meta'].update(meta)
    return jsonify(payload), status


def _serialize_current_user(user):
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'role': user.role,
        'is_active': bool(user.is_active),
        'auth_provider': user.auth_provider,
        'avatar_url': user.avatar_url,
        'full_name': user.full_name,
        'created_at': user.created_at.isoformat() + 'Z' if user.created_at else None,
        'updated_at': user.updated_at.isoformat() + 'Z' if user.updated_at else None,
    }


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

    for product_id_str, quantity in session_cart.items():
        product_id = _parse_int(product_id_str, 0)
        qty = max(_parse_int(quantity, 0), 0)

        if product_id <= 0 or qty <= 0:
            continue

        product = Product.query.get(product_id)
        if not product or not product.is_active:
            continue

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
        for product_id_str, quantity in cart.items():
            product_id = _parse_int(product_id_str, 0)
            qty = max(_parse_int(quantity, 0), 0)
            if product_id <= 0 or qty <= 0:
                continue

            product = Product.query.get(product_id)
            if not product or not product.is_active:
                continue

            variant = _get_or_create_default_variant(product)
            unit_price = _resolve_unit_price(product, variant)
            subtotal = unit_price * qty

            items.append(
                {
                    'product_id': product.id,
                    'variant_id': variant.id if variant else None,
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
        return None, 0, api_error('Invalid coupon code', status=404, code='coupon_not_found')

    is_valid, reason = coupon.can_apply_to_order(cart_total)
    if not is_valid:
        return None, 0, api_error(f'Coupon code unavailable: {reason}', status=409, code='coupon_unavailable')

    discount = coupon.calculate_discount(cart_total)
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


@api_v1_bp.get('/health')
def health():
    return api_success(
        data={
            'service': 'dominate-api',
            'version': 'v1',
            'status': 'ok',
        }
    )


@api_v1_bp.get('/content/policies/<string:slug>')
def get_policy_page(slug):
    normalized_slug = (slug or '').strip().lower()
    if normalized_slug not in {'shipping', 'returns', 'terms', 'privacy'}:
        return api_error('Policy not found', status=404, code='not_found')

    policy = PolicyPage.query.filter_by(slug=normalized_slug).first()
    if not policy:
        return api_error('Policy not found', status=404, code='not_found')

    return api_success(data={'policy': _serialize_policy_page(policy)})


@api_v1_bp.get('/content/contact')
def get_contact_info():
    return api_success(
        data={
            'whatsapp_number': current_app.config.get('WHATSAPP_NUMBER', ''),
            'brand_name': 'DOMINATE',
            'tagline': 'Train anywhere. Dominate everywhere.',
        }
    )


@api_v1_bp.get('/auth/me')
def auth_me():
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    return api_success(data={'user': _serialize_current_user(current_user)})


@api_v1_bp.post('/auth/login')
def auth_login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    remember = bool(payload.get('remember', False))

    if not email or not password:
        return api_error('Email and password are required', status=400, code='validation_error')

    user = User.query.filter_by(email=email).first()
    if user is None or not user.can_login_with_password() or not user.check_password(password):
        return api_error('Invalid email or password', status=401, code='invalid_credentials')

    if not user.is_active:
        return api_error('Your account has been deactivated', status=403, code='account_inactive')

    login_user(user, remember=remember)
    _merge_session_cart_into_db(user)
    return api_success(data={'user': _serialize_current_user(user)})


@api_v1_bp.post('/auth/google')
def auth_google_login():
    payload = request.get_json(silent=True) or {}
    credential = (payload.get('credential') or '').strip()

    if not credential:
        return api_error('Missing Google credential', status=400, code='validation_error')

    google_client_id = (current_app.config.get('GOOGLE_CLIENT_ID') or '').strip()
    if not google_client_id:
        return api_error('Google sign-in is not configured yet', status=503, code='service_unavailable')

    try:
        token_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id,
        )
    except Exception:
        return api_error('Google token verification failed', status=401, code='invalid_credentials')

    issuer = token_info.get('iss')
    if issuer not in ('accounts.google.com', 'https://accounts.google.com'):
        return api_error('Invalid Google token issuer', status=401, code='invalid_credentials')

    if not token_info.get('email_verified', False):
        return api_error('Google email is not verified', status=401, code='invalid_credentials')

    email = (token_info.get('email') or '').strip().lower()
    provider_id = (token_info.get('sub') or '').strip()
    full_name = (token_info.get('name') or '').strip()
    avatar_url = (token_info.get('picture') or '').strip() or None

    if not email or not provider_id:
        return api_error('Google profile data is incomplete', status=400, code='validation_error')

    user = User.query.filter_by(auth_provider='google', auth_provider_id=provider_id).first()

    if not user:
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            if existing_user.auth_provider not in ('local', 'google'):
                return api_error(
                    'This email is linked to another sign-in method. Please use that provider.',
                    status=409,
                    code='provider_conflict',
                )

            if (
                existing_user.auth_provider == 'google'
                and existing_user.auth_provider_id
                and existing_user.auth_provider_id != provider_id
            ):
                return api_error(
                    'This Google account is already linked differently. Please contact support.',
                    status=409,
                    code='provider_conflict',
                )

            existing_user.auth_provider = 'google'
            existing_user.auth_provider_id = provider_id
            existing_user.full_name = full_name or existing_user.full_name
            existing_user.avatar_url = avatar_url or existing_user.avatar_url
            if full_name and not existing_user.name:
                existing_user.name = full_name
            user = existing_user
        else:
            display_name = full_name or email.split('@')[0]
            user = User(
                name=display_name,
                full_name=full_name or display_name,
                email=email,
                password_hash=None,
                role=UserRole.USER.value,
                is_active=True,
                auth_provider='google',
                auth_provider_id=provider_id,
                avatar_url=avatar_url,
                created_at=datetime.utcnow(),
            )
            db.session.add(user)

    if not user.is_active:
        return api_error('Your account has been deactivated', status=403, code='account_inactive')

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Google sign-in DB commit failed')
        return api_error('Could not complete sign-in. Please try again.', status=500, code='server_error')

    login_user(user, remember=True)
    _merge_session_cart_into_db(user)
    return api_success(data={'user': _serialize_current_user(user)})


@api_v1_bp.post('/auth/logout')
def auth_logout():
    if current_user.is_authenticated:
        logout_user()
    return api_success(data={'logged_out': True})


@api_v1_bp.post('/auth/register')
def auth_register():
    payload = request.get_json(silent=True) or {}
    name = (payload.get('name') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''

    if len(name) < 3:
        return api_error('Name must be at least 3 characters long', status=400, code='validation_error')

    if '@' not in email or len(email) < 5:
        return api_error('Please provide a valid email', status=400, code='validation_error')

    if len(password) < 6:
        return api_error('Password must be at least 6 characters long', status=400, code='validation_error')

    if User.query.filter_by(email=email).first():
        return api_error('Email is already registered', status=409, code='email_exists')

    user = User(
        name=name,
        email=email,
        role=UserRole.USER.value,
        is_active=True,
        auth_provider='local',
    )

    try:
        user.set_password(password)
    except ValueError as exc:
        return api_error(str(exc), status=400, code='validation_error')

    db.session.add(user)
    db.session.commit()
    login_user(user)
    _merge_session_cart_into_db(user)

    return api_success(data={'user': _serialize_current_user(user)}, status=201)


@api_v1_bp.post('/auth/forgot-password')
def auth_forgot_password():
    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip().lower()

    if not email or '@' not in email:
        return api_error('Please provide a valid email address', status=400, code='validation_error')

    user = User.query.filter_by(email=email).first()

    # Do not reveal whether the email exists (prevents user enumeration).
    if user and user.is_active and user.can_login_with_password():
        try:
            token = user.generate_reset_token()
            from app.utils.email import send_password_reset_email

            send_result = send_password_reset_email(user.email, token)
            if not send_result.get('success'):
                current_app.logger.error(
                    'Password reset email send failed for %s: %s',
                    user.email,
                    send_result.get('message', 'unknown error'),
                )

            # Helpful in development to unblock local testing.
            if current_app.debug:
                reset_url = url_for('auth.reset_password_form', token=token, _external=True)
                current_app.logger.info('DEV password reset URL for %s: %s', user.email, reset_url)

        except Exception as exc:
            current_app.logger.error('Password reset request failed for %s: %s', email, str(exc))

    return api_success(
        data={
            'message': 'If an account exists with that email, a reset link will be sent shortly.'
        }
    )


@api_v1_bp.post('/auth/reset-password')
def auth_reset_password():
    payload = request.get_json(silent=True) or {}
    token = (payload.get('token') or '').strip()
    password = payload.get('password') or ''
    confirm_password = payload.get('confirm_password') or ''

    if not token:
        return api_error('Reset token is required', status=400, code='validation_error')

    if len(password) < 6:
        return api_error('Password must be at least 6 characters long', status=400, code='validation_error')

    if password != confirm_password:
        return api_error('Passwords do not match', status=400, code='validation_error')

    user = User.verify_reset_token(token)
    if not user:
        return api_error('Invalid or expired password reset token', status=400, code='invalid_token')

    if not user.can_login_with_password():
        return api_error('This account uses social sign-in. Use your provider to sign in.', status=409, code='social_account')

    try:
        user.set_password(password)
        user.clear_reset_token()
    except ValueError as exc:
        return api_error(str(exc), status=400, code='validation_error')
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Password reset commit failed for user %s: %s', user.email, str(exc))
        return api_error('Could not reset password. Please try again.', status=500, code='server_error')

    return api_success(data={'message': 'Password reset successful. You can now log in.'})


@api_v1_bp.get('/products')
def products_list():
    page = max(_parse_int(request.args.get('page', 1), 1), 1)
    per_page = min(max(_parse_int(request.args.get('per_page', 12), 12), 1), 48)
    q = (request.args.get('q') or '').strip()

    query = Product.query.filter_by(is_active=True)
    if q:
        query = query.filter(Product.name.ilike(f'%{q}%'))

    pagination = query.order_by(Product.created_at.desc()).paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )

    products = [_serialize_product_card(product) for product in pagination.items]
    return api_success(
        data={'items': products},
        meta={
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev,
            }
        },
    )


@api_v1_bp.get('/products/<string:slug>')
def product_detail(slug):
    product = Product.query.filter_by(slug=slug, is_active=True).first()
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    images = ProductImage.get_product_images(product.id)
    approved_reviews = Review.query.filter_by(product_id=product.id, is_approved=True).order_by(Review.created_at.desc()).all()

    payload = _serialize_product_card(product)
    payload['images'] = [_serialize_product_image(image) for image in images]
    payload['variants'] = [_serialize_product_variant(variant) for variant in product.variants if variant.is_active]
    payload['reviews'] = [_serialize_review(review) for review in approved_reviews]

    return api_success(data={'product': payload})


@api_v1_bp.get('/products/id/<int:product_id>')
def product_detail_by_id(product_id):
    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    images = ProductImage.get_product_images(product.id)
    approved_reviews = Review.query.filter_by(product_id=product.id, is_approved=True).order_by(Review.created_at.desc()).all()

    payload = _serialize_product_card(product)
    payload['images'] = [_serialize_product_image(image) for image in images]
    payload['variants'] = [_serialize_product_variant(variant) for variant in product.variants if variant.is_active]
    payload['reviews'] = [_serialize_review(review) for review in approved_reviews]

    return api_success(data={'product': payload})


@api_v1_bp.get('/products/<string:slug>/review-eligibility')
def product_review_eligibility(slug):
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')

    product = Product.query.filter_by(slug=slug, is_active=True).first()
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    delivered_items = _get_review_eligible_order_items(current_user.id, product.id, include_reviewed=True)
    eligible_items = _get_review_eligible_order_items(current_user.id, product.id, include_reviewed=False)
    submitted_reviews = (
        Review.query
        .filter_by(user_id=current_user.id, product_id=product.id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return api_success(
        data={
            'eligibility': {
                'has_delivered_purchase': bool(delivered_items),
                'can_submit_review': bool(eligible_items),
                'has_pending_review': any(not review.is_approved for review in submitted_reviews),
                'has_approved_review': any(review.is_approved for review in submitted_reviews),
                'eligible_order_items': [_serialize_review_eligible_order_item(item) for item in eligible_items],
            }
        }
    )


@api_v1_bp.post('/products/<string:slug>/reviews')
def submit_product_review(slug):
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')

    product = Product.query.filter_by(slug=slug, is_active=True).first()
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    eligible_items = _get_review_eligible_order_items(current_user.id, product.id, include_reviewed=False)
    if not eligible_items:
        return api_error(
            'Only customers with a delivered order can submit a review for this product.',
            status=403,
            code='forbidden',
        )

    payload = request.get_json(silent=True) or {}
    selected_order_item_id = _parse_int(payload.get('order_item_id'), 0)
    rating = _parse_int(payload.get('rating'), 0)
    title = (payload.get('title') or '').strip()
    comment = (payload.get('comment') or '').strip()

    eligible_by_id = {item.id: item for item in eligible_items}
    if selected_order_item_id <= 0 and len(eligible_items) == 1:
        selected_order_item_id = eligible_items[0].id

    selected_order_item = eligible_by_id.get(selected_order_item_id)
    if not selected_order_item:
        return api_error('Select a valid delivered purchase before submitting your review.', status=400, code='validation_error')

    if rating < 1 or rating > 5:
        return api_error('Please select a rating between 1 and 5 stars.', status=400, code='validation_error')

    if title and len(title) < 3:
        return api_error('Review title must be at least 3 characters long.', status=400, code='validation_error')

    if len(comment) < 10:
        return api_error('Review comment must be at least 10 characters long.', status=400, code='validation_error')

    if Review.query.filter_by(order_item_id=selected_order_item.id).first():
        return api_error('A review has already been submitted for this delivered purchase.', status=409, code='duplicate_review')

    try:
        review = Review(
            product_id=product.id,
            user_id=current_user.id,
            order_item_id=selected_order_item.id,
            name=current_user.name,
            role='Verified Buyer',
            rating=rating,
            title=title or None,
            comment=comment,
            is_approved=False,
        )
        db.session.add(review)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Review submission error for product %s: %s', product.id, str(exc))
        return api_error('We could not submit your review right now. Please try again.', status=500, code='server_error')

    return api_success(data={'message': 'Your review has been submitted. It will appear after approval.'}, status=201)


@api_v1_bp.get('/cart')
def cart_get():
    return api_success(data={'cart': _build_cart_payload()})


@api_v1_bp.post('/cart/add')
def cart_add():
    payload = request.get_json(silent=True) or {}
    product_id = _parse_int(payload.get('product_id'), 0)
    quantity = max(_parse_int(payload.get('quantity', 1), 1), 1)

    if product_id <= 0:
        return api_error('Valid product_id is required', status=400, code='validation_error')

    product = Product.query.get(product_id)
    if not product or not product.is_active:
        return api_error('Product not found', status=404, code='not_found')

    variant = _get_or_create_default_variant(product)
    available_stock = variant.stock_quantity if variant else product.stock_quantity
    if available_stock < 1:
        return api_error('Product is out of stock', status=409, code='out_of_stock')

    if current_user.is_authenticated:
        cart_item = CartItem.query.filter_by(
            user_id=current_user.id,
            product_id=product.id,
            variant_id=variant.id if variant else None,
        ).first()

        next_qty = min(quantity if not cart_item else cart_item.quantity + quantity, available_stock)
        if cart_item:
            cart_item.quantity = next_qty
            cart_item.updated_at = datetime.utcnow()
        else:
            db.session.add(
                CartItem(
                    user_id=current_user.id,
                    product_id=product.id,
                    variant_id=variant.id if variant else None,
                    quantity=next_qty,
                )
            )
        db.session.commit()
    else:
        cart = _get_session_cart()
        current_qty = max(_parse_int(cart.get(str(product.id), 0), 0), 0)
        cart[str(product.id)] = min(current_qty + quantity, available_stock)
        session['cart'] = cart
        session.modified = True

    return api_success(data={'cart': _build_cart_payload()})


@api_v1_bp.put('/cart/items/<int:product_id>')
def cart_update(product_id):
    payload = request.get_json(silent=True) or {}
    quantity = _parse_int(payload.get('quantity'), -1)

    if quantity < 0:
        return api_error('Quantity must be zero or greater', status=400, code='validation_error')

    product = Product.query.get(product_id)
    if not product or not product.is_active:
        return api_error('Product not found', status=404, code='not_found')

    variant = _get_or_create_default_variant(product)
    available_stock = variant.stock_quantity if variant else product.stock_quantity

    if quantity == 0:
        if current_user.is_authenticated:
            CartItem.query.filter_by(user_id=current_user.id, product_id=product_id).delete()
            db.session.commit()
        else:
            cart = _get_session_cart()
            cart.pop(str(product_id), None)
            session['cart'] = cart
            session.modified = True
        return api_success(data={'cart': _build_cart_payload()})

    next_qty = min(quantity, max(available_stock, 0))
    if next_qty < 1:
        return api_error('Product is out of stock', status=409, code='out_of_stock')

    if current_user.is_authenticated:
        cart_item = CartItem.query.filter_by(
            user_id=current_user.id,
            product_id=product.id,
            variant_id=variant.id if variant else None,
        ).first()

        if cart_item:
            cart_item.quantity = next_qty
            cart_item.updated_at = datetime.utcnow()
        else:
            db.session.add(
                CartItem(
                    user_id=current_user.id,
                    product_id=product.id,
                    variant_id=variant.id if variant else None,
                    quantity=next_qty,
                )
            )
        db.session.commit()
    else:
        cart = _get_session_cart()
        cart[str(product.id)] = next_qty
        session['cart'] = cart
        session.modified = True

    return api_success(data={'cart': _build_cart_payload()})


@api_v1_bp.delete('/cart/items/<int:product_id>')
def cart_remove(product_id):
    if current_user.is_authenticated:
        CartItem.query.filter_by(user_id=current_user.id, product_id=product_id).delete()
        db.session.commit()
    else:
        cart = _get_session_cart()
        cart.pop(str(product_id), None)
        session['cart'] = cart
        session.modified = True

    return api_success(data={'cart': _build_cart_payload()})


@api_v1_bp.post('/cart/clear')
def cart_clear():
    if current_user.is_authenticated:
        CartItem.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
    else:
        session['cart'] = {}
        session.modified = True

    return api_success(data={'cart': _build_cart_payload()})


@api_v1_bp.get('/checkout/preview')
def checkout_preview():
    cart = _build_cart_payload()
    if not cart['items']:
        return api_error('Your cart is empty', status=400, code='empty_cart')

    coupon_code = (request.args.get('coupon_code') or '').strip().upper()
    coupon, discount, coupon_error = _resolve_coupon(cart['total'], coupon_code)
    if coupon_error:
        return coupon_error

    payable = max(cart['total'] - discount, 0)
    return api_success(
        data={
            'cart': cart,
            'coupon': {
                'code': coupon.code,
                'discount_display': coupon.get_discount_display(),
            } if coupon else None,
            'discount': discount,
            'discount_display': f'₹{discount / 100:.2f}',
            'payable_total': payable,
            'payable_total_display': f'₹{payable / 100:.2f}',
        }
    )


@api_v1_bp.post('/checkout/place')
def checkout_place_order():
    cart = _build_cart_payload()
    if not cart['items']:
        return api_error('Your cart is empty', status=400, code='empty_cart')

    payload = request.get_json(silent=True) or {}
    customer_name = (payload.get('customer_name') or '').strip()
    phone_number = (payload.get('phone_number') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    city = (payload.get('city') or '').strip()
    state = (payload.get('state') or '').strip()
    pincode = (payload.get('pincode') or '').strip()
    address = (payload.get('address') or '').strip()
    coupon_code = (payload.get('coupon_code') or '').strip().upper()
    address_id = _parse_int(payload.get('address_id'), 0)
    save_address = bool(payload.get('save_address', False))
    set_default_address = bool(payload.get('set_default_address', False))
    address_label = (payload.get('address_label') or 'Home').strip() or 'Home'
    email_opt_in = bool(payload.get('email_opt_in', False))

    selected_address = None
    if current_user.is_authenticated and address_id > 0:
        selected_address = UserAddress.query.filter_by(id=address_id, user_id=current_user.id).first()
        if not selected_address:
            return api_error('Saved address not found', status=404, code='address_not_found')
        customer_name = selected_address.full_name
        phone_number = selected_address.phone
        city = selected_address.city
        state = selected_address.state
        pincode = selected_address.pincode
        address = ', '.join(
            [part for part in [selected_address.street_line1, selected_address.street_line2, selected_address.landmark] if part]
        )

    errors = []
    if len(customer_name) < 3:
        errors.append('Please provide a valid name (at least 3 characters)')
    if len(phone_number) != 10 or not phone_number.isdigit() or phone_number[0] < '6':
        errors.append('Please provide a valid 10-digit phone number (start with 6-9)')
    if not email or '@' not in email:
        errors.append('Please provide a valid email address')
    if len(city) < 2:
        errors.append('Please provide a valid city name')
    if not state:
        errors.append('Please select a state')
    if len(pincode) != 6 or not pincode.isdigit():
        errors.append('Please provide a valid 6-digit pincode')
    if len(address) < 10:
        errors.append('Please provide a valid delivery address (at least 10 characters)')

    if errors:
        return api_error('; '.join(errors), status=400, code='validation_error', meta={'errors': errors})

    coupon, discount, coupon_error = _resolve_coupon(cart['total'], coupon_code)
    if coupon_error:
        return coupon_error

    try:
        for item in cart['items']:
            product = Product.query.get(item['product_id'])
            if not product or not product.is_active:
                return api_error('Some products are no longer available', status=409, code='product_unavailable')
            variant = _get_or_create_default_variant(product)
            stock_to_check = variant.stock_quantity if variant else product.stock_quantity
            if item['quantity'] > stock_to_check:
                return api_error(
                    f"{product.name}: only {stock_to_check} available in stock",
                    status=409,
                    code='insufficient_stock',
                )

        order = Order(
            order_number=_generate_order_number(),
            user_id=current_user.id if current_user.is_authenticated else None,
            address_id=selected_address.id if selected_address else None,
            guest_name=customer_name,
            guest_phone=phone_number,
            guest_email=email,
            city=city,
            state=state,
            pincode=pincode,
            address=address,
        )

        if coupon:
            order.coupon_id = coupon.id
            order.applied_discount = discount
            order.discount_type = coupon.coupon_type

        if coupon_code:
            if coupon and coupon.coupon_type == 'affiliate':
                order.affiliate_id = coupon.affiliate_id
            else:
                affiliate_profile, _ = AffiliateManager.validate_affiliate_code(coupon_code)
                if affiliate_profile:
                    order.affiliate_id = affiliate_profile.user_id

        db.session.add(order)
        db.session.flush()

        for item in cart['items']:
            product = Product.query.get(item['product_id'])
            variant = _get_or_create_default_variant(product)
            if variant and variant.price_override is not None:
                unit_price = variant.price_override
            elif product.is_discount_active and product.price_discounted:
                unit_price = product.price_discounted
            else:
                unit_price = product.price

            db.session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    variant_id=variant.id if variant else None,
                    variant_snapshot=variant.option_values if variant else None,
                    quantity=item['quantity'],
                    unit_price=unit_price,
                )
            )

        db.session.commit()

        if coupon:
            coupon.increment_usage()

        send_order_confirmation_email(order)

        if current_user.is_authenticated and email_opt_in:
            current_user.email_marketing_opt_in = True
            db.session.commit()

        if current_user.is_authenticated and save_address:
            address_parts = [part.strip() for part in address.split(',') if part.strip()]
            street_line1 = address_parts[0] if address_parts else address
            street_line2 = address_parts[1] if len(address_parts) > 1 else None
            landmark = ', '.join(address_parts[2:]) if len(address_parts) > 2 else None

            address_record = selected_address
            if not address_record:
                address_record = UserAddress(user_id=current_user.id)
                db.session.add(address_record)

            address_record.label = address_label
            address_record.full_name = customer_name
            address_record.phone = phone_number
            address_record.street_line1 = street_line1
            address_record.street_line2 = street_line2
            address_record.landmark = landmark
            address_record.city = city
            address_record.state = state
            address_record.pincode = pincode

            if set_default_address:
                UserAddress.query.filter(
                    UserAddress.user_id == current_user.id,
                    UserAddress.id != address_record.id,
                ).update({'is_default': False}, synchronize_session=False)
                address_record.is_default = True

            db.session.commit()

        _clear_cart_internal()

        customer_data = {
            'name': customer_name,
            'phone': phone_number,
            'email': email,
            'city': city,
            'state': state,
            'pincode': pincode,
            'address': address,
        }
        whatsapp_url = _build_whatsapp_redirect_url(order, customer_data)

        return api_success(
            data={
                'order': {
                    'id': order.id,
                    'order_number': order.order_number,
                    'status': order.status,
                },
                'redirect_url': whatsapp_url,
                'whatsapp_url': whatsapp_url,
            },
            status=201,
        )
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Checkout API error: %s', str(exc))
        return api_error('An error occurred while processing your order. Please try again.', status=500, code='server_error')


@api_v1_bp.post('/orders/lookup')
def lookup_order():
    payload = request.get_json(silent=True) or {}
    order_number = (payload.get('order_number') or '').strip().upper()
    email = (payload.get('email') or '').strip().lower()

    if not order_number or not email:
        return api_error('order_number and email are required', status=400, code='validation_error')

    order = (
        Order.query.options(
            selectinload(Order.items).selectinload(OrderItem.product)
        )
        .filter_by(order_number=order_number)
        .first()
    )
    if not order:
        return api_error('Order not found', status=404, code='not_found')

    if order.guest_email.lower() != email:
        return api_error('Order lookup failed', status=403, code='forbidden')

    return api_success(data={'order': _serialize_order(order)})


@api_v1_bp.get('/orders/<string:order_number>')
def get_order(order_number):
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')

    normalized = (order_number or '').strip().upper()
    order = (
        Order.query.options(
            selectinload(Order.items).selectinload(OrderItem.product)
        )
        .filter_by(order_number=normalized)
        .first()
    )
    if not order:
        return api_error('Order not found', status=404, code='not_found')

    can_view = (
        current_user.role in {UserRole.ADMIN.value, UserRole.SUPERADMIN.value}
        or (order.user_id is not None and order.user_id == current_user.id)
    )
    if not can_view:
        return api_error('Forbidden', status=403, code='forbidden')

    return api_success(data={'order': _serialize_order(order)})


@api_v1_bp.get('/orders')
def list_orders():
    """List all orders for authenticated user (paginated)."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 10))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    query = (
        Order.query.options(
            selectinload(Order.items).selectinload(OrderItem.product)
        )
        .filter_by(user_id=current_user.id)
        .order_by(Order.created_at.desc())
    )
    paginated = query.paginate(page=page, per_page=per_page)

    order_item_ids = [item.id for order in paginated.items for item in order.items]
    reviewed_order_item_ids = set()
    reviewable_order_item_ids = set()

    if order_item_ids:
        reviewed_order_item_ids = {
            review_order_item_id
            for (review_order_item_id,) in (
                db.session.query(Review.order_item_id)
                .filter(Review.order_item_id.in_(order_item_ids))
                .all()
            )
            if review_order_item_id is not None
        }

        for order in paginated.items:
            is_delivered_purchase = (
                order.status != OrderStatus.CANCELLED.value
                and order.shipping_status == ShippingStatus.DELIVERED.value
            )
            if not is_delivered_purchase:
                continue

            for item in order.items:
                if item.id not in reviewed_order_item_ids:
                    reviewable_order_item_ids.add(item.id)

    return api_success(
        data={
            'orders': [_serialize_order(order) for order in paginated.items],
            'reviewable_order_item_ids': sorted(reviewable_order_item_ids),
            'reviewed_order_item_ids': sorted(reviewed_order_item_ids),
        },
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        }
    )


@api_v1_bp.get('/admin/dashboard')
def admin_dashboard():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    total_products = Product.query.count()
    active_products = Product.query.filter_by(is_active=True).count()
    total_orders = Order.query.count()
    pending_orders = Order.query.filter_by(status=OrderStatus.PENDING.value).count()
    total_users = User.query.count()

    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(10).all()

    return api_success(
        data={
            'stats': {
                'total_products': total_products,
                'active_products': active_products,
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'total_users': total_users,
            },
            'recent_orders': [_serialize_order(order) for order in recent_orders],
        }
    )


@api_v1_bp.get('/admin/orders')
def admin_list_orders():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 20))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    status_filter = (request.args.get('status') or 'all').strip().lower()
    q = (request.args.get('q') or '').strip()

    query = Order.query.options(selectinload(Order.items).selectinload(OrderItem.product))

    if status_filter != 'all':
        query = query.filter(Order.status == status_filter)

    if q:
        like_term = f'%{q}%'
        query = query.filter(
            or_(
                Order.order_number.ilike(like_term),
                Order.guest_name.ilike(like_term),
                Order.guest_email.ilike(like_term),
                Order.guest_phone.ilike(like_term),
            )
        )

    paginated = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return api_success(
        data={'orders': [_serialize_order(order) for order in paginated.items]},
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        },
    )


@api_v1_bp.get('/admin/orders/<int:order_id>')
def admin_get_order(order_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    order = (
        Order.query.options(
            selectinload(Order.items).selectinload(OrderItem.product)
        )
        .filter_by(id=order_id)
        .first()
    )
    if not order:
        return api_error('Order not found', status=404, code='not_found')

    return api_success(data={'order': _serialize_order(order)})


@api_v1_bp.put('/admin/orders/<int:order_id>/status')
def admin_update_order_status(order_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    order = Order.query.get(order_id)
    if not order:
        return api_error('Order not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    status_value = (payload.get('status') or '').strip().lower()
    valid_statuses = {value.value for value in OrderStatus}
    if status_value not in valid_statuses:
        return api_error('Invalid order status', status=400, code='validation_error')

    order.status = status_value
    db.session.commit()
    db.session.refresh(order)
    return api_success(data={'order': _serialize_order(order)})


@api_v1_bp.put('/admin/orders/<int:order_id>/shipping')
def admin_update_order_shipping(order_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True) or {}
    shipping_status = (payload.get('shipping_status') or '').strip().lower()
    if not shipping_status:
        return api_error('shipping_status is required', status=400, code='validation_error')

    tracking_number = (payload.get('tracking_number') or '').strip() or None
    courier_name = (payload.get('courier_name') or '').strip() or None

    success, message = OrderManager.update_shipping(
        order_id=order_id,
        shipping_status=shipping_status,
        tracking_number=tracking_number,
        courier_name=courier_name,
        admin_id=current_user.id,
    )

    if not success:
        return api_error(message or 'Unable to update shipping details', status=400, code='validation_error')

    order = Order.query.get(order_id)
    return api_success(data={'order': _serialize_order(order), 'message': message})


@api_v1_bp.post('/admin/orders/<int:order_id>/confirm')
def admin_confirm_order(order_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    success, message = OrderManager.confirm_order(order_id=order_id, admin_id=current_user.id)
    if not success:
        return api_error(message or 'Unable to confirm order', status=400, code='validation_error')

    order = Order.query.get(order_id)
    return api_success(data={'order': _serialize_order(order), 'message': message})


@api_v1_bp.post('/admin/orders/<int:order_id>/cancel')
def admin_cancel_order(order_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True) or {}
    reason = (payload.get('reason') or 'Admin cancellation').strip()

    success, message = OrderManager.cancel_order(
        order_id=order_id,
        admin_id=current_user.id,
        reason=reason,
    )
    if not success:
        return api_error(message or 'Unable to cancel order', status=400, code='validation_error')

    order = Order.query.get(order_id)
    return api_success(data={'order': _serialize_order(order), 'message': message})


@api_v1_bp.get('/admin/products')
def admin_list_products():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 20))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    q = (request.args.get('q') or '').strip()
    status_filter = (request.args.get('status') or 'all').strip().lower()
    sort = (request.args.get('sort') or 'latest').strip().lower()

    query = Product.query

    if q:
        query = query.filter(Product.name.ilike(f'%{q}%'))

    if status_filter == 'active':
        query = query.filter(Product.is_active.is_(True))
    elif status_filter == 'inactive':
        query = query.filter(Product.is_active.is_(False))

    if sort == 'oldest':
        query = query.order_by(Product.created_at.asc())
    elif sort == 'name':
        query = query.order_by(Product.name.asc())
    elif sort == 'price_low':
        query = query.order_by(Product.price.asc())
    elif sort == 'price_high':
        query = query.order_by(Product.price.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return api_success(
        data={'items': [_serialize_admin_product(product) for product in paginated.items]},
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        },
    )


@api_v1_bp.get('/admin/products/<int:product_id>')
def admin_get_product(product_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    product = Product.query.get(product_id)
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    return api_success(data={'product': _serialize_admin_product(product)})


@api_v1_bp.put('/admin/products/<int:product_id>')
def admin_update_product(product_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    product = Product.query.get(product_id)
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}

    try:
        if 'name' in payload:
            name = (payload.get('name') or '').strip()
            if not name or len(name) < 3:
                return api_error('Product name must be at least 3 characters', status=400, code='validation_error')
            product.name = name

        if 'description' in payload:
            description = (payload.get('description') or '').strip()
            if not description or len(description) < 10:
                return api_error('Description must be at least 10 characters', status=400, code='validation_error')
            product.description = description

        if 'price' in payload:
            price = int(payload.get('price') or 0)
            if price <= 0:
                return api_error('Price must be greater than 0', status=400, code='validation_error')
            product.price = price

        if 'price_original' in payload:
            value = payload.get('price_original')
            product.price_original = int(value) if value is not None else None

        if 'price_discounted' in payload:
            value = payload.get('price_discounted')
            product.price_discounted = int(value) if value is not None else None

        if 'is_discount_active' in payload:
            product.is_discount_active = bool(payload.get('is_discount_active'))

        if 'stock_quantity' in payload:
            stock_quantity = int(payload.get('stock_quantity') or 0)
            if stock_quantity < 0:
                return api_error('Stock cannot be negative', status=400, code='validation_error')
            product.stock_quantity = stock_quantity

        if 'weight_grams' in payload:
            weight_grams = int(payload.get('weight_grams') or 0)
            if weight_grams <= 0:
                return api_error('Weight must be greater than 0', status=400, code='validation_error')
            product.weight_grams = weight_grams

        if 'dimensions' in payload:
            dimensions = (payload.get('dimensions') or '').strip()
            product.dimensions = dimensions or None

        if 'image_url' in payload:
            image_url = (payload.get('image_url') or '').strip()
            product.image_url = image_url or None

        if 'is_active' in payload:
            product.is_active = bool(payload.get('is_active'))

        db.session.commit()
        return api_success(data={'product': _serialize_admin_product(product)})
    except ValueError:
        db.session.rollback()
        return api_error('Invalid numeric field value', status=400, code='validation_error')
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Admin product update error: %s', str(exc))
        return api_error('Failed to update product', status=500, code='server_error')


@api_v1_bp.delete('/admin/products/<int:product_id>')
def admin_archive_product(product_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    product = Product.query.get(product_id)
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    product.is_active = False
    db.session.commit()
    return api_success(data={'product': _serialize_admin_product(product), 'archived': True})


@api_v1_bp.delete('/admin/products/<int:product_id>/hard-delete')
def admin_hard_delete_product(product_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    if current_user.role != UserRole.SUPERADMIN.value:
        return api_error('Only superadmin can hard delete products', status=403, code='forbidden')

    product = Product.query.get(product_id)
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    from app.models import CartItem, InventoryLog, OrderItem

    order_count = OrderItem.query.filter_by(product_id=product_id).count()
    if order_count > 0:
        return api_error('Cannot delete product with order history. Archive it instead.', status=400, code='validation_error')

    inventory_log_count = InventoryLog.query.filter_by(product_id=product_id).count()
    if inventory_log_count > 0:
        return api_error('Cannot delete product with inventory history. Archive it instead.', status=400, code='validation_error')

    cart_count = CartItem.query.filter_by(product_id=product_id).count()
    if cart_count > 0:
        return api_error('Cannot delete product that still exists in user carts.', status=400, code='validation_error')

    review_count = Review.query.filter_by(product_id=product_id).count()
    if review_count > 0:
        return api_error('Cannot delete product with reviews. Archive it instead.', status=400, code='validation_error')

    images = ProductImage.query.filter_by(product_id=product_id).all()
    storage = get_storage()
    for image in images:
        if image.storage_path:
            delete_result = storage.delete(image.storage_path)
            if not delete_result.get('success'):
                current_app.logger.warning(
                    'Hard delete image cleanup failed for image_id=%s path=%s error=%s',
                    image.id,
                    image.storage_path,
                    delete_result.get('error')
                )
        db.session.delete(image)

    db.session.delete(product)
    db.session.commit()
    return api_success(data={'deleted': True})


@api_v1_bp.get('/admin/users')
def admin_list_users():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 20))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    role = (request.args.get('role') or 'all').strip().lower()
    q = (request.args.get('q') or '').strip()

    query = User.query
    if role in {UserRole.USER.value, UserRole.ADMIN.value, UserRole.SUPERADMIN.value}:
        query = query.filter(User.role == role)

    if q:
        like = f'%{q}%'
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))

    paginated = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return api_success(
        data={'items': [_serialize_admin_user(user) for user in paginated.items]},
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        },
    )


@api_v1_bp.put('/admin/users/<int:user_id>')
def admin_update_user(user_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    user = User.query.get(user_id)
    if not user:
        return api_error('User not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    requested_role = payload.get('role') if 'role' in payload else None
    requested_active = payload.get('is_active') if 'is_active' in payload else None

    # Only superadmins can touch superadmin role assignment/removal.
    if requested_role is not None and (requested_role == UserRole.SUPERADMIN.value or user.role == UserRole.SUPERADMIN.value):
        if current_user.role != UserRole.SUPERADMIN.value:
            return api_error('Only superadmin can manage superadmin role', status=403, code='forbidden')

    # Regular admins can only manage regular users and cannot elevate roles.
    if current_user.role != UserRole.SUPERADMIN.value:
        if user.role != UserRole.USER.value:
            return api_error('Only superadmin can manage admin accounts', status=403, code='forbidden')
        if requested_role is not None and requested_role != UserRole.USER.value:
            return api_error('Only superadmin can assign admin roles', status=403, code='forbidden')

    if requested_role is not None:
        valid_roles = {UserRole.USER.value, UserRole.ADMIN.value, UserRole.SUPERADMIN.value}
        if requested_role not in valid_roles:
            return api_error('Invalid role value', status=400, code='validation_error')

        if user.role == UserRole.SUPERADMIN.value and requested_role != UserRole.SUPERADMIN.value and User.count_superadmins() <= 1:
            return api_error('Cannot demote the last active superadmin', status=400, code='validation_error')

        user.role = requested_role

    if requested_active is not None:
        is_active = bool(requested_active)
        if user.id == current_user.id and not is_active:
            return api_error('You cannot deactivate your own account', status=400, code='validation_error')
        if user.role == UserRole.SUPERADMIN.value and not is_active and User.count_superadmins() <= 1:
            return api_error('Cannot deactivate the last active superadmin', status=400, code='validation_error')
        user.is_active = is_active

    db.session.commit()
    return api_success(data={'user': _serialize_admin_user(user)})


@api_v1_bp.delete('/admin/users/<int:user_id>')
def admin_delete_user(user_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    if current_user.role != UserRole.SUPERADMIN.value:
        return api_error('Only superadmin can delete users', status=403, code='forbidden')

    user = User.query.get(user_id)
    if not user:
        return api_error('User not found', status=404, code='not_found')

    if user.id == current_user.id:
        return api_error('You cannot delete your own account', status=400, code='validation_error')

    if user.role == UserRole.SUPERADMIN.value and User.count_superadmins() <= 1:
        return api_error('Cannot delete the last active superadmin', status=400, code='validation_error')

    try:
        db.session.delete(user)
        db.session.commit()
        return api_success(data={'deleted': True})
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Admin user delete error: %s', str(exc))
        return api_error('Failed to delete user', status=500, code='server_error')


@api_v1_bp.get('/admin/reviews')
def admin_list_reviews():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 20))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    status = (request.args.get('status') or 'all').strip().lower()
    q = (request.args.get('q') or '').strip()

    query = Review.query
    if status == 'approved':
        query = query.filter(Review.is_approved.is_(True))
    elif status == 'pending':
        query = query.filter(Review.is_approved.is_(False))

    if q:
        like = f'%{q}%'
        query = query.filter(or_(Review.name.ilike(like), Review.title.ilike(like), Review.comment.ilike(like)))

    paginated = query.order_by(Review.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return api_success(
        data={'items': [_serialize_admin_review(review) for review in paginated.items]},
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        },
    )


@api_v1_bp.get('/admin/policies')
def admin_list_policies():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    policies = PolicyPage.query.order_by(PolicyPage.slug.asc()).all()
    return api_success(data={'items': [_serialize_policy_page(policy) for policy in policies]})


@api_v1_bp.get('/admin/coupons')
def admin_list_coupons():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 20))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    coupon_type = (request.args.get('type') or 'all').strip().lower()
    status = (request.args.get('status') or 'all').strip().lower()
    q = (request.args.get('q') or '').strip()

    query = CouponCode.query
    if coupon_type != 'all':
        query = query.filter(CouponCode.coupon_type == coupon_type)
    if status == 'active':
        query = query.filter(CouponCode.is_active.is_(True))
    elif status == 'inactive':
        query = query.filter(CouponCode.is_active.is_(False))
    if q:
        query = query.filter(CouponCode.code.ilike(f'%{q}%'))

    paginated = query.order_by(CouponCode.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return api_success(
        data={'items': [_serialize_admin_coupon(coupon) for coupon in paginated.items]},
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        },
    )


@api_v1_bp.get('/admin/affiliates')
def admin_list_affiliates():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 20))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    q = (request.args.get('q') or '').strip()

    query = AffiliateProfile.query
    if q:
        like = f'%{q}%'
        query = query.join(User, AffiliateProfile.user_id == User.id).filter(
            or_(
                AffiliateProfile.affiliate_code.ilike(like),
                User.name.ilike(like),
                User.email.ilike(like),
            )
        )

    paginated = query.order_by(AffiliateProfile.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return api_success(
        data={'items': [_serialize_admin_affiliate(profile) for profile in paginated.items]},
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        },
    )


@api_v1_bp.put('/admin/affiliates/<int:affiliate_id>')
def admin_update_affiliate(affiliate_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    if current_user.role != UserRole.SUPERADMIN.value:
        return api_error('Only superadmin can manage affiliate account status', status=403, code='forbidden')

    profile = AffiliateProfile.query.get(affiliate_id)
    if not profile:
        return api_error('Affiliate profile not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    if 'is_active' not in payload:
        return api_error('is_active is required', status=400, code='validation_error')

    profile.is_active = bool(payload.get('is_active'))
    db.session.commit()
    db.session.refresh(profile)
    return api_success(data={'affiliate': _serialize_admin_affiliate(profile)})


@api_v1_bp.post('/admin/affiliates/<int:affiliate_id>/wallet-adjust')
def admin_adjust_affiliate_wallet(affiliate_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    if current_user.role != UserRole.SUPERADMIN.value:
        return api_error('Only superadmin can adjust affiliate wallet', status=403, code='forbidden')

    profile = AffiliateProfile.query.get(affiliate_id)
    if not profile:
        return api_error('Affiliate profile not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    amount = _parse_int(payload.get('amount'), 0)
    if amount == 0:
        return api_error('amount must be a non-zero integer (paise)', status=400, code='validation_error')

    if not profile.adjust_wallet(amount, (payload.get('reason') or '').strip()):
        return api_error('Wallet adjustment failed. Balance cannot go negative.', status=400, code='validation_error')

    db.session.refresh(profile)
    return api_success(data={'affiliate': _serialize_admin_affiliate(profile)})


@api_v1_bp.post('/admin/users/<int:user_id>/affiliate-profile')
def admin_create_affiliate_profile(user_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    if current_user.role != UserRole.SUPERADMIN.value:
        return api_error('Only superadmin can create affiliate profiles', status=403, code='forbidden')

    payload = request.get_json(silent=True) or {}
    commission_percent = payload.get('commission_percent', 10.0)

    try:
        commission_percent = float(commission_percent)
    except (TypeError, ValueError):
        return api_error('Invalid commission_percent value', status=400, code='validation_error')

    if commission_percent < 0 or commission_percent > 100:
        return api_error('commission_percent must be between 0 and 100', status=400, code='validation_error')

    profile, message = AffiliateManager.create_affiliate_profile(user_id=user_id, commission_percent=commission_percent)
    if not profile:
        return api_error(message or 'Unable to create affiliate profile', status=400, code='validation_error')

    db.session.refresh(profile)
    return api_success(data={'affiliate': _serialize_admin_affiliate(profile), 'message': message}, status=201)


@api_v1_bp.get('/admin/commissions')
def admin_list_commissions():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(50, max(1, int(request.args.get('per_page', 20))))
    except (ValueError, TypeError):
        return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

    status = (request.args.get('status') or 'all').strip().lower()
    q = (request.args.get('q') or '').strip()

    query = Order.query.filter(Order.affiliate_id.isnot(None))
    valid_statuses = {
        CommissionStatus.PENDING.value,
        CommissionStatus.APPROVED.value,
        CommissionStatus.REJECTED.value,
    }
    if status in valid_statuses:
        query = query.filter(Order.commission_status == status)

    if q:
        like = f'%{q}%'
        query = query.join(User, Order.affiliate_id == User.id).filter(
            or_(
                Order.order_number.ilike(like),
                User.name.ilike(like),
                User.email.ilike(like),
            )
        )

    paginated = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return api_success(
        data={'items': [_serialize_admin_commission(order) for order in paginated.items]},
        meta={
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_items': paginated.total,
                'total_pages': paginated.pages,
            }
        },
    )


@api_v1_bp.put('/admin/commissions/<int:order_id>')
def admin_update_commission(order_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    order = Order.query.get(order_id)
    if not order or not order.affiliate_id:
        return api_error('Commission record not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    status = (payload.get('commission_status') or '').strip().lower()
    valid_statuses = {
        CommissionStatus.PENDING.value,
        CommissionStatus.APPROVED.value,
        CommissionStatus.REJECTED.value,
    }
    if status not in valid_statuses:
        return api_error('Invalid commission status', status=400, code='validation_error')

    if status == CommissionStatus.APPROVED.value:
        order.approve_commission()
    elif status == CommissionStatus.REJECTED.value:
        order.reject_commission()
    else:
        order.commission_status = CommissionStatus.PENDING.value
        db.session.commit()

    db.session.refresh(order)
    return api_success(data={'commission': _serialize_admin_commission(order)})


@api_v1_bp.post('/admin/products')
def admin_create_product():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True) or {}
    name = (payload.get('name') or '').strip()
    description = (payload.get('description') or '').strip()
    price = _parse_int(payload.get('price'), 0)
    stock_quantity = _parse_int(payload.get('stock_quantity'), 0)
    weight_grams = _parse_int(payload.get('weight_grams'), 0)

    if len(name) < 3:
        return api_error('Product name must be at least 3 characters', status=400, code='validation_error')
    if len(description) < 10:
        return api_error('Description must be at least 10 characters', status=400, code='validation_error')
    if price <= 0:
        return api_error('Price must be greater than 0', status=400, code='validation_error')
    if stock_quantity < 0:
        return api_error('Stock cannot be negative', status=400, code='validation_error')
    if weight_grams <= 0:
        return api_error('Weight must be greater than 0', status=400, code='validation_error')

    try:
        product = Product(
            name=name,
            description=description,
            price=price,
            stock_quantity=stock_quantity,
            weight_grams=weight_grams,
            dimensions=(payload.get('dimensions') or '').strip() or None,
            image_url=(payload.get('image_url') or '').strip() or None,
            is_active=bool(payload.get('is_active', True)),
            created_by=current_user.id,
        )
        db.session.add(product)
        db.session.commit()
        return api_success(data={'product': _serialize_admin_product(product)}, status=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Admin product create error: %s', str(exc))
        return api_error('Failed to create product', status=500, code='server_error')


@api_v1_bp.get('/admin/products/<int:product_id>/images')
def admin_get_product_images(product_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    product = Product.query.get(product_id)
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    images = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.display_order.asc(), ProductImage.id.asc()).all()
    return api_success(data={'items': [_serialize_product_image(image) for image in images]})


@api_v1_bp.post('/admin/products/<int:product_id>/images')
def admin_create_product_image(product_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    product = Product.query.get(product_id)
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}

    file_obj = request.files.get('file') if request.files else None
    if file_obj:
        payload = request.form or {}
        storage = get_storage()
        upload_result = storage.upload(file_obj, None)
        if not upload_result.get('success'):
            return api_error(upload_result.get('error') or 'Image upload failed', status=400, code='validation_error')

        image_path = (upload_result.get('url') or '').strip()
        storage_path = (upload_result.get('storage_path') or '').strip() or None
    else:
        image_path = (payload.get('image_path') or '').strip()
        storage_path = (payload.get('storage_path') or '').strip() or None

    if not image_path:
        return api_error('image_path is required', status=400, code='validation_error')

    display_order = max(0, _parse_int(payload.get('display_order'), ProductImage.query.filter_by(product_id=product_id).count()))
    is_primary = _parse_bool(payload.get('is_primary'), False)

    image = ProductImage(
        product_id=product_id,
        image_path=image_path,
        storage_path=storage_path,
        display_order=display_order,
        is_primary=False,
    )
    db.session.add(image)
    db.session.flush()

    if is_primary:
        ProductImage.query.filter_by(product_id=product_id, is_primary=True).update({'is_primary': False}, synchronize_session=False)
        image.is_primary = True
    elif ProductImage.query.filter_by(product_id=product_id, is_primary=True).count() == 0:
        image.is_primary = True

    db.session.commit()
    return api_success(data={'image': _serialize_product_image(image)}, status=201)


@api_v1_bp.put('/admin/products/<int:product_id>/images/<int:image_id>')
def admin_update_product_image(product_id, image_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    image = ProductImage.query.filter_by(id=image_id, product_id=product_id).first()
    if not image:
        return api_error('Image not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}

    if 'image_path' in payload:
        value = (payload.get('image_path') or '').strip()
        if not value:
            return api_error('image_path cannot be empty', status=400, code='validation_error')
        image.image_path = value

    if 'storage_path' in payload:
        image.storage_path = (payload.get('storage_path') or '').strip() or None

    if 'display_order' in payload:
        image.display_order = max(0, _parse_int(payload.get('display_order'), 0))

    if 'is_primary' in payload and bool(payload.get('is_primary')):
        ProductImage.query.filter_by(product_id=product_id, is_primary=True).update({'is_primary': False}, synchronize_session=False)
        image.is_primary = True

    db.session.commit()
    return api_success(data={'image': _serialize_product_image(image)})


@api_v1_bp.delete('/admin/products/<int:product_id>/images/<int:image_id>')
def admin_delete_product_image(product_id, image_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    image = ProductImage.query.filter_by(id=image_id, product_id=product_id).first()
    if not image:
        return api_error('Image not found', status=404, code='not_found')

    was_primary = bool(image.is_primary)

    if image.storage_path:
        storage = get_storage()
        delete_result = storage.delete(image.storage_path)
        if not delete_result.get('success'):
            current_app.logger.warning(
                'Image storage cleanup failed for image_id=%s path=%s error=%s',
                image.id,
                image.storage_path,
                delete_result.get('error')
            )

    db.session.delete(image)
    db.session.flush()

    if was_primary:
        replacement = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.display_order.asc(), ProductImage.id.asc()).first()
        if replacement:
            replacement.is_primary = True

    db.session.commit()
    return api_success(data={'deleted': True})


@api_v1_bp.post('/admin/reviews')
def admin_create_review():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True) or {}
    product_id = _parse_int(payload.get('product_id'), 0)
    product = Product.query.get(product_id)
    if not product:
        return api_error('Product not found', status=404, code='not_found')

    name = (payload.get('name') or '').strip()
    comment = (payload.get('comment') or '').strip()
    rating = _parse_int(payload.get('rating'), 0)
    if len(name) < 2:
        return api_error('Reviewer name is required', status=400, code='validation_error')
    if rating < 1 or rating > 5:
        return api_error('Rating must be between 1 and 5', status=400, code='validation_error')
    if len(comment) < 10:
        return api_error('Review comment must be at least 10 characters', status=400, code='validation_error')

    try:
        review = Review(
            product_id=product_id,
            user_id=None,
            order_item_id=None,
            name=name,
            role=(payload.get('role') or '').strip() or None,
            rating=rating,
            title=(payload.get('title') or '').strip() or None,
            comment=comment,
            is_approved=bool(payload.get('is_approved', True)),
        )
        db.session.add(review)
        db.session.commit()
        return api_success(data={'review': _serialize_admin_review(review)}, status=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Admin review create error: %s', str(exc))
        return api_error('Failed to create review', status=500, code='server_error')


@api_v1_bp.get('/admin/reviews/<int:review_id>')
def admin_get_review(review_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    review = Review.query.get(review_id)
    if not review:
        return api_error('Review not found', status=404, code='not_found')
    return api_success(data={'review': _serialize_admin_review(review)})


@api_v1_bp.put('/admin/reviews/<int:review_id>')
def admin_update_review(review_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    review = Review.query.get(review_id)
    if not review:
        return api_error('Review not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    try:
        if 'name' in payload:
            value = (payload.get('name') or '').strip()
            if len(value) < 2:
                return api_error('Reviewer name is required', status=400, code='validation_error')
            review.name = value
        if 'rating' in payload:
            rating = _parse_int(payload.get('rating'), 0)
            if rating < 1 or rating > 5:
                return api_error('Rating must be between 1 and 5', status=400, code='validation_error')
            review.rating = rating
        if 'title' in payload:
            review.title = (payload.get('title') or '').strip() or None
        if 'comment' in payload:
            value = (payload.get('comment') or '').strip()
            if len(value) < 10:
                return api_error('Review comment must be at least 10 characters', status=400, code='validation_error')
            review.comment = value
        if 'is_approved' in payload:
            review.is_approved = bool(payload.get('is_approved'))

        db.session.commit()
        return api_success(data={'review': _serialize_admin_review(review)})
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Admin review update error: %s', str(exc))
        return api_error('Failed to update review', status=500, code='server_error')


@api_v1_bp.delete('/admin/reviews/<int:review_id>')
def admin_delete_review(review_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    review = Review.query.get(review_id)
    if not review:
        return api_error('Review not found', status=404, code='not_found')

    db.session.delete(review)
    db.session.commit()
    return api_success(data={'deleted': True})


@api_v1_bp.post('/admin/coupons')
def admin_create_coupon():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True) or {}
    code = (payload.get('code') or '').strip().upper()
    if len(code) < 3:
        return api_error('Coupon code must be at least 3 characters', status=400, code='validation_error')
    if CouponCode.query.filter_by(code=code).first():
        return api_error('Coupon code already exists', status=409, code='duplicate')

    discount_percent = payload.get('discount_percent')
    discount_amount_fixed = payload.get('discount_amount_fixed')
    if discount_percent is None and discount_amount_fixed is None:
        return api_error('Provide discount_percent or discount_amount_fixed', status=400, code='validation_error')

    try:
        coupon = CouponCode(
            code=code,
            discount_percent=_parse_int(discount_percent, 0) if discount_percent is not None else None,
            discount_amount_fixed=_parse_int(discount_amount_fixed, 0) if discount_amount_fixed is not None else None,
            coupon_type=(payload.get('coupon_type') or 'promotional').strip().lower(),
            max_uses=_parse_int(payload.get('max_uses'), 0) or None,
            min_order_value=max(0, _parse_int(payload.get('min_order_value'), 0)),
            max_discount=_parse_int(payload.get('max_discount'), 0) or None,
            is_active=bool(payload.get('is_active', True)),
            created_by_user_id=current_user.id,
        )
        db.session.add(coupon)
        db.session.commit()
        return api_success(data={'coupon': _serialize_admin_coupon(coupon)}, status=201)
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Admin coupon create error: %s', str(exc))
        return api_error('Failed to create coupon', status=500, code='server_error')


@api_v1_bp.get('/admin/coupons/<int:coupon_id>')
def admin_get_coupon(coupon_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    coupon = CouponCode.query.get(coupon_id)
    if not coupon:
        return api_error('Coupon not found', status=404, code='not_found')
    return api_success(data={'coupon': _serialize_admin_coupon(coupon)})


@api_v1_bp.put('/admin/coupons/<int:coupon_id>')
def admin_update_coupon(coupon_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    coupon = CouponCode.query.get(coupon_id)
    if not coupon:
        return api_error('Coupon not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    try:
        if 'code' in payload:
            code = (payload.get('code') or '').strip().upper()
            if len(code) < 3:
                return api_error('Coupon code must be at least 3 characters', status=400, code='validation_error')
            existing = CouponCode.query.filter(CouponCode.code == code, CouponCode.id != coupon.id).first()
            if existing:
                return api_error('Coupon code already exists', status=409, code='duplicate')
            coupon.code = code
        if 'coupon_type' in payload:
            coupon.coupon_type = (payload.get('coupon_type') or 'promotional').strip().lower()
        if 'discount_percent' in payload:
            value = payload.get('discount_percent')
            coupon.discount_percent = _parse_int(value, 0) if value is not None else None
        if 'discount_amount_fixed' in payload:
            value = payload.get('discount_amount_fixed')
            coupon.discount_amount_fixed = _parse_int(value, 0) if value is not None else None
        if 'max_uses' in payload:
            coupon.max_uses = _parse_int(payload.get('max_uses'), 0) or None
        if 'min_order_value' in payload:
            coupon.min_order_value = max(0, _parse_int(payload.get('min_order_value'), 0))
        if 'max_discount' in payload:
            coupon.max_discount = _parse_int(payload.get('max_discount'), 0) or None
        if 'is_active' in payload:
            coupon.is_active = bool(payload.get('is_active'))

        db.session.commit()
        return api_success(data={'coupon': _serialize_admin_coupon(coupon)})
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Admin coupon update error: %s', str(exc))
        return api_error('Failed to update coupon', status=500, code='server_error')


@api_v1_bp.post('/admin/coupons/<int:coupon_id>/toggle')
def admin_toggle_coupon(coupon_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    coupon = CouponCode.query.get(coupon_id)
    if not coupon:
        return api_error('Coupon not found', status=404, code='not_found')

    coupon.is_active = not bool(coupon.is_active)
    db.session.commit()
    return api_success(data={'coupon': _serialize_admin_coupon(coupon)})


@api_v1_bp.delete('/admin/coupons/<int:coupon_id>')
def admin_delete_coupon(coupon_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    if current_user.role != UserRole.SUPERADMIN.value:
        return api_error('Only superadmin can delete coupons', status=403, code='forbidden')

    coupon = CouponCode.query.get(coupon_id)
    if not coupon:
        return api_error('Coupon not found', status=404, code='not_found')

    in_use_orders = Order.query.filter_by(coupon_id=coupon.id).count()
    if in_use_orders > 0:
        return api_error('Cannot delete coupon with order history. Disable it instead.', status=400, code='validation_error')

    db.session.delete(coupon)
    db.session.commit()
    return api_success(data={'deleted': True})


@api_v1_bp.get('/admin/coupons/<int:coupon_id>/stats')
def admin_coupon_stats(coupon_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    coupon = CouponCode.query.get(coupon_id)
    if not coupon:
        return api_error('Coupon not found', status=404, code='not_found')

    total_orders = Order.query.filter_by(coupon_id=coupon_id).count()
    recent_orders = Order.query.filter_by(coupon_id=coupon_id).order_by(Order.created_at.desc()).limit(10).all()

    return api_success(
        data={
            'coupon': _serialize_admin_coupon(coupon),
            'summary': {
                'total_orders': total_orders,
                'current_uses': coupon.current_uses,
                'max_uses': coupon.max_uses,
            },
            'recent_orders': [_serialize_order(order) for order in recent_orders],
        }
    )


@api_v1_bp.get('/admin/policies/<string:slug>')
def admin_get_policy(slug):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    policy = PolicyPage.query.filter_by(slug=(slug or '').strip().lower()).first()
    if not policy:
        return api_error('Policy not found', status=404, code='not_found')
    return api_success(data={'policy': _serialize_policy_page(policy)})


@api_v1_bp.put('/admin/policies/<string:slug>')
def admin_update_policy(slug):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    policy = PolicyPage.query.filter_by(slug=(slug or '').strip().lower()).first()
    if not policy:
        return api_error('Policy not found', status=404, code='not_found')

    payload = request.get_json(silent=True) or {}
    title = (payload.get('title') or '').strip()
    content = (payload.get('content') or '').strip()

    if len(title) < 3:
        return api_error('Policy title must be at least 3 characters', status=400, code='validation_error')
    if len(content) < 10:
        return api_error('Policy content must be at least 10 characters', status=400, code='validation_error')

    policy.title = title
    policy.content = content
    policy.updated_by = current_user.id
    policy.updated_at = datetime.utcnow()

    db.session.commit()
    return api_success(data={'policy': _serialize_policy_page(policy)})


@api_v1_bp.get('/affiliate/dashboard')
def affiliate_dashboard():
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')

    profile = AffiliateProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return api_error('Affiliate profile not found', status=404, code='not_found')

    recent_orders = Order.query.filter_by(affiliate_id=current_user.id).order_by(Order.created_at.desc()).limit(10).all()
    total_orders = Order.query.filter_by(affiliate_id=current_user.id).count()
    pending_commissions = Order.query.filter_by(
        affiliate_id=current_user.id,
        commission_status=CommissionStatus.PENDING.value,
    ).count()
    approved_commissions = Order.query.filter_by(
        affiliate_id=current_user.id,
        commission_status=CommissionStatus.APPROVED.value,
    ).count()

    return api_success(
        data={
            'profile': _serialize_admin_affiliate(profile),
            'stats': {
                'total_orders': total_orders,
                'pending_commissions': pending_commissions,
                'approved_commissions': approved_commissions,
                'total_redeemed': profile.total_redeemed,
                'total_redeemed_display': profile.get_total_redeemed_display(),
            },
            'recent_orders': [_serialize_order(order) for order in recent_orders],
        }
    )


def _serialize_user_profile(user):
    """Serialize user profile for API response."""
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'full_name': user.full_name,
        'avatar_url': user.avatar_url,
        'email_marketing_opt_in': bool(user.email_marketing_opt_in),
        'created_at': user.created_at.isoformat() + 'Z' if user.created_at else None,
    }


def _serialize_user_address(address):
    """Serialize user address for API response."""
    return {
        'id': address.id,
        'label': address.label,
        'full_name': address.full_name,
        'phone': address.phone,
        'street_line1': address.street_line1,
        'street_line2': address.street_line2,
        'landmark': address.landmark,
        'city': address.city,
        'state': address.state,
        'pincode': address.pincode,
        'is_default': bool(address.is_default),
        'created_at': address.created_at.isoformat() + 'Z' if address.created_at else None,
    }


@api_v1_bp.get('/users/profile')
def get_user_profile():
    """Get authenticated user's profile."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    
    return api_success(data={'user': _serialize_user_profile(current_user)})


@api_v1_bp.put('/users/profile')
def update_user_profile():
    """Update authenticated user's profile."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    
    payload = request.get_json(silent=True) or {}
    
    try:
        # Validate and update name
        if 'name' in payload:
            name = (payload.get('name') or '').strip()
            if not name or len(name) < 2:
                return api_error('Name must be at least 2 characters', status=400, code='validation_error')
            current_user.name = name
        
        # Validate and update phone
        if 'phone' in payload:
            phone = (payload.get('phone') or '').strip()
            if phone and not phone.isdigit():
                return api_error('Phone must contain only digits', status=400, code='validation_error')
            if phone and len(phone) < 6:
                return api_error('Phone must be at least 6 digits', status=400, code='validation_error')
            current_user.phone = phone if phone else None
        
        # Update full_name
        if 'full_name' in payload:
            full_name = (payload.get('full_name') or '').strip()
            current_user.full_name = full_name if full_name else None
        
        # Update email_marketing_opt_in
        if 'email_marketing_opt_in' in payload:
            current_user.email_marketing_opt_in = bool(payload.get('email_marketing_opt_in'))
        
        db.session.commit()
        
        return api_success(data={'user': _serialize_user_profile(current_user)})
    
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Profile update error: %s', str(exc))
        return api_error('Failed to update profile', status=500, code='server_error')


@api_v1_bp.get('/users/addresses')
def get_user_addresses():
    """Get all saved addresses for authenticated user."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    
    addresses = UserAddress.query.filter_by(user_id=current_user.id).order_by(
        UserAddress.is_default.desc(),
        UserAddress.created_at.desc()
    ).all()
    
    return api_success(data={'addresses': [_serialize_user_address(addr) for addr in addresses]})


@api_v1_bp.post('/users/addresses')
def create_user_address():
    """Create a new saved address for authenticated user."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    
    payload = request.get_json(silent=True) or {}
    
    try:
        # Validate required fields
        full_name = (payload.get('full_name') or '').strip()
        phone = (payload.get('phone') or '').strip()
        street_line1 = (payload.get('street_line1') or '').strip()
        city = (payload.get('city') or '').strip()
        state = (payload.get('state') or '').strip()
        pincode = (payload.get('pincode') or '').strip()
        label = (payload.get('label') or 'Address').strip()
        
        if not full_name or len(full_name) < 2:
            return api_error('Full name must be at least 2 characters', status=400, code='validation_error')
        if not phone or len(phone) < 6 or not phone.replace(' ', '').isdigit():
            return api_error('Invalid phone number', status=400, code='validation_error')
        if not street_line1 or len(street_line1) < 5:
            return api_error('Street address must be at least 5 characters', status=400, code='validation_error')
        if not city or len(city) < 2:
            return api_error('City must be at least 2 characters', status=400, code='validation_error')
        if not state or len(state) < 2:
            return api_error('State must be at least 2 characters', status=400, code='validation_error')
        if not pincode or len(pincode) != 6 or not pincode.isdigit():
            return api_error('Pincode must be exactly 6 digits', status=400, code='validation_error')
        
        address = UserAddress(
            user_id=current_user.id,
            label=label,
            full_name=full_name,
            phone=phone,
            street_line1=street_line1,
            street_line2=payload.get('street_line2', '').strip() or None,
            landmark=payload.get('landmark', '').strip() or None,
            city=city,
            state=state,
            pincode=pincode,
            is_default=False,
        )
        
        # If this is the first address, make it default
        existing_count = UserAddress.query.filter_by(user_id=current_user.id).count()
        if existing_count == 0:
            address.is_default = True
        
        db.session.add(address)
        db.session.commit()
        
        return api_success(data={'address': _serialize_user_address(address)}, status=201)
    
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Address creation error: %s', str(exc))
        return api_error('Failed to create address', status=500, code='server_error')


@api_v1_bp.put('/users/addresses/<int:address_id>')
def update_user_address(address_id):
    """Update a saved address."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    
    address = UserAddress.query.filter_by(id=address_id, user_id=current_user.id).first()
    if not address:
        return api_error('Address not found', status=404, code='not_found')
    
    payload = request.get_json(silent=True) or {}
    
    try:
        # Validate and update full_name
        if 'full_name' in payload:
            full_name = (payload.get('full_name') or '').strip()
            if not full_name or len(full_name) < 2:
                return api_error('Full name must be at least 2 characters', status=400, code='validation_error')
            address.full_name = full_name
        
        # Validate and update phone
        if 'phone' in payload:
            phone = (payload.get('phone') or '').strip()
            if not phone or len(phone) < 6 or not phone.replace(' ', '').isdigit():
                return api_error('Invalid phone number', status=400, code='validation_error')
            address.phone = phone
        
        # Validate and update street_line1
        if 'street_line1' in payload:
            street_line1 = (payload.get('street_line1') or '').strip()
            if not street_line1 or len(street_line1) < 5:
                return api_error('Street address must be at least 5 characters', status=400, code='validation_error')
            address.street_line1 = street_line1
        
        # Update optional fields
        if 'street_line2' in payload:
            address.street_line2 = (payload.get('street_line2') or '').strip() or None
        if 'landmark' in payload:
            address.landmark = (payload.get('landmark') or '').strip() or None
        if 'label' in payload:
            label = (payload.get('label') or '').strip()
            if label:
                address.label = label
        
        # Validate and update city
        if 'city' in payload:
            city = (payload.get('city') or '').strip()
            if not city or len(city) < 2:
                return api_error('City must be at least 2 characters', status=400, code='validation_error')
            address.city = city
        
        # Validate and update state
        if 'state' in payload:
            state = (payload.get('state') or '').strip()
            if not state or len(state) < 2:
                return api_error('State must be at least 2 characters', status=400, code='validation_error')
            address.state = state
        
        # Validate and update pincode
        if 'pincode' in payload:
            pincode = (payload.get('pincode') or '').strip()
            if not pincode or len(pincode) != 6 or not pincode.isdigit():
                return api_error('Pincode must be exactly 6 digits', status=400, code='validation_error')
            address.pincode = pincode
        
        db.session.commit()
        
        return api_success(data={'address': _serialize_user_address(address)})
    
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Address update error: %s', str(exc))
        return api_error('Failed to update address', status=500, code='server_error')


@api_v1_bp.delete('/users/addresses/<int:address_id>')
def delete_user_address(address_id):
    """Delete a saved address."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    
    address = UserAddress.query.filter_by(id=address_id, user_id=current_user.id).first()
    if not address:
        return api_error('Address not found', status=404, code='not_found')
    
    try:
        was_default = address.is_default
        db.session.delete(address)
        db.session.commit()
        
        # If deleted address was default, make the first remaining address default
        if was_default:
            remaining = UserAddress.query.filter_by(user_id=current_user.id).first()
            if remaining:
                remaining.is_default = True
                db.session.commit()
        
        return api_success(data={'success': True}, status=200)
    
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Address deletion error: %s', str(exc))
        return api_error('Failed to delete address', status=500, code='server_error')


@api_v1_bp.put('/users/addresses/<int:address_id>/default')
def set_default_address(address_id):
    """Set an address as the default."""
    if not current_user.is_authenticated:
        return api_error('Authentication required', status=401, code='unauthorized')
    
    address = UserAddress.query.filter_by(id=address_id, user_id=current_user.id).first()
    if not address:
        return api_error('Address not found', status=404, code='not_found')
    
    try:
        # Remove default from all other addresses
        UserAddress.query.filter(
            UserAddress.user_id == current_user.id,
            UserAddress.id != address.id
        ).update({'is_default': False}, synchronize_session=False)
        
        # Set this as default
        address.is_default = True
        db.session.commit()
        
        return api_success(data={'address': _serialize_user_address(address)})
    
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error('Set default address error: %s', str(exc))
        return api_error('Failed to set default address', status=500, code='server_error')
