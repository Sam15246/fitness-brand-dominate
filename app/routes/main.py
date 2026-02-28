from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app, session, jsonify
from flask_login import current_user, login_required
from datetime import datetime
import secrets
from urllib.parse import quote
from app.models import db, Product, Order, User, AffiliateProfile, PolicyPage
from app.business_logic import OrderManager, AffiliateManager
from app.utils import send_order_confirmation_email

main_bp = Blueprint('main', __name__)


def generate_order_number():
    """
    Generate unique human-readable order number.
    
    Format: ORD-YYYYMMDDHHMMSS-XXXXXX
    Ensures uniqueness across concurrent orders.
    """
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    random_suffix = secrets.token_hex(3).upper()
    return f'ORD-{timestamp}-{random_suffix}'


def get_whatsapp_redirect_url(order):
    """
    Generate WhatsApp redirect URL with pre-filled message.
    
    FUTURE SCALABILITY:
    - Add payment gateway confirmation before WhatsApp
    - Include payment proof/receipt in message
    - Add order tracking link
    - Integrate with WhatsApp Business API for rich messages
    
    Args:
        order: Order object with all details
        
    Returns:
        str: WhatsApp web URL with encoded pre-filled message
    """
    message = (
        f"Hello, I would like to place an order:\n\n"
        f"Order Number: {order.order_number}\n"
        f"Product: {order.product.name}\n"
        f"Quantity: {order.quantity}\n"
        f"Total: {order.get_total_price_display()}\n"
        f"Name: {order.guest_name}\n"
        f"City: {order.city}\n"
        f"Phone: {order.guest_phone}"
    )
    
    wa_number = current_app.config['WHATSAPP_NUMBER']
    encoded_message = quote(message)
    
    return f'https://wa.me/{wa_number}?text={encoded_message}'


# ============= CART HELPER FUNCTIONS =============

def get_cart():
    """Get cart from session or initialize empty cart."""
    if 'cart' not in session:
        session['cart'] = {}
    return session['cart']


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
        .limit(3)
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
    
    return render_template('public/product.html', product=product, related_products=related_products)


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
    """Add product to cart."""
    product = Product.query.get_or_404(product_id)
    
    if not product.is_active:
        flash('This product is no longer available.', 'danger')
        return redirect(url_for('main.product_detail', slug=product.slug))
    
    if product.stock_quantity < 1:
        flash('This product is out of stock.', 'danger')
        return redirect(url_for('main.product_detail', slug=product.slug))
    
    # Get quantity from form (default 1)
    quantity = request.form.get('quantity', 1, type=int)
    quantity = max(1, min(quantity, product.stock_quantity))  # Ensure valid range
    
    # Get or initialize cart
    cart = get_cart()
    product_id_str = str(product_id)
    
    # Update quantity (add to existing or set new)
    if product_id_str in cart:
        new_qty = cart[product_id_str] + quantity
        # Check stock limit
        if new_qty > product.stock_quantity:
            cart[product_id_str] = product.stock_quantity
            flash(f'Updated quantity to maximum available stock ({product.stock_quantity}).', 'warning')
        else:
            cart[product_id_str] = new_qty
            flash(f'Added {quantity} more {product.name} to cart!', 'success')
    else:
        cart[product_id_str] = quantity
        flash(f'{product.name} added to cart!', 'success')
    
    session['cart'] = cart
    session.modified = True
    
    # Return JSON response for AJAX request
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': True,
            'message': f'{product.name} added to cart!',
            'cart_count': get_cart_count()
        })

    # Return to cart if "buy_now" is clicked
    if request.form.get('buy_now'):
        return redirect(url_for('main.cart'))
    
    # Fallback for non-JS form submissions
    return redirect(request.referrer or url_for('main.product_detail', slug=product.slug))


@main_bp.route('/cart/update/<int:product_id>', methods=['POST'])
def update_cart(product_id):
    """Update product quantity in cart."""
    cart = get_cart()
    product_id_str = str(product_id)
    
    if product_id_str not in cart:
        flash('Product not in cart.', 'warning')
        return redirect(url_for('main.cart'))
    
    quantity = request.form.get('quantity', type=int)
    
    if quantity < 1:
        # Remove if quantity is 0 or negative
        del cart[product_id_str]
        session['cart'] = cart
        session.modified = True
        flash('Item removed from cart.', 'info')
        return redirect(url_for('main.cart'))
    
    # Check stock
    product = Product.query.get(product_id)
    if product:
        if quantity > product.stock_quantity:
            quantity = product.stock_quantity
            flash(f'Quantity adjusted to available stock ({product.stock_quantity}).', 'warning')
        
        cart[product_id_str] = quantity
        session['cart'] = cart
        session.modified = True
        flash('Cart updated.', 'success')
    
    return redirect(url_for('main.cart'))


@main_bp.route('/cart/remove/<int:product_id>', methods=['POST'])
def remove_from_cart(product_id):
    """Remove product from cart."""
    cart = get_cart()
    product_id_str = str(product_id)
    
    if product_id_str in cart:
        del cart[product_id_str]
        session['cart'] = cart
        session.modified = True
        flash('Item removed from cart.', 'success')
    
    return redirect(url_for('main.cart'))


@main_bp.route('/cart/clear', methods=['POST'])
def clear_cart():
    """Clear all items from cart."""
    session['cart'] = {}
    session.modified = True
    flash('Cart cleared.', 'info')
    return redirect(url_for('main.cart'))


# ============= END SHOPPING CART ROUTES =============


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
            
            order, message = OrderManager.place_order(
                product_id=product.id,
                quantity=quantity,
                customer_data=customer_data,
                affiliate_code=affiliate_code_form,
                user_id=current_user.id if current_user.is_authenticated else None
            )
            
            if not order:
                flash(message, 'danger')
                return render_template('public/order_form.html', product=product, qty_default=qty_default, affiliate_code=affiliate_code)
            
            # Send confirmation email (async in future)
            send_order_confirmation_email(order)
            
            # Update user email opt-in if logged in
            if current_user.is_authenticated and email_opt_in:
                current_user.email_marketing_opt_in = True
                db.session.commit()
            
            # Redirect to WhatsApp
            wa_url = get_whatsapp_redirect_url(order)
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
    
    return render_template('public/my_orders.html', orders=orders)


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
    
    # Generate referral link
    referral_link = url_for('main.index', ref=affiliate.affiliate_code, _external=True)
    
    return render_template(
        'affiliate/dashboard.html',
        affiliate=affiliate,
        total_referrals=total_referrals,
        confirmed_referrals=confirmed_referrals,
        pending_commission=pending_commission,
        recent_orders=recent_orders,
        referral_link=referral_link
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
