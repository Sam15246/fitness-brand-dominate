from flask import current_app, request
from flask_login import current_user
from sqlalchemy.orm import selectinload

from app.models import Order, OrderItem, OrderStatus, Product, Review, ShippingStatus, UserAddress, UserRole, db
from app.routes.api_v1_common import api_error, api_success


def register_api_v1_checkout_order_routes(
    api_v1_bp,
    build_cart_payload,
    resolve_coupon,
    parse_int,
    get_or_create_default_variant,
    generate_order_number,
    clear_cart_internal,
    build_whatsapp_redirect_url,
    serialize_order,
    send_order_confirmation_email,
    validate_affiliate_code,
):
    @api_v1_bp.get('/checkout/preview')
    def checkout_preview():
        cart = build_cart_payload()
        if not cart['items']:
            return api_error('Your cart is empty', status=400, code='empty_cart')

        coupon_code = (request.args.get('coupon_code') or '').strip().upper()
        coupon, discount, coupon_error = resolve_coupon(cart['total'], coupon_code)
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
        cart = build_cart_payload()
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
        address_id = parse_int(payload.get('address_id'), 0)
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

        coupon, discount, coupon_error = resolve_coupon(cart['total'], coupon_code)
        if coupon_error:
            return coupon_error

        try:
            for item in cart['items']:
                product = db.session.get(Product, item['product_id'])
                if not product or not product.is_active:
                    return api_error('Some products are no longer available', status=409, code='product_unavailable')
                variant = get_or_create_default_variant(product)
                stock_to_check = variant.get_available_quantity() if variant else product.get_available_quantity()
                if item['quantity'] > stock_to_check:
                    return api_error(
                        f"{product.name}: only {stock_to_check} available in stock",
                        status=409,
                        code='insufficient_stock',
                    )

            order = Order(
                order_number=generate_order_number(),
                user_id=current_user.id if current_user.is_authenticated else None,
                address_id=selected_address.id if selected_address else None,
                currency_code='INR',
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
                    affiliate_profile, _ = validate_affiliate_code(coupon_code)
                    if affiliate_profile:
                        order.affiliate_id = affiliate_profile.user_id

            db.session.add(order)
            db.session.flush()

            for item in cart['items']:
                product = db.session.get(Product, item['product_id'])
                variant = get_or_create_default_variant(product)
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

            clear_cart_internal()

            customer_data = {
                'name': customer_name,
                'phone': phone_number,
                'email': email,
                'city': city,
                'state': state,
                'pincode': pincode,
                'address': address,
            }
            whatsapp_url = build_whatsapp_redirect_url(order, customer_data)

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

        return api_success(data={'order': serialize_order(order)})

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

        return api_success(data={'order': serialize_order(order)})

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
                'orders': [serialize_order(order) for order in paginated.items],
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

