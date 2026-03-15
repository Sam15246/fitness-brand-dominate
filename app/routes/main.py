from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app, session, jsonify
from flask_login import current_user, login_required
from datetime import datetime
import secrets
from urllib.parse import quote
from app.models import db, Product, ProductVariant, Order, OrderItem, OrderStatus, ShippingStatus, Review, User, UserAddress, AffiliateProfile, CouponCode, PolicyPage, CartItem, Payment, InventoryLog
from app.business_logic import OrderManager, AffiliateManager
from app.utils import send_order_confirmation_email

main_bp = Blueprint('main', __name__)


REVIEW_ELIGIBLE_SHIPPING_STATUS = ShippingStatus.DELIVERED.value


@main_bp.before_request
def capture_affiliate_referral():
    """Capture affiliate referral code from URL and persist in session."""
    ref_code = request.args.get('ref', '').strip().upper()
    if not ref_code:
        return

    affiliate_profile, _ = AffiliateManager.validate_affiliate_code(ref_code)
    if affiliate_profile:
        session['affiliate_code'] = ref_code
        session.modified = True


def generate_order_number():
    """
    Generate unique human-readable order number.
    
    Format: ORD-YYYYMMDDHHMMSS-XXXXXX
    Ensures uniqueness across concurrent orders.
    """
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    random_suffix = secrets.token_hex(3).upper()
    return f'ORD-{timestamp}-{random_suffix}'


def get_whatsapp_redirect_url(order, customer_data=None):
    """
    Generate WhatsApp redirect URL with comprehensive order details.
    
    STANDARDS-COMPLIANT:
    ====================
    - One order number for entire purchase
    - All product items included in WhatsApp message
    - Complete delivery address
    - Order totals and customer details
    
    SCALABILITY:
    - WhatsApp has no strict message size limit
    - URL can handle ~2000+ characters safely
    - Messages remain readable for customer confirmation
    
    Args:
        order: Single Order object (contains multiple OrderItems)
        customer_data: Optional dict with delivery details {name, phone, email, city, state, pincode, address}
        
    Returns:
        str: WhatsApp web URL with encoded pre-filled message
    """
    if not order:
        return f'https://wa.me/{current_app.config["WHATSAPP_NUMBER"]}'
    
    # Get customer data from order or passed parameter
    if customer_data is None:
        customer_data = {
            'name': order.guest_name,
            'phone': order.guest_phone,
            'email': order.guest_email,
            'city': order.city,
            'state': order.state,
            'pincode': order.pincode,
            'address': order.address
        }
    
    # Build comprehensive message in customer-facing format
    message_lines = [
        "Dominate -train anywhere Dominate everywhere",
        "",
        "My DETAILS:",
        f"Name: {customer_data['name']}",
        f"Phone: {customer_data['phone']}",
        f"Email: {customer_data['email']}",
        "",
        "DELIVERY ADDRESS:",
        f"{customer_data['address']}",
        f"{customer_data['city']}, {customer_data['state']} {customer_data['pincode']}",
        "",
        "Need to order the following ITEMS:"
    ]
    
    # Add all items with details (from OrderItems)
    for idx, item in enumerate(order.items, 1):
        product_name = item.product.name if item.product else "Product"
        price_display = f"₹{item.unit_price / 100:.2f}"
        message_lines.append(
            f"{idx}. {product_name}"
        )
        message_lines.append(
            f"   Qty: {item.quantity} | Price: {price_display}"
        )
        message_lines.append(
            f"   Order #: {order.order_number}"
        )
        message_lines.append("")
    
    # Add total summary
    total_amount = order.get_total_price()
    message_lines.extend([
        "TOTAL AMOUNT:",
        f"₹{total_amount / 100:.2f}"
    ])
    
    message = "\n".join(message_lines)
    encoded_message = quote(message)
    wa_number = current_app.config['WHATSAPP_NUMBER']
    
    return f'https://wa.me/{wa_number}?text={encoded_message}'


# ============= CART HELPER FUNCTIONS =============

def get_cart():
    """
    Get cart from database (logged-in) or session (guest).
    
    Returns:
        dict: {product_id: quantity, ...}
    """
    if current_user.is_authenticated:
        # Load cart from database
        cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
        return {str(item.product_id): item.quantity for item in cart_items if item.product and item.product.is_active}
    else:
        # Load cart from session
        if 'cart' not in session:
            session['cart'] = {}
        return session['cart']


def get_or_create_default_variant(product):
    """
    Fetch the product's default variant or create one if absent.

    Transitional helper while the app moves from product-level to variant-level ordering.
    """
    if not product:
        return None

    variant = ProductVariant.query.filter_by(product_id=product.id).order_by(ProductVariant.id.asc()).first()
    if variant:
        return variant

    # Deterministic fallback SKU for legacy products.
    fallback_sku = f'PV-{product.id}-DEFAULT'
    variant = ProductVariant(
        product_id=product.id,
        sku=fallback_sku,
        option_values={},
        price_override=product.price,
        stock_quantity=product.stock_quantity,
        weight_grams=product.weight_grams,
        is_active=product.is_active,
    )
    db.session.add(variant)
    db.session.flush()
    return variant


def get_review_eligible_order_items(user_id, product_id, include_reviewed=False):
    """Get delivered-order items that can be used for review submission."""
    if not user_id or not product_id:
        return []

    query = (
        OrderItem.query
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.user_id == user_id,
            OrderItem.product_id == product_id,
            Order.status != OrderStatus.CANCELLED.value,
            Order.shipping_status == REVIEW_ELIGIBLE_SHIPPING_STATUS,
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


def build_product_review_context(product, user):
    """Build product review eligibility and submission state for the active user."""
    context = {
        'eligible_order_items': [],
        'has_delivered_purchase': False,
        'can_submit_review': False,
        'has_pending_review': False,
        'has_approved_review': False,
    }

    if not product or not user or not user.is_authenticated:
        return context

    delivered_order_items = get_review_eligible_order_items(user.id, product.id, include_reviewed=True)
    eligible_order_items = get_review_eligible_order_items(user.id, product.id, include_reviewed=False)
    submitted_reviews = (
        Review.query
        .filter_by(user_id=user.id, product_id=product.id)
        .order_by(Review.created_at.desc())
        .all()
    )

    context.update({
        'eligible_order_items': eligible_order_items,
        'has_delivered_purchase': bool(delivered_order_items),
        'can_submit_review': bool(eligible_order_items),
        'has_pending_review': any(not review.is_approved for review in submitted_reviews),
        'has_approved_review': any(review.is_approved for review in submitted_reviews),
    })
    return context


def sync_session_cart_to_db():
    """
    Sync session cart to database when user logs in.
    Merges session cart with existing database cart.
    """
    if not current_user.is_authenticated:
        return
    
    session_cart = session.get('cart', {})
    if not session_cart:
        return
    
    for product_id_str, quantity in session_cart.items():
        product_id = int(product_id_str)
        product = Product.query.get(product_id)
        
        if not product or not product.is_active:
            continue

        variant = get_or_create_default_variant(product)
        
        # Check if item already in DB cart
        cart_item = CartItem.query.filter_by(
            user_id=current_user.id,
            product_id=product_id
        ).first()
        
        if cart_item:
            # Update quantity (add to existing)
            cart_item.variant_id = variant.id if variant else None
            available_stock = variant.stock_quantity if variant else product.stock_quantity
            cart_item.quantity = min(cart_item.quantity + quantity, available_stock)
            cart_item.updated_at = datetime.utcnow()
        else:
            # Create new cart item
            cart_item = CartItem(
                user_id=current_user.id,
                product_id=product_id,
                variant_id=variant.id if variant else None,
                quantity=min(quantity, variant.stock_quantity if variant else product.stock_quantity)
            )
            db.session.add(cart_item)
    
    db.session.commit()
    
    # Clear session cart after sync
    session['cart'] = {}
    session.modified = True


def save_cart_item(product_id, quantity, variant_id=None):
    """
    Save cart item to database (logged-in) or session (guest).
    
    Args:
        product_id (int): Product ID
        quantity (int): Quantity to set
    """
    if current_user.is_authenticated:
        # Save to database
        if variant_id is None:
            product = Product.query.get(product_id)
            variant = get_or_create_default_variant(product) if product else None
            variant_id = variant.id if variant else None

        query_filters = {
            'user_id': current_user.id,
            'product_id': product_id,
        }
        if variant_id is not None:
            query_filters['variant_id'] = variant_id

        cart_item = CartItem.query.filter_by(**query_filters).first()
        
        if cart_item:
            cart_item.quantity = quantity
            cart_item.variant_id = variant_id
            cart_item.updated_at = datetime.utcnow()
        else:
            cart_item = CartItem(
                user_id=current_user.id,
                product_id=product_id,
                variant_id=variant_id,
                quantity=quantity
            )
            db.session.add(cart_item)
        
        db.session.commit()
    else:
        # Save to session
        cart = get_cart()
        cart[str(product_id)] = quantity
        session['cart'] = cart
        session.modified = True


def remove_cart_item(product_id):
    """
    Remove cart item from database (logged-in) or session (guest).
    
    Args:
        product_id (int): Product ID to remove
    """
    if current_user.is_authenticated:
        # Remove from database
        CartItem.query.filter_by(
            user_id=current_user.id,
            product_id=product_id
        ).delete()
        db.session.commit()
    else:
        # Remove from session
        cart = get_cart()
        product_id_str = str(product_id)
        if product_id_str in cart:
            del cart[product_id_str]
            session['cart'] = cart
            session.modified = True


def clear_cart():
    """Clear all cart items from database (logged-in) or session (guest)."""
    if current_user.is_authenticated:
        # Clear database cart
        CartItem.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
    else:
        # Clear session cart
        session['cart'] = {}
        session.modified = True


def get_cart_count():
    """Get total number of items in cart."""
    cart = get_cart()
    return sum(cart.values())


def get_cart_items():
    """
    Get cart items with product details and totals.
    
    Returns:
        dict: {
            'items': [{product, quantity, price, subtotal}, ...],
            'total': total_price,
            'count': total_items
        }
    """
    cart = get_cart()
    items = []
    total = 0
    
    for product_id, quantity in cart.items():
        product = Product.query.get(int(product_id))
        if product and product.is_active:
            # Calculate price (use discounted price if discount is active)
            if product.is_discount_active and product.price_discounted and product.price_discounted > 0:
                price = product.price_discounted
            else:
                price = product.price
            
            subtotal = price * quantity
            
            items.append({
                'product': product,
                'quantity': quantity,
                'price': price,
                'subtotal': subtotal
            })
            total += subtotal
    
    return {
        'items': items,
        'total': total,
        'count': sum(item['quantity'] for item in items)
    }


# ============= END CART HELPER FUNCTIONS =============


@main_bp.route('/')
def index():
    """Home page with product listing."""
    featured_products = (
        Product.query
        .filter_by(is_active=True)
        .order_by(Product.created_at.desc())
        .limit(4)
        .all()
    )

    return render_template('public/index.html', featured_products=featured_products)


@main_bp.route('/products')
def products():
    """Full product listing page."""
    page = request.args.get('page', 1, type=int)
    sort = request.args.get('sort', 'newest')
    in_stock = request.args.get('in_stock') == '1'
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)

    query = Product.query.filter_by(is_active=True)

    if in_stock:
        query = query.filter(Product.stock_quantity > 0)

    if min_price is not None:
        query = query.filter(Product.price >= int(min_price * 100))

    if max_price is not None:
        query = query.filter(Product.price <= int(max_price * 100))

    if sort == 'price_low':
        query = query.order_by(Product.price.asc())
    elif sort == 'price_high':
        query = query.order_by(Product.price.desc())
    elif sort == 'name':
        query = query.order_by(Product.name.asc())
    else:
        query = query.order_by(Product.created_at.desc())

    products = query.paginate(page=page, per_page=12)

    return render_template(
        'public/products.html',
        products=products,
        sort=sort,
        in_stock=in_stock,
        min_price=min_price,
        max_price=max_price
    )


@main_bp.route('/product/<slug>')
def product_detail(slug):
    """Product detail page."""
    product = Product.query.filter_by(slug=slug, is_active=True).first_or_404()
    related_products = (
        Product.query
        .filter(Product.is_active == True, Product.id != product.id)
        .limit(3)
        .all()
    )
    
    # FUTURE: Increment view count for analytics
    # product.views_count += 1
    # db.session.commit()
    
    return render_template(
        'public/product.html',
        product=product,
        related_products=related_products,
        review_context=build_product_review_context(product, current_user)
    )


@main_bp.route('/product/<slug>/review', methods=['POST'])
@login_required
def submit_product_review(slug):
    """Submit a product review for a delivered purchase only."""
    product = Product.query.filter_by(slug=slug, is_active=True).first_or_404()
    review_context = build_product_review_context(product, current_user)

    if not review_context['can_submit_review']:
        flash('Only customers with a delivered order can submit a review for this product.', 'warning')
        return redirect(url_for('main.product_detail', slug=product.slug, _anchor='write-review'))

    eligible_order_items = {
        item.id: item for item in review_context['eligible_order_items']
    }
    selected_order_item_id = request.form.get('order_item_id', type=int)

    if selected_order_item_id is None and len(eligible_order_items) == 1:
        selected_order_item_id = next(iter(eligible_order_items))

    selected_order_item = eligible_order_items.get(selected_order_item_id)
    if not selected_order_item:
        flash('Select a valid delivered purchase before submitting your review.', 'danger')
        return redirect(url_for('main.product_detail', slug=product.slug, _anchor='write-review'))

    rating = request.form.get('rating', type=int)
    title = request.form.get('title', '').strip()
    comment = request.form.get('comment', '').strip()

    errors = []

    if rating is None or rating < 1 or rating > 5:
        errors.append('Please select a rating between 1 and 5 stars.')

    if title and len(title) < 3:
        errors.append('Review title must be at least 3 characters long.')

    if not comment or len(comment) < 10:
        errors.append('Review comment must be at least 10 characters long.')

    if Review.query.filter_by(order_item_id=selected_order_item.id).first():
        errors.append('A review has already been submitted for this delivered purchase.')

    if errors:
        for error in errors:
            flash(error, 'danger')
        return redirect(url_for('main.product_detail', slug=product.slug, _anchor='write-review'))

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
        flash('Your review has been submitted. It will appear after approval.', 'success')
    except Exception as exc:
        db.session.rollback()
        current_app.logger.error(f'Review submission error for product {product.id}: {str(exc)}')
        flash('We could not submit your review right now. Please try again.', 'danger')

    return redirect(url_for('main.product_detail', slug=product.slug, _anchor='write-review'))


# ============= SHOPPING CART ROUTES =============

@main_bp.route('/cart')
def cart():
    """Display shopping cart."""
    cart_data = get_cart_items()
    return render_template('public/cart.html', cart=cart_data)


@main_bp.route('/cart/count')
def cart_count():
    """Return current cart item count as JSON for frontend badge sync."""
    return jsonify({'cart_count': get_cart_count()})


@main_bp.route('/cart/add/<int:product_id>', methods=['POST'])
def add_to_cart(product_id):
    """Add product to cart (database for logged-in, session for guests)."""
    product = Product.query.get_or_404(product_id)
    
    if not product.is_active:
        flash('This product is no longer available.', 'danger')
        return redirect(url_for('main.product_detail', slug=product.slug))

    default_variant = get_or_create_default_variant(product)
    available_stock = default_variant.stock_quantity if default_variant else product.stock_quantity
    
    if available_stock < 1:
        flash('This product is out of stock.', 'danger')
        return redirect(url_for('main.product_detail', slug=product.slug))
    
    # Get quantity from form (default 1)
    quantity = request.form.get('quantity', 1, type=int)
    quantity = max(1, min(quantity, available_stock))  # Ensure valid range
    
    # Get current cart
    cart = get_cart()
    product_id_str = str(product_id)
    
    # Calculate new quantity
    if product_id_str in cart:
        new_qty = cart[product_id_str] + quantity
        # Check stock limit
        if new_qty > available_stock:
            new_qty = available_stock
            flash(f'Updated quantity to maximum available stock ({available_stock}).', 'warning')
        else:
            flash(f'Added {quantity} more {product.name} to cart!', 'success')
    else:
        new_qty = quantity
        flash(f'{product.name} added to cart!', 'success')
    
    # Save to database or session
    save_cart_item(product_id, new_qty, variant_id=default_variant.id if default_variant else None)
    
    # Return JSON response for AJAX request
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': True,
            'message': f'{product.name} added to cart!',
            'cart_count': get_cart_count()
        })

    # Return to checkout if "buy_now" is clicked (quick checkout)
    if request.form.get('buy_now'):
        return redirect(url_for('main.checkout'))
    
    # Fallback for non-JS form submissions
    return redirect(request.referrer or url_for('main.product_detail', slug=product.slug))


@main_bp.route('/cart/update/<int:product_id>', methods=['POST'])
def update_cart(product_id):
    """Update product quantity in cart (database for logged-in, session for guests)."""
    cart = get_cart()
    product_id_str = str(product_id)
    
    if product_id_str not in cart:
        flash('Product not in cart.', 'warning')
        return redirect(url_for('main.cart'))
    
    quantity = request.form.get('quantity', type=int)
    
    if quantity < 1:
        # Remove if quantity is 0 or negative
        remove_cart_item(product_id)
        flash('Item removed from cart.', 'info')
        return redirect(url_for('main.cart'))
    
    # Check stock
    product = Product.query.get(product_id)
    if product:
        if quantity > product.stock_quantity:
            quantity = product.stock_quantity
            flash(f'Quantity adjusted to available stock ({product.stock_quantity}).', 'warning')
        
        save_cart_item(product_id, quantity)
        flash('Cart updated.', 'success')
    
    return redirect(url_for('main.cart'))


@main_bp.route('/cart/remove/<int:product_id>', methods=['POST'])
def remove_from_cart(product_id):
    """Remove product from cart (database for logged-in, session for guests)."""
    remove_cart_item(product_id)
    flash('Item removed from cart.', 'success')
    return redirect(url_for('main.cart'))


@main_bp.route('/cart/clear', methods=['POST'])
def clear_cart_route():
    """Clear all items from cart (database for logged-in, session for guests)."""
    clear_cart()
    flash('Cart cleared.', 'info')
    return redirect(url_for('main.cart'))


# ============= END SHOPPING CART ROUTES =============

# ============= CHECKOUT FROM CART =============

@main_bp.route('/checkout', methods=['GET', 'POST'])
def checkout():
    """
    Unified checkout page for cart items.
    
    WORKFLOW:
    =========
    1. GET: Display cart items + order form
    2. POST: Process order submission
    
    DESIGN (STANDARDS-COMPLIANT):
    =============================
    - Creates ONE Order for the entire cart
    - Creates ONE OrderItem per product in cart
    - One order number for entire purchase
    - Shows all cart items with prices
    - Single order form for delivery details
    - Processes all cart items in transaction
    - Returns WhatsApp link (if successful) or shows errors
    - Supports coupon codes (affiliate + promotional)
    - Calculates customer discount + affiliate commission
    
    COUPON LOGIC (NEW):
    ==================
    - Accepts coupon code from URL (?code=) or form field
    - Validates coupon: active, not expired, usage limits OK
    - Calculates discount: percent-based or fixed amount
    - Shows customer what they save
    - Applies to final total (affects commission base calculation)
    - Commission calculated on ACTUAL revenue (after discount) - Option A
    
    FUTURE IMPROVEMENTS:
    - Shipping cost calculation
    - Payment gateway integration
    """
    
    # Get cart data
    cart_data = get_cart_items()
    
    # Redirect to shopping cart if empty
    if not cart_data['items']:
        flash('Your cart is empty. Add some products first!', 'info')
        return redirect(url_for('main.cart'))

    saved_addresses = []
    selected_address = None
    selected_address_id = request.form.get('saved_address_id', type=int) if request.method == 'POST' else None

    form_values = {
        'customer_name': current_user.name if current_user.is_authenticated else '',
        'email': current_user.email if current_user.is_authenticated else '',
        'phone_number': current_user.phone if current_user.is_authenticated and current_user.phone else '',
        'city': '',
        'state': '',
        'pincode': '',
        'address': '',
        'coupon_code': '',
        'saved_address_id': '',
    }

    if current_user.is_authenticated:
        saved_addresses = UserAddress.query.filter_by(user_id=current_user.id).order_by(
            UserAddress.is_default.desc(),
            UserAddress.created_at.desc()
        ).all()

        if saved_addresses and request.method == 'GET':
            selected_address = saved_addresses[0]
            selected_address_id = selected_address.id
            form_values.update({
                'customer_name': selected_address.full_name,
                'phone_number': selected_address.phone,
                'city': selected_address.city,
                'state': selected_address.state,
                'pincode': selected_address.pincode,
                'address': ', '.join(
                    [part for part in [selected_address.street_line1, selected_address.street_line2, selected_address.landmark] if part]
                ),
                'saved_address_id': selected_address.id,
            })

    if request.method == 'POST':
        form_values.update({
            'customer_name': request.form.get('customer_name', '').strip(),
            'email': request.form.get('email', '').strip().lower(),
            'phone_number': request.form.get('phone_number', '').strip(),
            'city': request.form.get('city', '').strip(),
            'state': request.form.get('state', '').strip(),
            'pincode': request.form.get('pincode', '').strip(),
            'address': request.form.get('address', '').strip(),
            'coupon_code': request.form.get('coupon_code', '').strip().upper(),
            'saved_address_id': selected_address_id or '',
        })

        if current_user.is_authenticated and selected_address_id:
            selected_address = UserAddress.query.filter_by(
                id=selected_address_id,
                user_id=current_user.id
            ).first()

            if selected_address:
                form_values.update({
                    'customer_name': selected_address.full_name,
                    'phone_number': selected_address.phone,
                    'city': selected_address.city,
                    'state': selected_address.state,
                    'pincode': selected_address.pincode,
                    'address': ', '.join(
                        [part for part in [selected_address.street_line1, selected_address.street_line2, selected_address.landmark] if part]
                    ),
                })

    def render_checkout_page():
        return render_template(
            'public/checkout.html',
            cart=cart_data,
            coupon_code=coupon_code,
            applied_discount=applied_discount,
            discount_message=discount_message,
            referral_detected=referral_detected,
            saved_addresses=saved_addresses,
            selected_address_id=selected_address_id,
            form_values=form_values,
        )
    
    # Get coupon code from URL, form, or session
    # Supports legacy referral links (?ref=CODE) captured in session['affiliate_code']
    coupon_code = (request.args.get('code', '').strip().upper() or 
                   request.form.get('coupon_code', '').strip().upper() or 
                   session.get('coupon_code', '').strip().upper() or
                   session.get('affiliate_code', '').strip().upper())
    
    coupon = None
    applied_discount = 0
    discount_message = None
    referral_detected = bool(session.get('affiliate_code', '').strip())
    
    if coupon_code:
        # Look up coupon code in CouponCode table
        from app.models import CouponCode
        coupon = CouponCode.query.filter_by(code=coupon_code).first()
        
        if coupon:
            # Validate coupon
            is_valid, reason = coupon.can_apply_to_order(cart_data['total'])
            if is_valid:
                # Calculate discount
                applied_discount = coupon.calculate_discount(cart_data['total'])
                discount_message = f"✓ {coupon.get_discount_display()} (Coupon: {coupon_code})"
                session['coupon_code'] = coupon_code
                session.modified = True
            else:
                flash(f'Coupon code unavailable: {reason}', 'warning')
                coupon = None
                applied_discount = 0
                session.pop('coupon_code', None)
        else:
            flash(f'Invalid coupon code: {coupon_code}', 'warning')
            session.pop('coupon_code', None)
            coupon = None
            applied_discount = 0
    
    if request.method == 'POST':
        # Extract form data
        name = form_values['customer_name']
        phone = form_values['phone_number']
        email = form_values['email']
        city = form_values['city']
        state = form_values['state']
        pincode = form_values['pincode']
        address = form_values['address']
        email_opt_in = request.form.get('email_opt_in', False) == 'on'
        coupon_code_form = (
            form_values['coupon_code'] or
            coupon_code or
            session.get('coupon_code', '').strip().upper() or
            session.get('affiliate_code', '').strip().upper()
        )
        
        # Validation
        errors = []
        
        if not name or len(name) < 3:
            errors.append('Please provide a valid name (at least 3 characters)')
        
        if not phone or len(phone) != 10 or not phone.isdigit() or phone[0] < '6':
            errors.append('Please provide a valid 10-digit phone number (start with 6-9)')
        
        if not email or '@' not in email:
            errors.append('Please provide a valid email address')
        
        if not city or len(city) < 2:
            errors.append('Please provide a valid city name')
        
        if not state:
            errors.append('Please select a state')
        
        if not pincode or len(pincode) != 6 or not pincode.isdigit():
            errors.append('Please provide a valid 6-digit pincode')
        
        if not address or len(address) < 10:
            errors.append('Please provide a valid delivery address (at least 10 characters)')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_checkout_page()
        
        # Process checkout - create ONE order with multiple OrderItems
        try:
            customer_data = {
                'name': name,
                'phone': phone,
                'email': email,
                'city': city,
                'state': state,
                'pincode': pincode,
                'address': address
            }
            
            # Validate stock for all items before creating order
            for item in cart_data['items']:
                product = item['product']
                quantity = item['quantity']
                variant = get_or_create_default_variant(product)
                stock_to_check = variant.stock_quantity if variant else product.stock_quantity
                if quantity > stock_to_check:
                    flash(f'{product.name}: Only {stock_to_check} available in stock', 'danger')
                    return render_checkout_page()
            
            # Create single order
            order = Order(
                order_number=generate_order_number(),
                user_id=current_user.id if current_user.is_authenticated else None,
                address_id=selected_address.id if selected_address else None,
                guest_name=name,
                guest_phone=phone,
                guest_email=email,
                city=city,
                state=state,
                pincode=pincode,
                address=address
            )
            
            # Add coupon if provided
            if coupon:
                order.coupon_id = coupon.id
                order.applied_discount = applied_discount
                order.discount_type = coupon.coupon_type
            
            # Add affiliate if provided (only if coupon is affiliate type OR legacy affiliate code)
            if coupon_code_form:
                # First, try to find via coupon
                if coupon and coupon.coupon_type == 'affiliate':
                    order.affiliate_id = coupon.affiliate_id
                else:
                    # Fallback to legacy affiliate code validation
                    affiliate_profile_val, msg = AffiliateManager.validate_affiliate_code(coupon_code_form)
                    if affiliate_profile_val:
                        order.affiliate_id = affiliate_profile_val.user_id
            
            db.session.add(order)
            db.session.flush()  # Generate order ID before creating items
            
            # Create OrderItems for each product in cart
            for item in cart_data['items']:
                product = item['product']
                quantity = item['quantity']
                variant = get_or_create_default_variant(product)
                
                # Get price snapshot (use discounted price if active)
                if variant and variant.price_override is not None:
                    unit_price = variant.price_override
                elif product.is_discount_active and product.price_discounted:
                    unit_price = product.price_discounted
                else:
                    unit_price = product.price
                
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    variant_id=variant.id if variant else None,
                    variant_snapshot=variant.option_values if variant else None,
                    quantity=quantity,
                    unit_price=unit_price
                )
                db.session.add(order_item)
            
            db.session.commit()
            
            # Send confirmation email
            send_order_confirmation_email(order)
            
            # Update user email opt-in if logged in
            if current_user.is_authenticated and email_opt_in:
                current_user.email_marketing_opt_in = True
                db.session.commit()

            # Optionally store/update this address for logged-in users
            if current_user.is_authenticated and request.form.get('save_address') == 'on':
                address_parts = [part.strip() for part in address.split(',') if part.strip()]
                street_line1 = address_parts[0] if address_parts else address
                street_line2 = address_parts[1] if len(address_parts) > 1 else None
                landmark = ', '.join(address_parts[2:]) if len(address_parts) > 2 else None

                address_label = request.form.get('address_label', 'Home').strip() or 'Home'
                set_default = request.form.get('set_default_address') == 'on'

                address_record = selected_address
                if not address_record:
                    address_record = UserAddress(user_id=current_user.id)
                    db.session.add(address_record)

                address_record.label = address_label
                address_record.full_name = name
                address_record.phone = phone
                address_record.street_line1 = street_line1
                address_record.street_line2 = street_line2
                address_record.landmark = landmark
                address_record.city = city
                address_record.state = state
                address_record.pincode = pincode

                if set_default:
                    UserAddress.query.filter(
                        UserAddress.user_id == current_user.id,
                        UserAddress.id != address_record.id
                    ).update({'is_default': False}, synchronize_session=False)
                    address_record.is_default = True
                elif not saved_addresses:
                    address_record.is_default = True

                db.session.commit()
            
            # Clear the cart (database or session)
            clear_cart()
            
            # Redirect to WhatsApp with complete order and customer data
            wa_url = get_whatsapp_redirect_url(order, customer_data)
            
            # Store order number for confirmation page
            session['checkout_order'] = order.order_number
            session.pop('coupon_code', None)
            session.modified = True
            
            return redirect(wa_url)
        
        except Exception as e:
            db.session.rollback()
            flash('An error occurred while processing your order. Please try again.', 'danger')
            current_app.logger.error(f'Checkout error: {str(e)}')
            return render_checkout_page()
    
    # GET request - show checkout form with cart items
    return render_checkout_page()

# ============= END CHECKOUT =============

@main_bp.route('/order/<int:product_id>/start')
def order_start(product_id):
    """
    Guest vs Login decision page.
    
    PRIMARY FLOW: Guest checkout (no account required)
    SECONDARY: Optional login for order tracking
    
    Supports:
    - Continuing as guest (frictionless)
    - Logging in if already registered
    - Creating account inline (future: implement register endpoint)
    
    FUTURE SCALABILITY:
    - Social login (Google, WhatsApp Auth)
    - One-time password authentication
    """
    product = Product.query.get_or_404(product_id)
    
    if not product.is_active:
        flash('This product is no longer available.', 'danger')
        return redirect(url_for('main.index'))
    
    return render_template('public/order_start.html', product=product)


@main_bp.route('/order/<int:product_id>/form', methods=['GET', 'POST'])
def order_form(product_id):
    """
    Unified order form for all users (guests and registered users, including admins).
    
    GOVERNANCE PRINCIPLE:
    =====================
    Admin privileges are STRICTLY LIMITED to dashboard access and user management.
    Admins order through the SAME flow as regular users - no special treatment.
    This ensures:
    - Fair pricing (no admin discounts/bypasses)
    - Audit trail consistency (all orders captured uniformly)
    - System simplicity (one checkout flow for everyone)
    - No admin abuse of ordering system
    
    AFFILIATE REFERRAL SYSTEM:
    ==========================
    - Optional affiliate_code parameter in URL
    - Affiliate earns commission when order is CONFIRMED by admin
    - Self-referral prevented (user can't use own code)
    - Commission credited as store credit (wallet balance)
    
    BUSINESS FLOW:
    ==============
    1. Customer places order (stock NOT reduced)
    2. Admin confirms order → stock reduced, commission calculated
    3. Admin ships order → tracking info added
    4. Admin approves commission → wallet credited
    
    CHECKOUT BEHAVIOR:
    - GET: Display form with pre-fill for logged-in users
    - POST: Process order submission
    
    Handles:
    - Guest checkout (all required fields: name, phone, address, city, quantity)
    - Logged-in user (auto-fill from profile, allow editing)
    - Admins (same flow as regular users - can order like anyone else)
    - Email marketing opt-in checkbox (optional, GDPR compliant)
    - Stock validation before order creation
    - Affiliate code tracking
    - WhatsApp redirect for order confirmation
    
    FUTURE SCALABILITY:
    - Inventory reservation for 10 mins during checkout (prevent overselling)
    - Applied coupon/discount codes (centralized discount logic)
    - Multiple payment method support (Razorpay, Stripe, etc)
    - Address auto-fill from saved addresses (UX improvement)
    - Express checkout (one-click reorder)
    - Order tracking via WhatsApp Business API
    - CRM integration (sync with HubSpot, Salesforce)
    - Email sequence automation (order confirmation, shipping, delivery)
    """
    product = Product.query.get_or_404(product_id)
    
    if not product.is_active:
        flash('This product is no longer available.', 'danger')
        return redirect(url_for('main.index'))
    
    # Get affiliate code from URL parameter
    affiliate_code = request.args.get('ref', '').strip().upper()
    affiliate_profile = None
    
    if affiliate_code:
        affiliate_profile, msg = AffiliateManager.validate_affiliate_code(affiliate_code)
        if not affiliate_profile:
            flash(f'Invalid affiliate code: {msg}', 'warning')
            affiliate_code = None
    
    # Get default quantity from URL param
    qty_default = request.args.get('qty', 1, type=int)
    if qty_default < 1:
        qty_default = 1
    if product.stock_quantity > 0 and qty_default > product.stock_quantity:
        qty_default = product.stock_quantity
    
    if request.method == 'POST':
        # Extract form data
        name = request.form.get('customer_name', '').strip()
        phone = request.form.get('phone_number', '').strip()
        email = request.form.get('email', '').strip().lower()
        city = request.form.get('city', '').strip()
        state = request.form.get('state', '').strip()
        pincode = request.form.get('pincode', '').strip()
        address = request.form.get('address', '').strip()
        quantity_str = request.form.get('quantity', '').strip()
        email_opt_in = request.form.get('email_opt_in', False) == 'on'
        affiliate_code_form = request.form.get('affiliate_code', '').strip().upper() or affiliate_code
        
        # Validation with detailed error messages
        errors = []
        
        if not name or len(name) < 3:
            errors.append('Please provide a valid name (at least 3 characters)')
        
        # Phone validation: Must be 10 digits, starting with 6-9
        if not phone or len(phone) != 10 or not phone.isdigit() or phone[0] < '6':
            errors.append('Please provide a valid 10-digit phone number (start with 6-9)')
        
        if not email or '@' not in email:
            errors.append('Please provide a valid email address')
        
        if not city or len(city) < 2:
            errors.append('Please provide a valid city name')
        
        if not state:
            errors.append('Please select a state')
        
        # Pincode validation: Must be exactly 6 digits
        if not pincode or len(pincode) != 6 or not pincode.isdigit():
            errors.append('Please provide a valid 6-digit pincode')
        
        if not address or len(address) < 10:
            errors.append('Please provide a valid delivery address (at least 10 characters)')
        
        try:
            quantity = int(quantity_str)
            if quantity <= 0:
                errors.append('Quantity must be greater than 0')
        except (ValueError, TypeError):
            errors.append('Please provide a valid quantity')
        
        # Check stock availability (NOTE: Stock NOT reduced on placement, only on confirmation)
        if not errors and quantity > product.stock_quantity:
            errors.append(f'Only {product.stock_quantity} items in stock')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('public/order_form.html', product=product, qty_default=qty_default, affiliate_code=affiliate_code)
        
        # Create order using OrderManager
        try:
            customer_data = {
                'name': name,
                'phone': phone,
                'email': email,
                'city': city,
                'state': state,
                'pincode': pincode,
                'address': address
            }
            
            # Create order
            order = Order(
                order_number=generate_order_number(),
                user_id=current_user.id if current_user.is_authenticated else None,
                guest_name=name,
                guest_phone=phone,
                guest_email=email,
                city=city,
                state=state,
                pincode=pincode,
                address=address
            )
            
            # Add affiliate if provided
            if affiliate_code_form:
                affiliate_profile_val, msg = AffiliateManager.validate_affiliate_code(affiliate_code_form)
                if affiliate_profile_val:
                    order.affiliate_id = affiliate_profile_val.user_id
            
            db.session.add(order)
            db.session.flush()  # Generate order ID
            
            # Get price snapshot (use discounted price if active)
            variant = get_or_create_default_variant(product)
            if variant and variant.price_override is not None:
                unit_price = variant.price_override
            elif product.is_discount_active and product.price_discounted:
                unit_price = product.price_discounted
            else:
                unit_price = product.price
            
            # Create OrderItem for the product
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                variant_id=variant.id if variant else None,
                variant_snapshot=variant.option_values if variant else None,
                quantity=quantity,
                unit_price=unit_price
            )
            db.session.add(order_item)
            db.session.commit()
            
            # Send confirmation email (async in future)
            send_order_confirmation_email(order)
            
            # Update user email opt-in if logged in
            if current_user.is_authenticated and email_opt_in:
                current_user.email_marketing_opt_in = True
                db.session.commit()
            
            # Redirect to WhatsApp with comprehensive order details
            wa_url = get_whatsapp_redirect_url(order, customer_data)
            return redirect(wa_url)
        
        except Exception as e:
            db.session.rollback()
            flash('An error occurred while processing your order. Please try again.', 'danger')
            current_app.logger.error(f'Order creation error: {str(e)}')
            return render_template('public/order_form.html', product=product, qty_default=qty_default, affiliate_code=affiliate_code)
    
    return render_template('public/order_form.html', product=product, qty_default=qty_default, affiliate_code=affiliate_code)


@main_bp.route('/order/confirmation/<order_number>')
def order_confirmation(order_number):
    """
    Order confirmation page after WhatsApp redirect.
    
    Displayed after user completes WhatsApp flow.
    Shows order summary and next steps.
    """
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    
    return render_template('public/confirmation.html', order=order)


@main_bp.route('/my-orders')
@login_required
def my_orders():
    """
    My Orders page for logged-in users.
    
    Shows:
    - Order history (newest first)
    - Order status
    - Order details with product info
    - Link to contact support
    
    FUTURE SCALABILITY:
    - Order filtering (pending, completed, shipped)
    - Reorder button for quick checkout
    - Download invoice as PDF
    - WhatsApp order status updates
    - Cancellation requests
    """
    page = request.args.get('page', 1, type=int)
    orders = (
        Order.query
        .filter_by(user_id=current_user.id)
        .order_by(Order.created_at.desc())
        .paginate(page=page, per_page=10)
    )

    order_item_ids = [item.id for order in orders.items for item in order.items]
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

        for order in orders.items:
            is_delivered_purchase = (
                order.status != OrderStatus.CANCELLED.value and
                order.shipping_status == REVIEW_ELIGIBLE_SHIPPING_STATUS
            )
            if not is_delivered_purchase:
                continue

            for item in order.items:
                if item.id not in reviewed_order_item_ids:
                    reviewable_order_item_ids.add(item.id)
    
    return render_template(
        'public/my_orders.html',
        orders=orders,
        reviewable_order_item_ids=reviewable_order_item_ids,
        reviewed_order_item_ids=reviewed_order_item_ids,
    )


@main_bp.route('/profile')
@login_required
def profile():
    """User profile page (editable details can be expanded in next phase)."""
    return render_template('public/profile.html')


@main_bp.route('/about')
def about():
    """About page."""
    return render_template('public/about.html')


@main_bp.route('/contact')
def contact():
    """Contact page."""
    from flask import current_app
    # FUTURE: Email contact form implementation
    return render_template('public/contact.html', whatsapp_number=current_app.config['WHATSAPP_NUMBER'])


@main_bp.route('/shipping')
def shipping():
    """Shipping policy page - loaded from database."""
    policy = PolicyPage.query.filter_by(slug='shipping').first_or_404()
    return render_template('public/policy.html', policy=policy)


@main_bp.route('/returns')
def returns():
    """Returns & refunds policy page - loaded from database."""
    policy = PolicyPage.query.filter_by(slug='returns').first_or_404()
    return render_template('public/policy.html', policy=policy)


@main_bp.route('/terms')
def terms():
    """Terms & conditions page - loaded from database."""
    policy = PolicyPage.query.filter_by(slug='terms').first_or_404()
    return render_template('public/policy.html', policy=policy)


@main_bp.route('/privacy')
def privacy():
    """Privacy policy page - loaded from database."""
    policy = PolicyPage.query.filter_by(slug='privacy').first_or_404()
    return render_template('public/policy.html', policy=policy)


# ============= AFFILIATE DASHBOARD ROUTES =============

@main_bp.route('/affiliate/dashboard')
@login_required
def affiliate_dashboard():
    """
    Affiliate dashboard for influencers.
    
    Shows:
    - Affiliate code and referral link
    - Total orders via referral
    - Pending commission
    - Wallet balance
    - Total earned
    - Recent referral orders
    
    FUTURE ENHANCEMENTS:
    - Performance charts (weekly/monthly trends)
    - Social media post templates
    - Product images for sharing
    - Commission history export
    - Withdrawal request (for cash payout)
    """
    # Check if user has affiliate profile
    affiliate = AffiliateProfile.query.filter_by(user_id=current_user.id).first()
    
    if not affiliate:
        flash('You do not have an affiliate profile. Contact us to become an affiliate!', 'info')
        return redirect(url_for('main.index'))
    
    # Get stats
    total_referrals = affiliate.get_referral_count()
    confirmed_referrals = affiliate.get_confirmed_referral_count()
    pending_commission = affiliate.get_pending_commission()
    
    # Get recent referral orders
    recent_orders = Order.query.filter_by(affiliate_id=current_user.id).order_by(
        Order.created_at.desc()
    ).limit(10).all()

    # Get active affiliate coupon codes that this affiliate can share
    affiliate_coupons = CouponCode.query.filter_by(
        affiliate_id=current_user.id,
        coupon_type='affiliate',
        is_active=True
    ).order_by(CouponCode.created_at.desc()).all()
    
    # Generate referral link
    referral_link = url_for('main.index', ref=affiliate.affiliate_code, _external=True)
    
    return render_template(
        'affiliate/dashboard.html',
        affiliate=affiliate,
        total_referrals=total_referrals,
        confirmed_referrals=confirmed_referrals,
        pending_commission=pending_commission,
        recent_orders=recent_orders,
        referral_link=referral_link,
        affiliate_coupons=affiliate_coupons
    )


@main_bp.route('/affiliate/link/<int:product_id>')
@login_required
def affiliate_product_link(product_id):
    """
    Generate affiliate link for specific product.
    
    Format: /product/<slug>?ref=<affiliate_code>
    """
    affiliate = AffiliateProfile.query.filter_by(user_id=current_user.id).first()
    
    if not affiliate:
        flash('You do not have an affiliate profile.', 'danger')
        return redirect(url_for('main.index'))
    
    product = Product.query.get_or_404(product_id)
    
    # Generate product affiliate link
    referral_link = url_for(
        'main.product_detail',
        slug=product.slug,
        ref=affiliate.affiliate_code,
        _external=True
    )
    
    return render_template(
        'affiliate/product_link.html',
        product=product,
        referral_link=referral_link,
        affiliate=affiliate
    )
