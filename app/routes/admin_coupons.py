"""
Admin Coupon Management Routes

Handles CRUD operations for coupon codes (coupons, affiliate codes, promotions)
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from app.models import db, User, CouponCode, UserRole
from app.decorators import admin_required
from datetime import datetime, timedelta

admin_coupons_bp = Blueprint('admin_coupons', __name__, url_prefix='/admin/coupons')


@admin_coupons_bp.route('/', methods=['GET'])
@admin_required
def list_coupons():
    """
    List all coupon codes with filtering and sorting.
    """
    page = request.args.get('page', 1, type=int)
    coupon_type = request.args.get('type', 'all')
    sort_by = request.args.get('sort', 'created_at')
    
    # Base query
    query = CouponCode.query
    
    # Filter by type
    if coupon_type != 'all':
        query = query.filter_by(coupon_type=coupon_type)
    
    # Count stats
    total_coupons = query.count()
    active_coupons = CouponCode.query.filter_by(is_active=True).count()
    affiliate_coupons = CouponCode.query.filter_by(coupon_type='affiliate').count()
    promo_coupons = CouponCode.query.filter_by(coupon_type='promotional').count()
    
    # Sort
    if sort_by == 'usage':
        query = query.order_by(CouponCode.current_uses.desc())
    elif sort_by == 'created':
        query = query.order_by(CouponCode.created_at.desc())
    else:
        query = query.order_by(CouponCode.created_at.desc())
    
    # Paginate
    paginated = query.paginate(page=page, per_page=20)
    coupons = paginated.items
    
    # Get coupon types for filter dropdown
    coupon_types = ['affiliate', 'promotional', 'seasonal', 'loyalty']
    
    return render_template('admin/coupons/list.html',
                         coupons=coupons,
                         paginated=paginated,
                         coupon_type=coupon_type,
                         sort_by=sort_by,
                         coupon_types=coupon_types,
                         total_coupons=total_coupons,
                         active_coupons=active_coupons,
                         affiliate_coupons=affiliate_coupons,
                         promo_coupons=promo_coupons)


@admin_coupons_bp.route('/create', methods=['GET', 'POST'])
@admin_required
def create_coupon():
    """
    Create new coupon code.
    """
    if request.method == 'POST':
        code = request.form.get('code', '').strip().upper()
        coupon_type = request.form.get('coupon_type', 'promotional')
        discount_percent = request.form.get('discount_percent', '', type=int) or None
        discount_amount = request.form.get('discount_amount', '', type=int) or None
        max_uses = request.form.get('max_uses', '', type=int) or None
        min_order_value = request.form.get('min_order_value', 0, type=int)
        max_discount = request.form.get('max_discount', '', type=int) or None
        affiliate_id = request.form.get('affiliate_id', '', type=int) or None
        expires_at_str = request.form.get('expires_at', '')
        is_active = request.form.get('is_active', 'on') == 'on'
        
        # Validation
        errors = []
        
        if not code or len(code) < 3:
            errors.append('Coupon code must be at least 3 characters')
        
        # Check if code already exists
        if CouponCode.query.filter_by(code=code).first():
            errors.append('Coupon code already exists')
        
        if not discount_percent and not discount_amount:
            errors.append('You must set either a percentage or fixed discount')
        
        if discount_percent and (discount_percent < 0 or discount_percent > 100):
            errors.append('Discount percentage must be between 0 and 100')
        
        if discount_amount and discount_amount < 0:
            errors.append('Fixed discount amount cannot be negative')
        
        if max_uses and max_uses <= 0:
            errors.append('Max uses must be greater than 0')
        
        if min_order_value < 0:
            errors.append('Min order value cannot be negative')
        
        if coupon_type == 'affiliate' and not affiliate_id:
            errors.append('Affiliate coupon must have an affiliate selected')
        
        # Parse expiry date if provided
        expires_at = None
        if expires_at_str:
            try:
                expires_at = datetime.strptime(expires_at_str, '%Y-%m-%d')
            except ValueError:
                errors.append('Invalid expiry date format')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('admin/coupons/form.html', action='create')
        
        # Create coupon
        try:
            coupon = CouponCode(
                code=code,
                coupon_type=coupon_type,
                discount_percent=discount_percent,
                discount_amount_fixed=discount_amount,
                max_uses=max_uses,
                min_order_value=min_order_value,
                max_discount=max_discount,
                affiliate_id=affiliate_id,
                expires_at=expires_at,
                is_active=is_active,
                created_by_user_id=current_user.id
            )
            db.session.add(coupon)
            db.session.commit()
            
            flash(f'Coupon {code} created successfully!', 'success')
            return redirect(url_for('admin_coupons.list_coupons'))
        
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating coupon: {str(e)}', 'danger')
            return render_template('admin/coupons/form.html', action='create')
    
    # GET - show form
    affiliates = User.query.join(User.affiliate_profile).all()
    return render_template('admin/coupons/form.html', action='create', affiliates=affiliates)


@admin_coupons_bp.route('/<int:coupon_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_coupon(coupon_id):
    """
    Edit existing coupon code.
    """
    coupon = CouponCode.query.get_or_404(coupon_id)
    
    if request.method == 'POST':
        coupon.is_active = request.form.get('is_active', 'on') == 'on'
        coupon.max_uses = request.form.get('max_uses', '', type=int) or None
        coupon.min_order_value = request.form.get('min_order_value', 0, type=int)
        coupon.max_discount = request.form.get('max_discount', '', type=int) or None
        
        expires_at_str = request.form.get('expires_at', '')
        if expires_at_str:
            try:
                coupon.expires_at = datetime.strptime(expires_at_str, '%Y-%m-%d')
            except ValueError:
                flash('Invalid expiry date format', 'warning')
        
        try:
            db.session.commit()
            flash(f'Coupon {coupon.code} updated successfully!', 'success')
            return redirect(url_for('admin_coupons.list_coupons'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating coupon: {str(e)}', 'danger')
    
    return render_template('admin/coupons/edit.html', coupon=coupon)


@admin_coupons_bp.route('/<int:coupon_id>/toggle', methods=['POST'])
@admin_required
def toggle_coupon(coupon_id):
    """
    Toggle coupon active status.
    """
    coupon = CouponCode.query.get_or_404(coupon_id)
    coupon.is_active = not coupon.is_active
    
    try:
        db.session.commit()
        status = 'activated' if coupon.is_active else 'deactivated'
        flash(f'Coupon {coupon.code} {status}', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error toggling coupon: {str(e)}', 'danger')
    
    return redirect(url_for('admin_coupons.list_coupons'))


@admin_coupons_bp.route('/<int:coupon_id>/delete', methods=['POST'])
@admin_required
def delete_coupon(coupon_id):
    """
    Delete coupon code (soft delete by deactivating).
    """
    coupon = CouponCode.query.get_or_404(coupon_id)
    code = coupon.code
    
    try:
        # Soft delete - just deactivate
        coupon.is_active = False
        db.session.commit()
        flash(f'Coupon {code} deleted (deactivated)', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting coupon: {str(e)}', 'danger')
    
    return redirect(url_for('admin_coupons.list_coupons'))


@admin_coupons_bp.route('/<int:coupon_id>/stats')
@admin_required
def coupon_stats(coupon_id):
    """
    View coupon usage statistics.
    """
    coupon = CouponCode.query.get_or_404(coupon_id)
    
    # Get orders using this coupon
    from app.models import Order
    orders = Order.query.filter_by(coupon_id=coupon_id).all()
    
    total_used = len(orders)
    total_discount_given = sum(order.applied_discount for order in orders)
    total_order_value = sum(order.total_amount for order in orders if order.total_amount)
    
    return render_template('admin/coupons/stats.html',
                         coupon=coupon,
                         orders=orders,
                         total_used=total_used,
                         total_discount_given=total_discount_given,
                         total_order_value=total_order_value)
