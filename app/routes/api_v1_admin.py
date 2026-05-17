from datetime import datetime
import re

from flask import current_app, request
from flask_login import current_user
from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from app.business_logic import AffiliateManager, OrderManager
from app.models import AffiliateProfile, CartItem, CommissionStatus, CouponCode, Order, OrderItem, OrderStatus, PolicyPage, Product, ProductImage, ProductVariant, Review, ShippingStatus, User, UserRole, db
from app.routes.api_v1_common import api_error, api_success
from app.storage import get_storage


def _normalize_sku_fragment(value):
    text = re.sub(r'[^A-Za-z0-9]+', '-', str(value or '').strip().upper())
    return re.sub(r'-+', '-', text).strip('-')


def _generate_variant_sku(product, option_values):
    base_candidates = [getattr(product, 'sku', None), getattr(product, 'slug', None), product.name, f'PRD-{product.id}']
    base = next((fragment for fragment in (_normalize_sku_fragment(value) for value in base_candidates) if fragment), f'PRD-{product.id}')

    option_fragments = []
    for key, value in (option_values or {}).items():
        fragment = _normalize_sku_fragment(value) or _normalize_sku_fragment(key)
        if fragment:
            option_fragments.append(fragment)

    sku_root = '-'.join([base] + option_fragments[:3]).strip('-') or f'PRD-{product.id}'
    sku_root = sku_root[:92].strip('-') or f'PRD-{product.id}'

    sku = sku_root
    suffix = 2
    while ProductVariant.query.filter_by(sku=sku).first():
        suffix_text = f'-{suffix}'
        sku = f"{sku_root[: max(1, 100 - len(suffix_text))].rstrip('-')}{suffix_text}"
        suffix += 1

    return sku


def register_api_v1_admin_routes(
    api_v1_bp,
    parse_int,
    parse_bool,
    serialize_order,
    serialize_product_image,
    serialize_policy_page,
    require_admin,
    serialize_admin_product,
    serialize_admin_user,
    serialize_admin_review,
    serialize_admin_coupon,
    serialize_admin_affiliate,
    serialize_admin_commission,
):
    @api_v1_bp.get('/admin/dashboard')
    def admin_dashboard():
        auth_error = require_admin()
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
                'recent_orders': [serialize_order(order) for order in recent_orders],
            }
        )

    @api_v1_bp.get('/admin/orders')
    def admin_list_orders():
        auth_error = require_admin()
        if auth_error:
            return auth_error

        try:
            page = max(1, int(request.args.get('page', 1)))
            per_page = min(50, max(1, int(request.args.get('per_page', 20))))
        except (ValueError, TypeError):
            return api_error('Invalid page or per_page parameter', status=400, code='validation_error')

        status_filter = (request.args.get('status') or 'all').strip().lower()
        q = (request.args.get('q') or '').strip()

        query = Order.query.options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.items).selectinload(OrderItem.variant),
        )

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
            data={'orders': [serialize_order(order) for order in paginated.items]},
            meta={
                'pagination': {
                    'current_page': page,
                    'per_page': per_page,
                    'total_items': paginated.total,
                    'total_pages': paginated.pages,
                }
            },
        )

    @api_v1_bp.post('/admin/orders')
    def admin_create_order():
        auth_error = require_admin()
        if auth_error:
            return auth_error

        payload = request.get_json(silent=True) or {}

        customer_name = (payload.get('customer_name') or '').strip()
        phone_number = (payload.get('phone_number') or '').strip()
        email = (payload.get('email') or '').strip().lower()
        city = (payload.get('city') or '').strip()
        state = (payload.get('state') or '').strip()
        pincode = (payload.get('pincode') or '').strip()
        address = (payload.get('address') or '').strip()
        confirm_now = parse_bool(payload.get('confirm_now'), True)

        required_fields = {
            'customer_name': customer_name,
            'phone_number': phone_number,
            'email': email,
            'city': city,
            'state': state,
            'pincode': pincode,
            'address': address,
        }
        missing_fields = [field for field, value in required_fields.items() if not value]
        if missing_fields:
            return api_error(f"Missing required fields: {', '.join(missing_fields)}", status=400, code='validation_error')

        if len(customer_name) < 3:
            return api_error('Customer name must be at least 3 characters', status=400, code='validation_error')
        if len(phone_number) != 10 or not phone_number.isdigit():
            return api_error('Phone number must be a valid 10-digit number', status=400, code='validation_error')
        if '@' not in email:
            return api_error('Email must be valid', status=400, code='validation_error')
        if len(pincode) != 6 or not pincode.isdigit():
            return api_error('Pincode must be a valid 6-digit number', status=400, code='validation_error')

        items_payload = payload.get('items') or []
        if not isinstance(items_payload, list) or not items_payload:
            return api_error('At least one order item is required', status=400, code='validation_error')

        normalized_items = []

        for index, raw_item in enumerate(items_payload, 1):
            if not isinstance(raw_item, dict):
                return api_error(f'Item #{index} is invalid', status=400, code='validation_error')

            product_id = parse_int(raw_item.get('product_id'), 0)
            variant_id = parse_int(raw_item.get('variant_id'), 0)
            quantity = max(parse_int(raw_item.get('quantity'), 0), 0)
            unit_price = parse_int(raw_item.get('unit_price'), None)

            if product_id <= 0:
                return api_error(f'Item #{index}: valid product is required', status=400, code='validation_error')
            if quantity <= 0:
                return api_error(f'Item #{index}: quantity must be greater than 0', status=400, code='validation_error')

            product = db.session.get(Product, product_id)
            if not product or not product.is_active:
                return api_error(f'Item #{index}: product not found or inactive', status=404, code='not_found')

            variant = None
            if variant_id > 0:
                variant = ProductVariant.query.filter_by(id=variant_id, product_id=product.id).first()
                if not variant or not variant.is_active:
                    return api_error(f'Item #{index}: variant not found or inactive', status=404, code='not_found')
            else:
                variant = _get_or_create_default_variant(product)

            available_stock = variant.get_available_quantity() if variant else product.get_available_quantity()
            if quantity > available_stock:
                return api_error(
                    f'Item #{index}: only {available_stock} available for {product.name}',
                    status=409,
                    code='insufficient_stock',
                )

            resolved_unit_price = unit_price if unit_price and unit_price > 0 else _resolve_unit_price(product, variant)
            if resolved_unit_price <= 0:
                return api_error(f'Item #{index}: unit price must be greater than 0', status=400, code='validation_error')

            normalized_items.append((product, variant, quantity, resolved_unit_price))

        order = Order(
            order_number=_generate_order_number(),
            user_id=None,
            currency_code='INR',
            guest_name=customer_name,
            guest_phone=phone_number,
            guest_email=email,
            city=city,
            state=state,
            pincode=pincode,
            address=address,
            status=OrderStatus.PENDING.value,
            shipping_status=ShippingStatus.PENDING.value,
        )

        db.session.add(order)
        db.session.flush()

        for product, variant, quantity, resolved_unit_price in normalized_items:
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    variant_id=variant.id if variant else None,
                    variant_snapshot=variant.option_values if variant else None,
                    quantity=quantity,
                    unit_price=resolved_unit_price,
                )
            )

        db.session.flush()

        if confirm_now:
            if not order.confirm_order():
                db.session.rollback()
                return api_error('Unable to confirm manual order', status=409, code='insufficient_stock')
        else:
            db.session.commit()

        db.session.refresh(order)
        return api_success(data={'order': serialize_order(order)}, status=201)

    @api_v1_bp.get('/admin/orders/<int:order_id>')
    def admin_get_order(order_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        order = (
            Order.query.options(
                selectinload(Order.items).selectinload(OrderItem.product),
                selectinload(Order.items).selectinload(OrderItem.variant),
            )
            .filter_by(id=order_id)
            .first()
        )
        if not order:
            return api_error('Order not found', status=404, code='not_found')

        return api_success(data={'order': serialize_order(order)})

    @api_v1_bp.put('/admin/orders/<int:order_id>/status')
    def admin_update_order_status(order_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        order = db.session.get(Order, order_id)
        if not order:
            return api_error('Order not found', status=404, code='not_found')

        payload = request.get_json(silent=True) or {}
        status_value = (payload.get('status') or '').strip().lower()
        valid_statuses = {value.value for value in OrderStatus}
        if status_value not in valid_statuses:
            return api_error('Invalid order status', status=400, code='validation_error')

        VALID_TRANSITIONS = {
            'pending': {'confirmed', 'cancelled'},
            'confirmed': {'shipped', 'cancelled'},
            'shipped': {'delivered', 'cancelled'},
            'delivered': set(),
            'cancelled': set(),
        }

        allowed = VALID_TRANSITIONS.get(order.status, set())
        if status_value not in allowed:
            return api_error(
                f'Cannot transition from {order.status} to {status_value}',
                status=400,
                code='invalid_transition',
            )

        order.status = status_value
        db.session.commit()
        db.session.refresh(order)
        return api_success(data={'order': serialize_order(order)})

    @api_v1_bp.put('/admin/orders/<int:order_id>/shipping')
    def admin_update_order_shipping(order_id):
        auth_error = require_admin()
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

        order = db.session.get(Order, order_id)
        return api_success(data={'order': serialize_order(order), 'message': message})

    @api_v1_bp.post('/admin/orders/<int:order_id>/confirm')
    def admin_confirm_order(order_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        success, message = OrderManager.confirm_order(order_id=order_id, admin_id=current_user.id)
        if not success:
            return api_error(message or 'Unable to confirm order', status=400, code='validation_error')

        order = db.session.get(Order, order_id)
        return api_success(data={'order': serialize_order(order), 'message': message})

    @api_v1_bp.post('/admin/orders/<int:order_id>/cancel')
    def admin_cancel_order(order_id):
        auth_error = require_admin()
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

        order = db.session.get(Order, order_id)
        return api_success(data={'order': serialize_order(order), 'message': message})

    @api_v1_bp.get('/admin/products')
    def admin_list_products():
        auth_error = require_admin()
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
            data={'items': [serialize_admin_product(product) for product in paginated.items]},
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
        auth_error = require_admin()
        if auth_error:
            return auth_error

        product = db.session.get(Product, product_id)
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        return api_success(data={'product': serialize_admin_product(product)})

    @api_v1_bp.put('/admin/products/<int:product_id>')
    def admin_update_product(product_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        product = db.session.get(Product, product_id)
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
            return api_success(data={'product': serialize_admin_product(product)})
        except ValueError:
            db.session.rollback()
            return api_error('Invalid numeric field value', status=400, code='validation_error')
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Admin product update error: %s', str(exc))
            return api_error('Failed to update product', status=500, code='server_error')

    @api_v1_bp.delete('/admin/products/<int:product_id>')
    def admin_archive_product(product_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        product = db.session.get(Product, product_id)
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        product.is_active = False
        db.session.commit()
        return api_success(data={'product': serialize_admin_product(product), 'archived': True})

    @api_v1_bp.delete('/admin/products/<int:product_id>/hard-delete')
    def admin_hard_delete_product(product_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        if current_user.role != UserRole.SUPERADMIN.value:
            return api_error('Only superadmin can hard delete products', status=403, code='forbidden')

        product = db.session.get(Product, product_id)
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        from app.models import InventoryLog

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
        auth_error = require_admin()
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
            data={'items': [serialize_admin_user(user) for user in paginated.items]},
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
        auth_error = require_admin()
        if auth_error:
            return auth_error

        user = db.session.get(User, user_id)
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
        return api_success(data={'user': serialize_admin_user(user)})

    @api_v1_bp.delete('/admin/users/<int:user_id>')
    def admin_delete_user(user_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        if current_user.role != UserRole.SUPERADMIN.value:
            return api_error('Only superadmin can delete users', status=403, code='forbidden')

        user = db.session.get(User, user_id)
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
        auth_error = require_admin()
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
            data={'items': [serialize_admin_review(review) for review in paginated.items]},
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
        auth_error = require_admin()
        if auth_error:
            return auth_error

        policies = PolicyPage.query.order_by(PolicyPage.slug.asc()).all()
        return api_success(data={'items': [serialize_policy_page(policy) for policy in policies]})

    @api_v1_bp.get('/admin/coupons')
    def admin_list_coupons():
        auth_error = require_admin()
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
            data={'items': [serialize_admin_coupon(coupon) for coupon in paginated.items]},
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
        auth_error = require_admin()
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
            data={'items': [serialize_admin_affiliate(profile) for profile in paginated.items]},
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
        auth_error = require_admin()
        if auth_error:
            return auth_error

        if current_user.role != UserRole.SUPERADMIN.value:
            return api_error('Only superadmin can manage affiliate account status', status=403, code='forbidden')

        profile = db.session.get(AffiliateProfile, affiliate_id)
        if not profile:
            return api_error('Affiliate profile not found', status=404, code='not_found')

        payload = request.get_json(silent=True) or {}
        if 'is_active' not in payload:
            return api_error('is_active is required', status=400, code='validation_error')

        profile.is_active = bool(payload.get('is_active'))
        db.session.commit()
        db.session.refresh(profile)
        return api_success(data={'affiliate': serialize_admin_affiliate(profile)})

    @api_v1_bp.post('/admin/affiliates/<int:affiliate_id>/wallet-adjust')
    def admin_adjust_affiliate_wallet(affiliate_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        if current_user.role != UserRole.SUPERADMIN.value:
            return api_error('Only superadmin can adjust affiliate wallet', status=403, code='forbidden')

        profile = db.session.get(AffiliateProfile, affiliate_id)
        if not profile:
            return api_error('Affiliate profile not found', status=404, code='not_found')

        payload = request.get_json(silent=True) or {}
        amount = parse_int(payload.get('amount'), 0)
        if amount == 0:
            return api_error('amount must be a non-zero integer (paise)', status=400, code='validation_error')

        if not profile.adjust_wallet(amount, (payload.get('reason') or '').strip()):
            return api_error('Wallet adjustment failed. Balance cannot go negative.', status=400, code='validation_error')

        db.session.refresh(profile)
        return api_success(data={'affiliate': serialize_admin_affiliate(profile)})

    @api_v1_bp.post('/admin/users/<int:user_id>/affiliate-profile')
    def admin_create_affiliate_profile(user_id):
        auth_error = require_admin()
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
        return api_success(data={'affiliate': serialize_admin_affiliate(profile), 'message': message}, status=201)

    @api_v1_bp.get('/admin/commissions')
    def admin_list_commissions():
        auth_error = require_admin()
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
            data={'items': [serialize_admin_commission(order) for order in paginated.items]},
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
        auth_error = require_admin()
        if auth_error:
            return auth_error

        order = db.session.get(Order, order_id)
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
        return api_success(data={'commission': serialize_admin_commission(order)})

    @api_v1_bp.post('/admin/products')
    def admin_create_product():
        auth_error = require_admin()
        if auth_error:
            return auth_error

        payload = request.get_json(silent=True) or {}
        name = (payload.get('name') or '').strip()
        description = (payload.get('description') or '').strip()
        price = parse_int(payload.get('price'), 0)
        stock_quantity = parse_int(payload.get('stock_quantity'), 0)
        weight_grams = parse_int(payload.get('weight_grams'), 0)

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
            return api_success(data={'product': serialize_admin_product(product)}, status=201)
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Admin product create error: %s', str(exc))
            return api_error('Failed to create product', status=500, code='server_error')

    @api_v1_bp.get('/admin/products/<int:product_id>/images')
    def admin_get_product_images(product_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        product = db.session.get(Product, product_id)
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        images = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.display_order.asc(), ProductImage.id.asc()).all()
        return api_success(data={'items': [serialize_product_image(image) for image in images]})

    @api_v1_bp.post('/admin/products/<int:product_id>/images')
    def admin_create_product_image(product_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        product = db.session.get(Product, product_id)
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

        display_order = max(0, parse_int(payload.get('display_order'), ProductImage.query.filter_by(product_id=product_id).count()))
        is_primary = parse_bool(payload.get('is_primary'), False)

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
        return api_success(data={'image': serialize_product_image(image)}, status=201)

    @api_v1_bp.put('/admin/products/<int:product_id>/images/<int:image_id>')
    def admin_update_product_image(product_id, image_id):
        auth_error = require_admin()
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
            image.display_order = max(0, parse_int(payload.get('display_order'), 0))

        if 'is_primary' in payload and bool(payload.get('is_primary')):
            ProductImage.query.filter_by(product_id=product_id, is_primary=True).update({'is_primary': False}, synchronize_session=False)
            image.is_primary = True

        db.session.commit()
        return api_success(data={'image': serialize_product_image(image)})

    @api_v1_bp.delete('/admin/products/<int:product_id>/images/<int:image_id>')
    def admin_delete_product_image(product_id, image_id):
        auth_error = require_admin()
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
        auth_error = require_admin()
        if auth_error:
            return auth_error

        payload = request.get_json(silent=True) or {}
        product_id = parse_int(payload.get('product_id'), 0)
        product = db.session.get(Product, product_id)
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        name = (payload.get('name') or '').strip()
        comment = (payload.get('comment') or '').strip()
        rating = parse_int(payload.get('rating'), 0)
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
            return api_success(data={'review': serialize_admin_review(review)}, status=201)
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Admin review create error: %s', str(exc))
            return api_error('Failed to create review', status=500, code='server_error')

    @api_v1_bp.get('/admin/reviews/<int:review_id>')
    def admin_get_review(review_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        review = db.session.get(Review, review_id)
        if not review:
            return api_error('Review not found', status=404, code='not_found')
        return api_success(data={'review': serialize_admin_review(review)})

    @api_v1_bp.put('/admin/reviews/<int:review_id>')
    def admin_update_review(review_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        review = db.session.get(Review, review_id)
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
                rating = parse_int(payload.get('rating'), 0)
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
            return api_success(data={'review': serialize_admin_review(review)})
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Admin review update error: %s', str(exc))
            return api_error('Failed to update review', status=500, code='server_error')

    @api_v1_bp.delete('/admin/reviews/<int:review_id>')
    def admin_delete_review(review_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        review = db.session.get(Review, review_id)
        if not review:
            return api_error('Review not found', status=404, code='not_found')

        db.session.delete(review)
        db.session.commit()
        return api_success(data={'deleted': True})

    @api_v1_bp.post('/admin/coupons')
    def admin_create_coupon():
        auth_error = require_admin()
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
                discount_percent=parse_int(discount_percent, 0) if discount_percent is not None else None,
                discount_amount_fixed=parse_int(discount_amount_fixed, 0) if discount_amount_fixed is not None else None,
                coupon_type=(payload.get('coupon_type') or 'promotional').strip().lower(),
                max_uses=parse_int(payload.get('max_uses'), 0) or None,
                min_order_value=max(0, parse_int(payload.get('min_order_value'), 0)),
                max_discount=parse_int(payload.get('max_discount'), 0) or None,
                is_active=bool(payload.get('is_active', True)),
                created_by_user_id=current_user.id,
            )
            db.session.add(coupon)
            db.session.commit()
            return api_success(data={'coupon': serialize_admin_coupon(coupon)}, status=201)
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Admin coupon create error: %s', str(exc))
            return api_error('Failed to create coupon', status=500, code='server_error')

    @api_v1_bp.get('/admin/coupons/<int:coupon_id>')
    def admin_get_coupon(coupon_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        coupon = db.session.get(CouponCode, coupon_id)
        if not coupon:
            return api_error('Coupon not found', status=404, code='not_found')
        return api_success(data={'coupon': serialize_admin_coupon(coupon)})

    @api_v1_bp.put('/admin/coupons/<int:coupon_id>')
    def admin_update_coupon(coupon_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        coupon = db.session.get(CouponCode, coupon_id)
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
                coupon.discount_percent = parse_int(value, 0) if value is not None else None
            if 'discount_amount_fixed' in payload:
                value = payload.get('discount_amount_fixed')
                coupon.discount_amount_fixed = parse_int(value, 0) if value is not None else None
            if 'max_uses' in payload:
                coupon.max_uses = parse_int(payload.get('max_uses'), 0) or None
            if 'min_order_value' in payload:
                coupon.min_order_value = max(0, parse_int(payload.get('min_order_value'), 0))
            if 'max_discount' in payload:
                coupon.max_discount = parse_int(payload.get('max_discount'), 0) or None
            if 'is_active' in payload:
                coupon.is_active = bool(payload.get('is_active'))

            db.session.commit()
            return api_success(data={'coupon': serialize_admin_coupon(coupon)})
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Admin coupon update error: %s', str(exc))
            return api_error('Failed to update coupon', status=500, code='server_error')

    @api_v1_bp.post('/admin/coupons/<int:coupon_id>/toggle')
    def admin_toggle_coupon(coupon_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        coupon = db.session.get(CouponCode, coupon_id)
        if not coupon:
            return api_error('Coupon not found', status=404, code='not_found')

        coupon.is_active = not bool(coupon.is_active)
        db.session.commit()
        return api_success(data={'coupon': serialize_admin_coupon(coupon)})

    @api_v1_bp.delete('/admin/coupons/<int:coupon_id>')
    def admin_delete_coupon(coupon_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        if current_user.role != UserRole.SUPERADMIN.value:
            return api_error('Only superadmin can delete coupons', status=403, code='forbidden')

        coupon = db.session.get(CouponCode, coupon_id)
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
        auth_error = require_admin()
        if auth_error:
            return auth_error

        coupon = db.session.get(CouponCode, coupon_id)
        if not coupon:
            return api_error('Coupon not found', status=404, code='not_found')

        total_orders = Order.query.filter_by(coupon_id=coupon_id).count()
        recent_orders = Order.query.filter_by(coupon_id=coupon_id).order_by(Order.created_at.desc()).limit(10).all()

        return api_success(
            data={
                'coupon': serialize_admin_coupon(coupon),
                'summary': {
                    'total_orders': total_orders,
                    'current_uses': coupon.current_uses,
                    'max_uses': coupon.max_uses,
                },
                'recent_orders': [serialize_order(order) for order in recent_orders],
            }
        )

    @api_v1_bp.get('/admin/policies/<string:slug>')
    def admin_get_policy(slug):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        policy = PolicyPage.query.filter_by(slug=(slug or '').strip().lower()).first()
        if not policy:
            return api_error('Policy not found', status=404, code='not_found')
        return api_success(data={'policy': serialize_policy_page(policy)})

    @api_v1_bp.put('/admin/policies/<string:slug>')
    def admin_update_policy(slug):
        auth_error = require_admin()
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
        return api_success(data={'policy': serialize_policy_page(policy)})

    # ──────────────────────────────────────────
    # Product Variants
    # ──────────────────────────────────────────

    def _serialize_variant(v):
        return {
            'id': v.id,
            'product_id': v.product_id,
            'sku': v.sku,
            'option_values': v.option_values or {},
            'price_override': v.price_override,
            'effective_price': v.get_effective_price(),
            'stock_quantity': v.stock_quantity,
            'weight_grams': v.get_effective_weight_grams(),
            'is_active': bool(v.is_active),
            'created_at': v.created_at.isoformat() + 'Z' if v.created_at else None,
        }

    @api_v1_bp.get('/admin/products/<int:product_id>/variants')
    def admin_list_variants(product_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        product = Product.query.get(product_id)
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        variants = ProductVariant.query.filter_by(product_id=product_id).order_by(ProductVariant.id).all()
        return api_success(data={'variants': [_serialize_variant(v) for v in variants]})

    @api_v1_bp.post('/admin/products/<int:product_id>/variants')
    def admin_create_variant(product_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        product = Product.query.get(product_id)
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        payload = request.get_json(silent=True) or {}
        sku = (payload.get('sku') or '').strip()
        option_values = payload.get('option_values') or {}
        price_override = parse_int(payload.get('price_override'), None)
        stock_quantity = parse_int(payload.get('stock_quantity'), 0)
        is_active = parse_bool(payload.get('is_active'), True)

        if not sku:
            sku = _generate_variant_sku(product, option_values)
        elif len(sku) < 2:
            return api_error('SKU must be at least 2 characters', status=400, code='validation_error')

        existing = ProductVariant.query.filter_by(sku=sku).first()
        if existing:
            return api_error('A variant with this SKU already exists', status=400, code='duplicate_sku')

        variant = ProductVariant(
            product_id=product_id,
            sku=sku,
            option_values=option_values,
            price_override=price_override,
            stock_quantity=max(stock_quantity, 0),
            is_active=is_active,
        )
        db.session.add(variant)
        db.session.commit()

        return api_success(data={'variant': _serialize_variant(variant)}, status=201)

    @api_v1_bp.put('/admin/products/<int:product_id>/variants/<int:variant_id>')
    def admin_update_variant(product_id, variant_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        variant = ProductVariant.query.filter_by(id=variant_id, product_id=product_id).first()
        if not variant:
            return api_error('Variant not found', status=404, code='not_found')

        payload = request.get_json(silent=True) or {}

        if 'sku' in payload:
            sku = (payload['sku'] or '').strip()
            if not sku:
                sku = variant.sku
            elif len(sku) < 2:
                return api_error('SKU must be at least 2 characters', status=400, code='validation_error')
            existing = ProductVariant.query.filter(ProductVariant.sku == sku, ProductVariant.id != variant_id).first()
            if existing:
                return api_error('A variant with this SKU already exists', status=400, code='duplicate_sku')
            variant.sku = sku

        if 'option_values' in payload:
            variant.option_values = payload['option_values'] or {}
        if 'price_override' in payload:
            variant.price_override = parse_int(payload['price_override'], None)
        if 'stock_quantity' in payload:
            variant.stock_quantity = max(parse_int(payload['stock_quantity'], 0), 0)
        if 'is_active' in payload:
            variant.is_active = parse_bool(payload['is_active'], True)

        db.session.commit()
        return api_success(data={'variant': _serialize_variant(variant)})

    @api_v1_bp.delete('/admin/products/<int:product_id>/variants/<int:variant_id>')
    def admin_delete_variant(product_id, variant_id):
        auth_error = require_admin()
        if auth_error:
            return auth_error

        variant = ProductVariant.query.filter_by(id=variant_id, product_id=product_id).first()
        if not variant:
            return api_error('Variant not found', status=404, code='not_found')

        # Prevent deletion if variant is referenced in orders
        order_item_count = OrderItem.query.filter_by(variant_id=variant_id).count()
        if order_item_count > 0:
            return api_error(
                f'Cannot delete variant — it is referenced in {order_item_count} order(s). Deactivate it instead.',
                status=400,
                code='has_orders',
            )

        db.session.delete(variant)
        db.session.commit()
        return api_success(data={'deleted': True})
