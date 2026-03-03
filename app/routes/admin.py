from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app, jsonify
from flask_login import current_user
from datetime import datetime
from app.models import db, Product, Order, User, UserRole, OrderStatus, ShippingStatus, CommissionStatus, AdminActionLog, AffiliateProfile, ProductImage, PolicyPage, Review, Payment, InventoryLog
from sqlalchemy import or_
from app.decorators import admin_required, superadmin_required
from app.security import get_client_ip, log_admin_action
from app.business_logic import StockManager, AffiliateManager, OrderManager
from app.storage import get_storage
import secrets

admin_bp = Blueprint('admin', __name__)


def generate_slug(name):
    """Generate URL-friendly slug from product name."""
    slug = name.lower().strip()
    slug = ''.join(c if c.isalnum() else '-' for c in slug)
    slug = '-'.join(slug.split())
    
    # Ensure uniqueness
    base_slug = slug
    counter = 1
    while Product.query.filter_by(slug=slug).first() is not None:
        slug = f'{base_slug}-{counter}'
        counter += 1
    
    return slug


@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    """Admin dashboard overview."""
    total_products = Product.query.count()
    active_products = Product.query.filter_by(is_active=True).count()
    total_orders = Order.query.count()
    pending_orders = Order.query.filter_by(status=OrderStatus.PENDING.value).count()
    total_users = User.query.count()
    
    # Recent orders
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(10).all()
    
    stats = {
        'total_products': total_products,
        'active_products': active_products,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'total_users': total_users,
    }
    
    return render_template('admin/dashboard.html', stats=stats, recent_orders=recent_orders)


@admin_bp.route('/image-guidelines')
@admin_required
def image_guidelines():
    """Display image upload guidelines for admins."""
    return render_template('admin/image_guidelines.html')


# ============= PRODUCT ROUTES =============

@admin_bp.route('/products')
@admin_required
def products_list():
    """List all products with sorting and filtering."""
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '').strip()
    status = request.args.get('status', 'all')
    sort_by = request.args.get('sort', 'latest')
    
    query = Product.query
    
    # Search
    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))
    
    # Filter by status
    if status == 'active':
        query = query.filter_by(is_active=True)
    elif status == 'inactive':
        query = query.filter_by(is_active=False)
    
    # Sorting
    if sort_by == 'latest':
        query = query.order_by(Product.created_at.desc())
    elif sort_by == 'oldest':
        query = query.order_by(Product.created_at.asc())
    elif sort_by == 'name':
        query = query.order_by(Product.name.asc())
    elif sort_by == 'price_low':
        query = query.order_by(Product.price.asc())
    elif sort_by == 'price_high':
        query = query.order_by(Product.price.desc())
    
    products = query.paginate(page=page, per_page=20)
    
    return render_template('admin/products.html', products=products, search=search, status=status, sort_by=sort_by)


@admin_bp.route('/product/add', methods=['GET', 'POST'])
@admin_required
def add_product():
    """
    Add new product (with admin action logging).
    
    SECURITY LOGGING:
    - Logs product creation
    - Tracks admin who created it
    - Timestamps and IP address recorded
    - Enables audit trail
    
    FUTURE ENHANCEMENTS:
    - Require superadmin approval for certain products
    - Price change validation (prevent accidental high/low prices)
    - Stock alert thresholds
    - Duplicate product detection
    - Image upload with scanning (virus detection)
    """
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        price_single_str = request.form.get('price_single', '').strip()
        price_original_str = request.form.get('price_original', '').strip()
        price_discounted_str = request.form.get('price_discounted', '').strip()
        is_discount_active = request.form.get('is_discount_active') == 'on'
        stock_str = request.form.get('stock_quantity', '').strip()
        weight_str = request.form.get('weight_grams', '').strip()
        dimensions = request.form.get('dimensions', '').strip()
        image_url = request.form.get('image_url', '').strip()
        is_active = request.form.get('is_active') == 'on'
        
        # Validation
        errors = []
        
        if not name or len(name) < 3:
            errors.append('Product name must be at least 3 characters')
        
        if not description or len(description) < 10:
            errors.append('Description must be at least 10 characters')
        
        # Pricing validation
        price = None
        price_original = None
        price_discounted = None
        
        if is_discount_active:
            # Dual pricing: Original and Discounted
            if not price_original_str or not price_discounted_str:
                errors.append('Original and discounted prices required when discount is active')
            else:
                try:
                    price_original = int(float(price_original_str) * 100)
                    price_discounted = int(float(price_discounted_str) * 100)
                    price = price_discounted  # Use discounted price as main price
                    
                    if price_original <= 0:
                        errors.append('Original price must be greater than 0')
                    if price_discounted <= 0:
                        errors.append('Discounted price must be greater than 0')
                    if price_discounted >= price_original:
                        errors.append('Discounted price must be less than original price')
                except (ValueError, TypeError):
                    errors.append('Invalid pricing values')
        else:
            # Single price (no discount)
            if not price_single_str:
                errors.append('Price is required')
            else:
                try:
                    price = int(float(price_single_str) * 100)  # Convert to paise
                    if price <= 0:
                        errors.append('Price must be greater than 0')
                except (ValueError, TypeError):
                    errors.append('Invalid price')
        
        try:
            stock_quantity = int(stock_str)
            if stock_quantity < 0:
                errors.append('Stock cannot be negative')
        except (ValueError, TypeError):
            errors.append('Invalid stock quantity')
        
        try:
            weight_grams = int(weight_str)
            if weight_grams <= 0:
                errors.append('Weight must be greater than 0')
        except (ValueError, TypeError):
            errors.append('Invalid weight (must be in grams)')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('admin/product_form.html', product=None)
        
        # Create product
        try:
            slug = generate_slug(name)
            product = Product(
                name=name,
                slug=slug,
                description=description,
                price=price,
                price_original=price_original,
                price_discounted=price_discounted,
                is_discount_active=is_discount_active,
                stock_quantity=stock_quantity,
                weight_grams=weight_grams,
                dimensions=dimensions if dimensions else None,
                image_url=image_url if image_url else None,
                is_active=is_active,
                created_by=current_user.id
            )
            
            db.session.add(product)
            db.session.commit()
            
            # Log the creation action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='CREATE_PRODUCT',
                target_id=product.id,
                ip_address=get_client_ip(),
                description=f'Created product: {name}'
            )
            
            flash(f'Product "{name}" added successfully!', 'success')
            return redirect(url_for('admin.products_list'))
        
        except Exception as e:
            db.session.rollback()
            flash('Error adding product. Please try again.', 'danger')
            current_app.logger.error(f'Product add error: {str(e)}')
            return render_template('admin/product_form.html', product=None)
    
    return render_template('admin/product_form.html', product=None)


@admin_bp.route('/product/<int:product_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_product(product_id):
    """
    Edit existing product (with admin action logging).
    
    SECURITY LOGGING:
    - Logs all product updates
    - Tracks who changed what and when
    - IP address captured for audit trail
    - Diff tracking (FUTURE): store old vs new values
    
    FUTURE ENHANCEMENTS:
    - Show change history/diff
    - Require superadmin approval for price changes
    - Notify users of product updates (email)
    - Maintain version history
    """
    product = Product.query.get_or_404(product_id)
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        price_single_str = request.form.get('price_single', '').strip()
        price_original_str = request.form.get('price_original', '').strip()
        price_discounted_str = request.form.get('price_discounted', '').strip()
        is_discount_active = request.form.get('is_discount_active') == 'on'
        stock_str = request.form.get('stock_quantity', '').strip()
        weight_str = request.form.get('weight_grams', '').strip()
        dimensions = request.form.get('dimensions', '').strip()
        image_url = request.form.get('image_url', '').strip()
        is_active = request.form.get('is_active') == 'on'
        
        # Validation
        errors = []
        
        if not name or len(name) < 3:
            errors.append('Product name must be at least 3 characters')
        
        if not description or len(description) < 10:
            errors.append('Description must be at least 10 characters')
        
        # Pricing validation
        price = None
        price_original = None
        price_discounted = None
        
        if is_discount_active:
            # Dual pricing: Original and Discounted
            if not price_original_str or not price_discounted_str:
                errors.append('Original and discounted prices required when discount is active')
            else:
                try:
                    price_original = int(float(price_original_str) * 100)
                    price_discounted = int(float(price_discounted_str) * 100)
                    price = price_discounted  # Use discounted price as main price
                    
                    if price_original <= 0:
                        errors.append('Original price must be greater than 0')
                    if price_discounted <= 0:
                        errors.append('Discounted price must be greater than 0')
                    if price_discounted >= price_original:
                        errors.append('Discounted price must be less than original price')
                except (ValueError, TypeError):
                    errors.append('Invalid pricing values')
        else:
            # Single price (no discount)
            if not price_single_str:
                errors.append('Price is required')
            else:
                try:
                    price = int(float(price_single_str) * 100)  # Convert to paise
                    if price <= 0:
                        errors.append('Price must be greater than 0')
                except (ValueError, TypeError):
                    errors.append('Invalid price')
        
        try:
            stock_quantity = int(stock_str)
            if stock_quantity < 0:
                errors.append('Stock cannot be negative')
        except (ValueError, TypeError):
            errors.append('Invalid stock quantity')
        
        try:
            weight_grams = int(weight_str)
            if weight_grams <= 0:
                errors.append('Weight must be greater than 0')
        except (ValueError, TypeError):
            errors.append('Invalid weight (must be in grams)')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('admin/product_form.html', product=product)
        
        # Update product
        try:
            # Store old values for audit (FUTURE: create change log)
            old_name = product.name
            old_price = product.price
            old_stock = product.stock_quantity
            
            product.name = name
            product.description = description
            product.price = price
            product.price_original = price_original
            product.price_discounted = price_discounted
            product.is_discount_active = is_discount_active
            product.stock_quantity = stock_quantity
            product.weight_grams = weight_grams
            product.dimensions = dimensions if dimensions else None
            product.image_url = image_url if image_url else None
            product.is_active = is_active
            
            db.session.commit()
            
            # Log the update action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='UPDATE_PRODUCT',
                target_id=product_id,
                ip_address=get_client_ip(),
                description=f'Updated product: {name}'
            )
            
            flash(f'Product "{name}" updated successfully!', 'success')
            return redirect(url_for('admin.products_list'))
        
        except Exception as e:
            db.session.rollback()
            flash('Error updating product. Please try again.', 'danger')
            current_app.logger.error(f'Product edit error: {str(e)}')
            return render_template('admin/product_form.html', product=product)
    
    return render_template('admin/product_form.html', product=product)


@admin_bp.route('/product/<int:product_id>/delete', methods=['POST'])
@admin_required
def delete_product(product_id):
    """
    Delete product (with admin action logging).
    
    SECURITY & AUDIT:
    - Logs deletion for audit trail
    - Soft delete option (FUTURE):
      Instead of deleting, mark as deleted
      Maintains data integrity for historical orders
    - Confirmation prompt (client should require this)
    - IP address logged for security
    
    FUTURE ENHANCEMENTS:
    - Send email alert to superadmin
    - Require superadmin confirmation for expensive products
    - Soft delete (preserve data)
    - Archive to S3/external storage
    """
    product = Product.query.get_or_404(product_id)
    product_name = product.name
    
    try:
        db.session.delete(product)
        db.session.commit()
        
        # Log the deletion action
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type='DELETE_PRODUCT',
            target_id=product_id,
            ip_address=get_client_ip(),
            description=f'Deleted product: {product_name}'
        )
        
        flash(f'Product "{product_name}" deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error deleting product. Please try again.', 'danger')
        current_app.logger.error(f'Product delete error: {str(e)}')
    
    return redirect(url_for('admin.products_list'))


# ============= PRODUCT IMAGE ROUTES =============

@admin_bp.route('/product/<int:product_id>/images', methods=['GET', 'POST'])
@admin_required
def manage_product_images(product_id):
    """
    Manage product images (upload, reorder, set primary, delete).

    Uses pluggable storage system (local or R2) based on STORAGE_BACKEND config.

    GET: Display image management interface
    POST: Handle image upload

    STORAGE ABSTRACTION:
    ====================
    Images stored via get_storage() factory function.
    - If STORAGE_BACKEND='local': Saves to /app/static/uploads/
    - If STORAGE_BACKEND='r2': Saves to Cloudflare R2
    - No code changes needed when switching backends

    UPLOAD FLOW:
    1. Get storage backend from factory
    2. Validate file (type, size) - done in image processor
    3. Process image (resize, thumbnail, convert to WebP)
    4. Upload to selected storage backend
    5. Store returned URL in database
    6. Create ProductImage record pointing to URL/path

    ADMIN DOESN'T SEE:
    - Storage complexity (local vs R2)
    - File paths (only URLs)
    - Image processing details (automatic)

    SECURITY:
    - Admin only (@admin_required)
    - CSRF protected (Flask-WTF)
    - File validation from image_processor
    - UUID filenames prevent collisions
    - Safe file handling (no directory traversal)
    """
    product = Product.query.get_or_404(product_id)

    if request.method == 'POST':
        # Handle image upload via AJAX
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']

        try:
            # Get storage backend (local or R2)
            storage = get_storage()

            # Storage processes image and uploads
            # Returns URL to display, storage_path for deletion
            result = storage.upload(file, None)  # None = auto-generate UUID filename

            if not result['success']:
                return jsonify({'success': False, 'error': result['error']}), 400

            # Create ProductImage record
            # If this is the first image, make it primary
            is_primary = ProductImage.query.filter_by(product_id=product_id).count() == 0

            image = ProductImage(
                product_id=product_id,
                image_path=result['url'],  # Store returned URL (works for local or R2)
                is_primary=is_primary,
                display_order=ProductImage.query.filter_by(product_id=product_id).count(),
                storage_path=result['storage_path']  # For deletion later
            )
            db.session.add(image)
            db.session.commit()

            # Log action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='UPLOAD_PRODUCT_IMAGE',
                target_id=product_id,
                ip_address=get_client_ip(),
                description=f'Uploaded image for product: {product.name}'
            )

            return jsonify({
                'success': True,
                'image_id': image.id,
                'thumbnail_url': result['url'],  # Frontend uses same URL for now
                'original_url': result['url'],   # Storage handles thumbnail serving
                'is_primary': is_primary
            })

        except Exception as e:
            current_app.logger.error(f'Image upload error: {str(e)}')
            return jsonify({'success': False, 'error': 'Upload failed. Please try again.'}), 500

    # GET: Display image management interface
    images = ProductImage.get_product_images(product_id)
    return render_template('admin/product_images.html', product=product, images=images)


@admin_bp.route('/product-image/<int:image_id>/delete', methods=['POST'])
@admin_required
def delete_product_image(image_id):
    """
    Delete a product image using pluggable storage system.

    Uses storage backend (local or R2) to delete files.
    No code change needed when switching backends.

    DELETION FLOW:
    1. Get ProductImage record
    2. Get storage backend from factory
    3. Call storage.delete() with storage_path
    4. Delete database record
    5. Promote next image to primary if needed
    6. Log the action
    """
    image = ProductImage.query.get_or_404(image_id)
    product_id = image.product_id
    product = image.product

    try:
        # Delete from storage (local or R2)
        storage = get_storage()
        delete_result = storage.delete(image.storage_path)

        if not delete_result['success']:
            # Still log but notify admin of potential orphaned files
            current_app.logger.warning(
                f'Image delete from storage failed: {delete_result["error"]} '
                f'(image_id={image_id}, storage_path={image.storage_path})'
            )

        # Delete database record
        db.session.delete(image)
        db.session.commit()

        # If this was primary, make the first remaining image primary
        remaining = ProductImage.query.filter_by(product_id=product_id).first()
        if remaining:
            ProductImage.set_primary_image(product_id, remaining.id)

        # Log action
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type='DELETE_PRODUCT_IMAGE',
            target_id=product_id,
            ip_address=get_client_ip(),
            description=f'Deleted image from product: {product.name}'
        )

        flash('Image deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Image delete error: {str(e)}')
        flash('Error deleting image. Please try again.', 'danger')

    return redirect(url_for('admin.manage_product_images', product_id=product_id))


@admin_bp.route('/product-image/<int:image_id>/set-primary', methods=['POST'])
@admin_required
def set_primary_image(image_id):
    """Set an image as the primary image for product listing."""
    image = ProductImage.query.get_or_404(image_id)
    product_id = image.product_id
    
    try:
        if ProductImage.set_primary_image(product_id, image_id):
            # Log action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='SET_PRIMARY_IMAGE',
                target_id=product_id,
                ip_address=get_client_ip(),
                description=f'Set primary image for product: {image.product.name}'
            )
            
            if request.is_json:
                return jsonify({'success': True})
            flash('Primary image updated!', 'success')
        else:
            if request.is_json:
                return jsonify({'success': False, 'error': 'Failed to update primary image'}), 400
            flash('Error updating primary image.', 'danger')
    except Exception as e:
        current_app.logger.error(f'Set primary image error: {str(e)}')
        if request.is_json:
            return jsonify({'success': False, 'error': str(e)}), 500
        flash('Error updating primary image.', 'danger')
    
    return redirect(url_for('admin.manage_product_images', product_id=product_id))


# ============= ORDER ROUTES =============

@admin_bp.route('/orders')
@admin_required
def orders_list():
    """
    List all orders with filtering and sorting.
    
    Supports:
    - Filter by status (pending, confirmed, shipped, cancelled)
    - Filter by order type (guest, registered)
    - Search by order number, customer name, phone, email
    - Sort by date (latest/oldest)
    
    FUTURE SCALABILITY:
    - Export orders to CSV
    - Bulk status updates
    - Print shipping labels
    - Integration with shipping APIs
    """
    page = request.args.get('page', 1, type=int)
    status_filter = request.args.get('status', 'all')
    order_type = request.args.get('type', 'all')  # guest, registered, all
    search = request.args.get('search', '').strip()
    sort_by = request.args.get('sort', 'latest')
    
    query = Order.query
    
    # Filter by status
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    
    # Filter by order type (guest vs registered)
    if order_type == 'guest':
        query = query.filter_by(user_id=None)
    elif order_type == 'registered':
        query = query.filter(Order.user_id != None)
    
    # Search by multiple fields
    if search:
        query = query.filter(
            (Order.order_number.ilike(f'%{search}%')) |
            (Order.guest_name.ilike(f'%{search}%')) |
            (Order.guest_phone.ilike(f'%{search}%')) |
            (Order.guest_email.ilike(f'%{search}%'))
        )
    
    # Sorting
    if sort_by == 'latest':
        query = query.order_by(Order.created_at.desc())
    elif sort_by == 'oldest':
        query = query.order_by(Order.created_at.asc())
    
    orders = query.paginate(page=page, per_page=20)
    
    return render_template('admin/orders.html', orders=orders, status_filter=status_filter, 
                         order_type=order_type, search=search, sort_by=sort_by)


@admin_bp.route('/order/<int:order_id>/view')
@admin_required
def view_order(order_id):
    """View order details."""
    order = Order.query.get_or_404(order_id)
    return render_template('admin/order_detail.html', order=order)


@admin_bp.route('/order/<int:order_id>/status', methods=['POST'])
@admin_required
def update_order_status(order_id):
    """Update order status."""
    order = Order.query.get_or_404(order_id)
    new_status = request.form.get('status', '').strip()
    
    # Validate status
    valid_statuses = [s.value for s in OrderStatus]
    if new_status not in valid_statuses:
        flash('Invalid status.', 'danger')
        return redirect(url_for('admin.view_order', order_id=order_id))
    
    try:
        old_status = order.status
        order.status = new_status
        db.session.commit()
        
        flash(f'Order status updated: {old_status} → {new_status}', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error updating order status.', 'danger')
        current_app.logger.error(f'Order status update error: {str(e)}')
    
    return redirect(url_for('admin.view_order', order_id=order_id))


# ============= USER MANAGEMENT ROUTES (SUPERADMIN ONLY) =============

@admin_bp.route('/users')
@superadmin_required
def users_list():
    """List all users (superadmin only)."""
    page = request.args.get('page', 1, type=int)
    role_filter = request.args.get('role', 'all')
    search = request.args.get('search', '').strip()
    
    query = User.query
    
    # Filter by role
    if role_filter != 'all':
        query = query.filter_by(role=role_filter)
    
    # Search
    if search:
        query = query.filter(
            (User.name.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%'))
        )
    
    users = query.paginate(page=page, per_page=20)
    
    return render_template('admin/users.html', users=users, role_filter=role_filter, search=search)


@admin_bp.route('/user/<int:user_id>/promote', methods=['POST'])
@superadmin_required
def promote_user(user_id):
    """
    Promote a user to admin role (SUPERADMIN ONLY).
    
    GOVERNANCE RULES - ADMIN PROMOTION:
    ===================================
    ONLY superadmin can promote users to admin.
    Admins CANNOT promote other users (prevents unauthorized admin creation).
    This ensures:
    - Centralized access control (single authority)
    - Clear audit trail (only superadmin can create admins)
    - Prevention of admin privilege escalation
    - Easy revocation (superadmin controls promotions)
    
    Promotion Rules:
    - Only superadmin can execute this action
    - Can only promote regular users (role=user) to admin
    - Cannot promote superadmin
    - Cannot self-promote
    - Prevents duplicate promotions (idempotent)
    
    FUTURE SCALABILITY:
    - Audit logging (track who promoted whom and when)
    - Promotion notifications (email to user about new role)
    - Role expiration (temporary admin access)
    - promotion workflows (approval by multiple admins)
    - Activity monitoring (track new admin actions)
    """
    user = User.query.get_or_404(user_id)
    
    # Prevent self-demotion
    if user.id == current_user.id:
        flash('You cannot promote/demote yourself.', 'warning')
        return redirect(url_for('admin.users_list'))
    
    try:
        if user.role == UserRole.USER.value:
            user.role = UserRole.ADMIN.value
            db.session.commit()
            
            # Log the promotion action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='PROMOTE_USER',
                target_id=user_id,
                ip_address=get_client_ip(),
                description=f'Promoted user {user.email} to admin'
            )
            
            flash(f'User "{user.name}" promoted to Admin', 'success')
        else:
            flash(f'User is already an admin.', 'info')
    except Exception as e:
        db.session.rollback()
        flash('Error promoting user.', 'danger')
        current_app.logger.error(f'User promotion error: {str(e)}')
    
    return redirect(url_for('admin.users_list'))


@admin_bp.route('/user/<int:user_id>/demote', methods=['POST'])
@superadmin_required
def demote_user(user_id):
    """
    Demote an admin back to user role (SUPERADMIN ONLY).
    
    GOVERNANCE RULES - ADMIN DEMOTION:
    ==================================
    ONLY superadmin can demote admins.
    Admins CANNOT demote other admins (prevents unauthorized access revocation).
    Superadmin cannot be demoted (prevents orphaning the system).
    
    Demotion Rules:
    - Only superadmin can execute this action
    - Can only demote admins (role=admin) back to user
    - Cannot demote superadmin (prevents system lockout)
    - Cannot self-demote
    - Prevents duplicate demotions (idempotent)
    
    Business Impact:
    - Immediately revokes admin dashboard access
    - User can still place orders (ordering is role-independent)
    - User maintains their account and order history
    - Can be re-promoted if needed
    
    FUTURE SCALABILITY:
    - Audit logging (track who demoted whom and when)
    - Demotion notifications (email confirmation)
    - Grace period (delay revocation for secure handoff)
    - Permission revocation tracking (which features were revoked)
    - Automatic activity reports before demotion
    """
    user = User.query.get_or_404(user_id)
    
    # Prevent self-demotion
    if user.id == current_user.id:
        flash('You cannot promote/demote yourself.', 'warning')
        return redirect(url_for('admin.users_list'))
    
    # SUPERADMIN SAFETY CHECK: Prevent demoting last superadmin
    if user.is_superadmin() and not user.can_be_demoted():
        flash('Cannot demote the last remaining superadmin. This would orphan the system.', 'danger')
        return redirect(url_for('admin.users_list'))
    
    # Prevent demoting superadmin
    if user.is_superadmin():
        flash('You cannot demote a superadmin.', 'warning')
        return redirect(url_for('admin.users_list'))
    
    try:
        if user.role == UserRole.ADMIN.value:
            old_role = user.role
            user.role = UserRole.USER.value
            db.session.commit()
            
            # Log the demotion action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='DEMOTE_USER',
                target_id=user_id,
                ip_address=get_client_ip(),
                description=f'Demoted user {user.email} from admin to user'
            )
            
            flash(f'User "{user.name}" demoted to User', 'success')
        else:
            flash(f'User is not an admin.', 'info')
    except Exception as e:
        db.session.rollback()
        flash('Error demoting user.', 'danger')
        current_app.logger.error(f'User demotion error: {str(e)}')
    
    return redirect(url_for('admin.users_list'))


@admin_bp.route('/user/<int:user_id>/deactivate', methods=['POST'])
@superadmin_required
def deactivate_user(user_id):
    """
    Deactivate user account (SUPERADMIN ONLY).
    
    SECURITY IMPLICATIONS:
    - Immediately revokes all access (admin or user)
    - User cannot login
    - Cannot place orders
    - Audit trail preserved
    - Reversible (reactivation possible)
    
    SUPERADMIN SAFETY CHECK:
    - Cannot deactivate last superadmin
    - Prevents system orphaning
    
    FUTURE ENHANCEMENTS:
    - Email notification to user
    - Grace period before taking effect
    - Automatic account archival after 90 days
    - Export user data before deactivation (GDPR)
    - Reason for deactivation logged
    """
    user = User.query.get_or_404(user_id)
    
    # Prevent self-deactivation
    if user.id == current_user.id:
        flash('You cannot deactivate your own account.', 'warning')
        return redirect(url_for('admin.users_list'))
    
    # SUPERADMIN SAFETY CHECK: Prevent deactivating last superadmin
    if user.is_superadmin() and not user.can_be_deactivated():
        flash('Cannot deactivate the last remaining superadmin. This would orphan the system.', 'danger')
        return redirect(url_for('admin.users_list'))
    
    try:
        user.is_active = False
        db.session.commit()
        
        # Log the deactivation action
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type='DEACTIVATE_USER',
            target_id=user_id,
            ip_address=get_client_ip(),
            description=f'Deactivated user account: {user.email}'
        )
        
        flash(f'User "{user.name}" deactivated', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error deactivating user.', 'danger')
        current_app.logger.error(f'User deactivation error: {str(e)}')
    
    return redirect(url_for('admin.users_list'))


@admin_bp.route('/user/<int:user_id>/delete', methods=['POST'])
@superadmin_required
def delete_user(user_id):
    """
    Permanently delete user account (SUPERADMIN ONLY).
    
    CRITICAL SECURITY RULES:
    - Only superadmin can delete users
    - Cannot delete yourself (prevents account lockout)
    - Cannot delete last superadmin (prevents system orphaning)
    - Irreversible action - requires confirmation
    
    DATA HANDLING:
    - Deletes user and related data (cascade)
    - Preserves order history (orders remain with customer snapshot data)
    - Removes affiliate profile if exists
    - Audit log entry created before deletion
    
    FUTURE ENHANCEMENTS:
    - Soft delete option (mark deleted but preserve data)
    - Data export before deletion (GDPR compliance)
    - Reassign affiliate commissions to another user
    - Email confirmation requirement for critical deletions
    - Deletion reason logging
    """
    user = User.query.get_or_404(user_id)
    
    # Prevent self-deletion
    if user.id == current_user.id:
        flash('You cannot delete your own account.', 'danger')
        return redirect(url_for('admin.users_list'))
    
    # SUPERADMIN SAFETY CHECK: Prevent deleting last superadmin
    if user.is_superadmin() and not user.can_be_deactivated():
        flash('Cannot delete the last remaining superadmin. This would orphan the system.', 'danger')
        return redirect(url_for('admin.users_list'))
    
    try:
        user_email = user.email
        user_name = user.name
        
        # Log the deletion action BEFORE deleting (so we have the record)
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type='DELETE_USER',
            target_id=user_id,
            ip_address=get_client_ip(),
            description=f'Permanently deleted user account: {user_email} (Name: {user_name})'
        )
        
        # Delete the user (cascade will handle related data)
        db.session.delete(user)
        db.session.commit()
        
        flash(f'User "{user_name}" permanently deleted', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error deleting user. User may have related data that needs to be handled first.', 'danger')
        current_app.logger.error(f'User deletion error: {str(e)}')
    
    return redirect(url_for('admin.users_list'))


# ============= STOCK MANAGEMENT ROUTES =============

@admin_bp.route('/product/<int:product_id>/stock', methods=['POST'])
@admin_required
def adjust_stock(product_id):
    """
    Manually adjust product stock.
    
    Used for:
    - Receiving new inventory from carpenter
    - Correcting stock discrepancies
    - Damage/loss adjustments
    """
    try:
        new_quantity = request.form.get('stock_quantity', type=int)
        reason = request.form.get('reason', '').strip()
        
        if new_quantity is None or new_quantity < 0:
            flash('Invalid stock quantity', 'danger')
            return redirect(url_for('admin.edit_product', product_id=product_id))
        
        success, message = StockManager.adjust_stock(
            product_id=product_id,
            new_quantity=new_quantity,
            admin_id=current_user.id,
            reason=reason
        )
        
        if success:
            flash(message, 'success')
        else:
            flash(message, 'danger')
    except Exception as e:
        db.session.rollback()
        flash('Error adjusting stock.', 'danger')
        current_app.logger.error(f'Stock adjustment error: {str(e)}')
    
    return redirect(url_for('admin.edit_product', product_id=product_id))


# ============= SHIPPING MANAGEMENT ROUTES =============

@admin_bp.route('/order/<int:order_id>/shipping', methods=['POST'])
@admin_required
def update_shipping(order_id):
    """
    Update shipping status and tracking information.
    
    BUSINESS FLOW:
    1. PENDING → PACKED (admin packs order)
    2. PACKED → SHIPPED (handed to courier, add tracking)
    3. SHIPPED → DELIVERED (courier confirms delivery)
    4. Any status → RETURNED (RTO - return to origin)
    """
    try:
        shipping_status = request.form.get('shipping_status')
        tracking_number = request.form.get('tracking_number', '').strip()
        courier_name = request.form.get('courier_name', '').strip()
        
        if not shipping_status:
            flash('Shipping status is required', 'danger')
            return redirect(url_for('admin.view_order', order_id=order_id))
        
        success, message = OrderManager.update_shipping(
            order_id=order_id,
            shipping_status=shipping_status,
            tracking_number=tracking_number or None,
            courier_name=courier_name or None,
            admin_id=current_user.id
        )
        
        if success:
            flash(message, 'success')
        else:
            flash(message, 'danger')
    except Exception as e:
        db.session.rollback()
        flash('Error updating shipping.', 'danger')
        current_app.logger.error(f'Shipping update error: {str(e)}')
    
    return redirect(url_for('admin.view_order', order_id=order_id))


@admin_bp.route('/order/<int:order_id>/confirm', methods=['POST'])
@admin_required
def confirm_order(order_id):
    """
    Confirm order and reduce stock.
    
    BUSINESS LOGIC:
    - Reduces product stock by order quantity
    - Calculates affiliate commission if applicable
    - Marks order as CONFIRMED
    - Logs admin action
    """
    try:
        success, message = OrderManager.confirm_order(
            order_id=order_id,
            admin_id=current_user.id
        )
        
        if success:
            flash(message, 'success')
        else:
            flash(message, 'danger')
    except Exception as e:
        db.session.rollback()
        flash('Error confirming order.', 'danger')
        current_app.logger.error(f'Order confirmation error: {str(e)}')
    
    return redirect(url_for('admin.view_order', order_id=order_id))


@admin_bp.route('/order/<int:order_id>/cancel', methods=['POST'])
@admin_required
def cancel_order(order_id):
    """
    Cancel order and restore stock.
    
    BUSINESS LOGIC:
    - Restores product stock if order was confirmed
    - Rejects commission if applicable
    - Marks order as CANCELLED
    - Logs admin action
    """
    try:
        reason = request.form.get('reason', 'Admin cancellation').strip()
        
        success, message = OrderManager.cancel_order(
            order_id=order_id,
            admin_id=current_user.id,
            reason=reason
        )
        
        if success:
            flash(message, 'success')
        else:
            flash(message, 'danger')
    except Exception as e:
        db.session.rollback()
        flash('Error cancelling order.', 'danger')
        current_app.logger.error(f'Order cancellation error: {str(e)}')
    
    return redirect(url_for('admin.view_order', order_id=order_id))


# ============= COMMISSION MANAGEMENT ROUTES =============

@admin_bp.route('/commissions')
@admin_required
def commissions_list():
    """
    List pending and approved commissions.
    
    Shows:
    - Orders with affiliates
    - Commission status
    - Commission amounts
    - Approve/reject actions
    """
    page = request.args.get('page', 1, type=int)
    status_filter = request.args.get('status', 'pending')
    
    query = Order.query.filter(Order.affiliate_id.isnot(None))
    
    if status_filter == 'pending':
        query = query.filter_by(commission_status=CommissionStatus.PENDING.value)
    elif status_filter == 'approved':
        query = query.filter_by(commission_status=CommissionStatus.APPROVED.value)
    elif status_filter == 'rejected':
        query = query.filter_by(commission_status=CommissionStatus.REJECTED.value)
    
    orders = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=20)
    
    # Calculate stats for display
    pending_count = Order.query.filter(
        Order.affiliate_id.isnot(None),
        Order.commission_status == CommissionStatus.PENDING.value
    ).count()
    
    approved_count = Order.query.filter(
        Order.affiliate_id.isnot(None),
        Order.commission_status == CommissionStatus.APPROVED.value
    ).count()
    
    return render_template(
        'admin/commissions.html', 
        orders=orders, 
        status_filter=status_filter,
        pending_count=pending_count,
        approved_count=approved_count
    )


@admin_bp.route('/order/<int:order_id>/commission/approve', methods=['POST'])
@admin_required
def approve_commission(order_id):
    """
    Approve commission and credit affiliate wallet.
    
    BUSINESS RULES:
    - Order must be CONFIRMED
    - Commission not already approved
    - Not a self-referral
    - Affiliate is active
    """
    try:
        success, message = AffiliateManager.approve_commission(
            order_id=order_id,
            admin_id=current_user.id
        )
        
        if success:
            flash(message, 'success')
        else:
            flash(message, 'danger')
    except Exception as e:
        db.session.rollback()
        flash('Error approving commission.', 'danger')
        current_app.logger.error(f'Commission approval error: {str(e)}')
    
    return redirect(url_for('admin.commissions_list'))


# ============= AFFILIATE MANAGEMENT ROUTES =============

@admin_bp.route('/affiliates')
@admin_required
def affiliates_list():
    """
    List all affiliate profiles.
    
    Shows:
    - Affiliate code
    - User name/email
    - Commission rate
    - Total earned
    - Wallet balance
    - Status (active/inactive)
    """
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status', 'all')
    search = request.args.get('search', '').strip()
    
    query = AffiliateProfile.query.join(User)
    
    # Filter by status
    if status == 'active':
        query = query.filter(AffiliateProfile.is_active == True)
    elif status == 'inactive':
        query = query.filter(AffiliateProfile.is_active == False)
    
    # Search by name, email, or affiliate code
    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                AffiliateProfile.affiliate_code.ilike(f'%{search}%')
            )
        )
    
    affiliates = query.order_by(AffiliateProfile.created_at.desc()).paginate(page=page, per_page=20)
    
    return render_template('admin/affiliates.html', affiliates=affiliates, status=status, search=search)


@admin_bp.route('/user/<int:user_id>/affiliate/create', methods=['POST'])
@superadmin_required
def create_affiliate_profile(user_id):
    """
    Create affiliate profile for a user.
    
    BUSINESS RULES:
    - Only superadmin can create affiliates
    - User must not already have affiliate profile
    - Generates unique affiliate code
    """
    try:
        commission_percent = request.form.get('commission_percent', 10.0, type=float)
        
        if commission_percent < 0 or commission_percent > 100:
            flash('Invalid commission percentage (must be 0-100)', 'danger')
            return redirect(url_for('admin.users_list'))
        
        affiliate, message = AffiliateManager.create_affiliate_profile(
            user_id=user_id,
            commission_percent=commission_percent
        )
        
        if affiliate:
            # Log admin action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='CREATE_AFFILIATE',
                target_id=user_id,
                ip_address=get_client_ip(),
                description=f'Created affiliate profile with code {affiliate.affiliate_code}'
            )
            
            flash(message, 'success')
        else:
            flash(message, 'danger')
    except Exception as e:
        db.session.rollback()
        flash('Error creating affiliate profile.', 'danger')
        current_app.logger.error(f'Affiliate creation error: {str(e)}')
    
    return redirect(url_for('admin.users_list'))


@admin_bp.route('/affiliate/<int:affiliate_id>/toggle', methods=['POST'])
@superadmin_required
def toggle_affiliate_status(affiliate_id):
    """
    Activate/deactivate affiliate.
    
    BUSINESS RULES:
    - Only superadmin can activate/deactivate
    - Inactive affiliates cannot earn new commissions
    - Existing commissions not affected
    """
    try:
        affiliate = AffiliateProfile.query.get_or_404(affiliate_id)
        
        affiliate.is_active = not affiliate.is_active
        db.session.commit()
        
        status = 'activated' if affiliate.is_active else 'deactivated'
        
        # Log admin action
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type='TOGGLE_AFFILIATE_STATUS',
            target_id=affiliate_id,
            ip_address=get_client_ip(),
            description=f'{status.capitalize()} affiliate {affiliate.affiliate_code}'
        )
        
        flash(f'Affiliate {status}', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error updating affiliate status.', 'danger')
        current_app.logger.error(f'Affiliate toggle error: {str(e)}')
    
    return redirect(url_for('admin.affiliates_list'))


@admin_bp.route('/affiliate/<int:affiliate_id>/wallet', methods=['POST'])
@superadmin_required
def adjust_affiliate_wallet(affiliate_id):
    """
    Manually adjust affiliate wallet balance.
    
    Used for:
    - Bonuses
    - Corrections
    - Penalties
    - Refunds
    """
    try:
        affiliate = AffiliateProfile.query.get_or_404(affiliate_id)
        
        amount = request.form.get('amount', type=int)  # In paise
        reason = request.form.get('reason', '').strip()
        
        if amount is None:
            flash('Invalid amount', 'danger')
            return redirect(url_for('admin.affiliates_list'))
        
        if affiliate.adjust_wallet(amount, reason):
            # Log admin action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='ADJUST_AFFILIATE_WALLET',
                target_id=affiliate_id,
                ip_address=get_client_ip(),
                description=f'Adjusted wallet by ₹{amount / 100:.2f}. Reason: {reason}'
            )
            
            flash(f'Wallet adjusted by ₹{amount / 100:.2f}', 'success')
        else:
            flash('Error adjusting wallet (insufficient balance for negative adjustment)', 'danger')
    except Exception as e:
        db.session.rollback()
        flash('Error adjusting wallet.', 'danger')
        current_app.logger.error(f'Wallet adjustment error: {str(e)}')
    
    return redirect(url_for('admin.affiliates_list'))


# ============= POLICY PAGES ROUTES =============

@admin_bp.route('/policies')
@admin_required
def policies_list():
    """List all editable policy pages."""
    policies = PolicyPage.query.order_by(PolicyPage.updated_at.desc()).all()
    return render_template('admin/policies.html', policies=policies)


@admin_bp.route('/policy/<slug>/edit', methods=['GET', 'POST'])
@admin_required
def edit_policy(slug):
    """
    Edit policy page content.
    
    ADMIN CONTROL:
    - Admins can update title and content
    - Changes saved to database immediately
    - No redeployment needed
    - Frontend displays updated content dynamically
    
    SIMPLE IMPLEMENTATION:
    - No draft/publish workflow (direct edit)
    - No version history (can add later)
    - HTML content supported for formatting
    """
    policy = PolicyPage.query.filter_by(slug=slug).first()
    
    if not policy:
        flash('Policy page not found', 'danger')
        return redirect(url_for('admin.policies_list'))
    
    if request.method == 'POST':
        try:
            # Update policy content
            policy.title = request.form.get('title', policy.title).strip()
            policy.content = request.form.get('content', policy.content).strip()
            policy.updated_by = current_user.id
            policy.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            # Log the action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='EDIT_POLICY',
                target_id=policy.id,
                ip_address=get_client_ip(),
                description=f'Edited policy: {policy.slug}'
            )
            
            flash(f'Policy "{policy.title}" updated successfully', 'success')
            return redirect(url_for('admin.policies_list'))
        
        except Exception as e:
            db.session.rollback()
            flash('Error updating policy', 'danger')
            current_app.logger.error(f'Policy update error: {str(e)}')
    
    return render_template('admin/policy_edit.html', policy=policy)


# ============= REVIEW MANAGEMENT ROUTES =============

@admin_bp.route('/reviews')
@admin_required
def reviews_list():
    """List all reviews with filtering."""
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status', 'all')  # all / approved / pending
    product_id = request.args.get('product_id', type=int)
    rating = request.args.get('rating', type=int)
    search = request.args.get('search', '').strip()
    
    query = Review.query
    
    # Filter by approval status
    if status == 'approved':
        query = query.filter_by(is_approved=True)
    elif status == 'pending':
        query = query.filter_by(is_approved=False)
    
    # Filter by product
    if product_id:
        query = query.filter_by(product_id=product_id)

    # Filter by rating
    if rating:
        query = query.filter_by(rating=rating)

    # Search by reviewer name, title, or comment
    if search:
        like_term = f'%{search}%'
        query = query.filter(
            or_(
                Review.name.ilike(like_term),
                Review.title.ilike(like_term),
                Review.comment.ilike(like_term)
            )
        )
    
    # Sort by newest first
    reviews = query.order_by(Review.created_at.desc()).paginate(page=page, per_page=20)

    products = Product.query.order_by(Product.name.asc()).all()
    
    return render_template(
        'admin/reviews.html',
        reviews=reviews,
        status=status,
        product_id=product_id,
        rating=rating,
        search=search,
        products=products
    )


@admin_bp.route('/review/add/<int:product_id>', methods=['GET', 'POST'])
@admin_required
def add_review(product_id):
    """Add new review to product."""
    product = Product.query.get_or_404(product_id)
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        role = request.form.get('role', '').strip()
        rating_str = request.form.get('rating', '').strip()
        title = request.form.get('title', '').strip()
        comment = request.form.get('comment', '').strip()
        is_approved = request.form.get('is_approved') == 'on'
        
        # Validation
        errors = []
        
        if not name or len(name) < 2:
            errors.append('Reviewer name must be at least 2 characters')
        
        if not comment or len(comment) < 10:
            errors.append('Review comment must be at least 10 characters')
        
        try:
            rating = int(rating_str)
            if rating < 1 or rating > 5:
                errors.append('Rating must be between 1 and 5')
        except (ValueError, TypeError):
            errors.append('Invalid rating')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('admin/review_form.html', product=product, review=None)
        
        # Create review
        try:
            review = Review(
                product_id=product_id,
                name=name,
                role=role if role else None,
                rating=rating,
                title=title if title else None,
                comment=comment,
                is_approved=is_approved
            )
            
            db.session.add(review)
            db.session.commit()
            
            # Log the creation action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='CREATE_REVIEW',
                target_id=review.id,
                ip_address=get_client_ip(),
                description=f'Created review for product: {product.name}'
            )
            
            flash(f'Review added successfully for "{product.name}"!', 'success')
            return redirect(url_for('admin.reviews_list'))
        
        except Exception as e:
            db.session.rollback()
            flash('Error adding review. Please try again.', 'danger')
            current_app.logger.error(f'Review add error: {str(e)}')
            return render_template('admin/review_form.html', product=product, review=None)
    
    return render_template('admin/review_form.html', product=product, review=None)


@admin_bp.route('/review/<int:review_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_review(review_id):
    """Edit existing review."""
    review = Review.query.get_or_404(review_id)
    product = review.product
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        role = request.form.get('role', '').strip()
        rating_str = request.form.get('rating', '').strip()
        title = request.form.get('title', '').strip()
        comment = request.form.get('comment', '').strip()
        is_approved = request.form.get('is_approved') == 'on'
        
        # Validation
        errors = []
        
        if not name or len(name) < 2:
            errors.append('Reviewer name must be at least 2 characters')
        
        if not comment or len(comment) < 10:
            errors.append('Review comment must be at least 10 characters')
        
        try:
            rating = int(rating_str)
            if rating < 1 or rating > 5:
                errors.append('Rating must be between 1 and 5')
        except (ValueError, TypeError):
            errors.append('Invalid rating')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('admin/review_form.html', product=product, review=review)
        
        # Update review
        try:
            review.name = name
            review.role = role if role else None
            review.rating = rating
            review.title = title if title else None
            review.comment = comment
            review.is_approved = is_approved
            
            db.session.commit()
            
            # Log the update action
            AdminActionLog.create_log(
                admin_id=current_user.id,
                action_type='UPDATE_REVIEW',
                target_id=review_id,
                ip_address=get_client_ip(),
                description=f'Updated review for product: {product.name}'
            )
            
            flash(f'Review updated successfully!', 'success')
            return redirect(url_for('admin.reviews_list'))
        
        except Exception as e:
            db.session.rollback()
            flash('Error updating review. Please try again.', 'danger')
            current_app.logger.error(f'Review edit error: {str(e)}')
            return render_template('admin/review_form.html', product=product, review=review)
    
    return render_template('admin/review_form.html', product=product, review=review)


@admin_bp.route('/review/<int:review_id>/delete', methods=['POST'])
@admin_required
def delete_review(review_id):
    """Delete review."""
    review = Review.query.get_or_404(review_id)
    product_name = review.product.name
    
    try:
        db.session.delete(review)
        db.session.commit()
        
        # Log the deletion action
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type='DELETE_REVIEW',
            target_id=review_id,
            ip_address=get_client_ip(),
            description=f'Deleted review from product: {product_name}'
        )
        
        flash('Review deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error deleting review. Please try again.', 'danger')
        current_app.logger.error(f'Review delete error: {str(e)}')
    
    return redirect(url_for('admin.reviews_list'))


@admin_bp.route('/review/<int:review_id>/set-approval', methods=['POST'])
@admin_required
def set_review_approval(review_id):
    """Set review approval status explicitly (approve/reject)."""
    review = Review.query.get_or_404(review_id)
    approval_value = request.form.get('is_approved', '').strip().lower()
    is_approved = approval_value in ('1', 'true', 'yes', 'on')

    if review.is_approved == is_approved:
        return redirect(url_for('admin.reviews_list'))

    try:
        review.is_approved = is_approved
        db.session.commit()

        action_type = 'APPROVE_REVIEW' if is_approved else 'REJECT_REVIEW'
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type=action_type,
            target_id=review_id,
            ip_address=get_client_ip(),
            description=f'{action_type} for review {review_id}'
        )

        flash('Review approval updated.', 'success')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Review approval update error: {str(e)}')
        flash('Error updating review approval.', 'danger')

    return redirect(url_for('admin.reviews_list'))


@admin_bp.route('/review/<int:review_id>/toggle-approval', methods=['POST'])
@admin_required
def toggle_review_approval(review_id):
    """Toggle review approval status (for ajax)."""
    review = Review.query.get_or_404(review_id)
    
    try:
        review.is_approved = not review.is_approved
        db.session.commit()
        
        action_type = 'APPROVE_REVIEW' if review.is_approved else 'REJECT_REVIEW'
        AdminActionLog.create_log(
            admin_id=current_user.id,
            action_type=action_type,
            target_id=review_id,
            ip_address=get_client_ip(),
            description=f'{action_type} for review {review_id}'
        )
        
        return jsonify({
            'success': True,
            'is_approved': review.is_approved
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Review approval toggle error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})


# FUTURE: Advanced features
# - Inventory export to CSV
# - Order export to CSV
# - Bulk product actions
# - Email notifications
# - Analytics dashboard
# - Backup functionality
# - Affiliate performance reports
# - Commission payout history
# - Shipping aggregator integration (Shiprocket API)
# - Automated stock alerts
# - Multi-warehouse management
# - Policy version history and rollback
# - Policy approval workflow
# - Multi-language policies
# - Review moderation with comments
# - Bulk review approval
# - Review filtering by rating
# - Review export for testimonials
