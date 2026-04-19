"""
Database Models for DOMINATE Ecommerce MVP
================================================

ARCHITECTURE OVERVIEW:
- User: Stores registered user accounts with authentication
- Product: Stores product inventory with pricing and stock management
- Order: Stores customer orders (guest + registered users)

KEY DESIGN DECISIONS:
1. Order.user_id is NULLABLE to support guest checkout (primary flow)
2. Order stores snapshot of customer data (name, phone, email) always
3. No forced account creation - guests can checkout immediately
4. Email opt-in is explicit and voluntary (GDPR compliant)

SCALABILITY PATHS (see comments in each model):
- Payment processing integration
- Shipping/fulfillment systems
- Email campaign management
- Analytics and reporting
- Inventory management systems
- CRM integration
- Review/rating system
- Coupon/discount system
=====================================================
"""

from datetime import datetime
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint
import re

db = SQLAlchemy()


class UserRole(str, Enum):
    """User role enumeration for role-based access control."""
    USER = 'user'
    ADMIN = 'admin'
    SUPERADMIN = 'superadmin'


class OrderStatus(str, Enum):
    """Order status enumeration for order lifecycle management."""
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    SHIPPED = 'shipped'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'


class ShippingStatus(str, Enum):
    """Shipping status enumeration for logistics tracking."""
    PENDING = 'pending'  # Order placed, not packed yet
    PACKED = 'packed'  # Packed and ready to ship
    SHIPPED = 'shipped'  # Handed over to courier
    IN_TRANSIT = 'in_transit'  # In delivery
    DELIVERED = 'delivered'  # Successfully delivered
    RETURNED = 'returned'  # Return-to-origin (RTO)


class CommissionStatus(str, Enum):
    """Commission status for affiliate orders."""
    PENDING = 'pending'  # Order not confirmed yet
    APPROVED = 'approved'  # Commission credited to wallet
    REJECTED = 'rejected'  # Cancelled order or ineligible


class PaymentStatus(str, Enum):
    """Payment transaction status."""
    PENDING = 'pending'  # Awaiting payment
    COMPLETED = 'completed'  # Payment successful
    FAILED = 'failed'  # Payment failed
    CANCELLED = 'cancelled'  # Payment cancelled


class InventoryChangeType(str, Enum):
    """Types of inventory changes."""
    SALE = 'sale'  # Stock reduced for confirmed order
    RETURN = 'return'  # Stock restored from customer return
    MANUAL_ADJUSTMENT = 'manual_adjustment'  # Admin manual change
    RECEIVED = 'received'  # New inventory received


class User(UserMixin, db.Model):
    """User model with role-based access.
    
    Supports both admin and regular users.
    Email marketing opt-in controls product/promo communications.
    """
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20))  # User's preferred phone for orders
    auth_provider = db.Column(db.String(30), nullable=False, default='local', index=True)
    auth_provider_id = db.Column(db.String(255), nullable=True, index=True)
    avatar_url = db.Column(db.Text, nullable=True)
    full_name = db.Column(db.String(255), nullable=True)
    role = db.Column(
        db.String(20),
        nullable=False,
        default=UserRole.USER.value,
        index=True
    )
    is_active = db.Column(db.Boolean, default=True, index=True)
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    email_marketing_opt_in = db.Column(db.Boolean, default=False)  # User consent for marketing emails
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Password Reset (SECURITY: Short-lived tokens)
    # reset_token: Cryptographically signed token (itsdangerous)
    # reset_expires: Expiration timestamp (24 hours from generation)
    # Both fields NULL when no reset pending
    reset_token = db.Column(db.String(500), nullable=True, unique=True, index=True)
    reset_expires = db.Column(db.DateTime, nullable=True, index=True)
    
    # Relationships
    products_created = db.relationship('Product', backref='created_by_user', foreign_keys='Product.created_by')
    orders = db.relationship('Order', backref='user', foreign_keys='Order.user_id')
    addresses = db.relationship('UserAddress', backref='user', foreign_keys='UserAddress.user_id', cascade='all, delete-orphan')
    submitted_reviews = db.relationship('Review', backref='author', foreign_keys='Review.user_id')
    
    def set_password(self, password):
        """
        Hash and set password with strength validation.
        
        PASSWORD SECURITY REQUIREMENTS:
        ===============================
        - Minimum 6 characters (stricter for admins in future)
        - Must contain letters (a-z, A-Z)
        - Must contain numbers (0-9)
        
        WHY THESE RULES:
        - Length: Prevents bruteforce attacks
        - Letters + Numbers: Prevents dictionary attacks
        - Hashing: Werkzeug PBKDF2-SHA256 with salt
        
        FUTURE ENHANCEMENTS:
        - Enforce 12+ chars for admin passwords
        - Require special characters
        - Check against common password lists
        - Integrate with HaveIBeenPwned API
        - Password history (prevent reuse)
        - Password expiration (90 days for admins)
        - MFA requirement for admin accounts
        
        Raises:
            ValueError: If password doesn't meet requirements
        """
        if not password:
            raise ValueError('Password is required')
        
        # Check minimum length
        if len(password) < 6:
            raise ValueError('Password must be at least 6 characters long')
        
        # Check for letters
        if not re.search(r'[a-zA-Z]', password):
            raise ValueError('Password must contain letters (a-z, A-Z)')
        
        # Check for numbers
        if not re.search(r'[0-9]', password):
            raise ValueError('Password must contain numbers (0-9)')
        
        # Password meets all requirements - hash and store
        # Using werkzeug's PBKDF2-SHA256 with automatic salting
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password against hash."""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def can_login_with_password(self):
        """Password login is valid only for local accounts with a password hash."""
        return self.auth_provider == 'local' and self.password_hash is not None
    
    def is_admin(self):
        """Check if user is admin or superadmin."""
        return self.role in (UserRole.ADMIN.value, UserRole.SUPERADMIN.value)
    
    def is_superadmin(self):
        """Check if user is superadmin."""
        return self.role == UserRole.SUPERADMIN.value
    
    def promote_to_admin(self):
        """Promote user to admin."""
        if self.role == UserRole.USER.value:
            self.role = UserRole.ADMIN.value
            db.session.commit()
            return True
        return False
    
    def demote_to_user(self):
        """Demote admin to user."""
        if self.role != UserRole.SUPERADMIN.value:
            self.role = UserRole.USER.value
            db.session.commit()
            return True
        return False
    
    @classmethod
    def count_superadmins(cls):
        """
        Count active superadmins in the system.
        
        SUPERADMIN GOVERNANCE:
        =====================
        - System must have at least 1 superadmin
        - Prevents lockout/orphaned system
        - Used to validate demotion/deletion
        
        Returns:
            int: Number of users with superadmin role
        """
        return db.session.query(cls).filter_by(
            role=UserRole.SUPERADMIN.value,
            is_active=True
        ).count()
    
    @classmethod
    def has_active_superadmin(cls):
        """
        Check if system has at least one active superadmin.
        
        Used before:
        - Demoting last superadmin
        - Deactivating last superadmin
        - Deleting last superadmin (future feature)
        
        Returns:
            bool: True if at least one active superadmin exists
        """
        return cls.count_superadmins() > 0
    
    def can_be_demoted(self):
        """
        Check if this user can be safely demoted.
        
        SAFETY RULES:
        - Superadmin cannot be demoted
        - Cannot demote if would leave no superadmins
        
        Returns:
            bool: True if can be demoted
        """
        if self.is_superadmin():
            # If this is the last superadmin, cannot demote
            if User.count_superadmins() <= 1:
                return False
        return True
    
    def can_be_deactivated(self):
        """
        Check if this user can be safely deactivated.
        
        SAFETY RULES:
        - Superadmin cannot be deactivated if it's the last one
        
        Returns:
            bool: True if can be deactivated
        """
        if self.is_superadmin() and User.count_superadmins() <= 1:
            return False
        return True
    
    def can_be_deleted(self):
        """
        Check if this user can be safely deleted (FUTURE).
        
        SAFETY RULES:
        - Superadmin cannot be deleted if it's the last one
        - Should preserve audit trail (soft delete preferable)
        
        FUTURE: Implement soft delete instead of hard delete
        - Mark as deleted (deleted_at timestamp)
        - Keep all historical data (orders, actions)
        - Prevent data loss for audit compliance
        
        Returns:
            bool: True if can be deleted
        """
        if self.is_superadmin() and User.count_superadmins() <= 1:
            return False
        return True
    
    # ============= PASSWORD RESET METHODS =============
    
    def generate_reset_token(self, expiration_hours=24):
        """
        Generate secure password reset token.
        
        SECURITY DESIGN:
        ================
        - Uses itsdangerous for cryptographic signing
        - Token contains user email (signed, tamper-proof)
        - Expires in 24 hours (configurable)
        - Token stored in DB for verification (single-use)
        - Token is URL-safe (can be passed in query string)
        
        WORKFLOW:
        1. User requests reset
        2. Token generated and stored in user.reset_token
        3. Token sent via email
        4. User clicks link with token
        5. verify_reset_token() validates token
        6. User sets new password
        7. clear_reset_token() removes token
        
        Args:
            expiration_hours: Hours until token expires (default: 24)
            
        Returns:
            str: URL-safe token string
            
        Example:
            >>> user.generate_reset_token()
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        """
        from itsdangerous import URLSafeTimedSerializer
        from flask import current_app
        from datetime import timedelta
        
        # Create serializer with app secret key
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        
        # Generate token (contains email, signed with secret)
        token = s.dumps({'user_id': self.id, 'email': self.email}, salt='password-reset')
        
        # Store token and expiration in database
        self.reset_token = token
        self.reset_expires = datetime.utcnow() + timedelta(hours=expiration_hours)
        db.session.commit()
        
        return token
    
    @staticmethod
    def verify_reset_token(token, max_age=86400):
        """
        Verify password reset token is valid and not expired.
        
        SECURITY CHECKS:
        ================
        1. Signature validation (tamper detection)
        2. Expiration check (max_age in seconds, default 24h)
        3. Database lookup (token must exist in DB)
        4. Expiry timestamp check (double validation)
        5. User must be active
        
        Args:
            token: Token string to verify
            max_age: Maximum age in seconds (default: 86400 = 24 hours)
            
        Returns:
            User object if valid, None if invalid/expired
            
        Example:
            >>> user = User.verify_reset_token('abc123...')
            >>> if user:
            >>>     user.set_password('new_password')
            >>>     user.clear_reset_token()
        """
        from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
        from flask import current_app
        
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        
        try:
            # Verify signature and extract data
            data = s.loads(token, salt='password-reset', max_age=max_age)
            user_id = data.get('user_id')
            
        except SignatureExpired:
            # Token expired
            return None
        except BadSignature:
            # Token tampered or invalid
            return None
        except Exception:
            # Any other error (malformed token, etc)
            return None
        
        # Look up user in database
        user = User.query.filter_by(id=user_id, reset_token=token, is_active=True).first()
        
        if not user:
            return None
        
        # Double-check expiration from database (belt and suspenders)
        if user.reset_expires and user.reset_expires < datetime.utcnow():
            return None
        
        return user
    
    def clear_reset_token(self):
        """
        Clear password reset token after successful reset.
        
        Called after:
        - Password successfully reset
        - User uses the token
        - Token should be single-use
        
        Returns:
            bool: True if successful
        """
        self.reset_token = None
        self.reset_expires = None
        db.session.commit()
        return True
    
    def __repr__(self):
        return f'<User {self.email} ({self.role})>'


class UserAddress(db.Model):
    """
    Saved address book entries for logged-in users.

    Orders continue storing immutable snapshot address fields.
    This table enables reusable addresses for future checkout UX.
    """

    __tablename__ = 'user_addresses'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    label = db.Column(db.String(50), nullable=False, default='Home')
    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)

    street_line1 = db.Column(db.String(255), nullable=False)
    street_line2 = db.Column(db.String(255), nullable=True)
    landmark = db.Column(db.String(255), nullable=True)

    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    pincode = db.Column(db.String(10), nullable=False)

    is_default = db.Column(db.Boolean, nullable=False, default=False, index=True)

    # Seed columns for future delivery zone logic
    lat = db.Column(db.Numeric(9, 6), nullable=True)
    lng = db.Column(db.Numeric(9, 6), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f'<UserAddress {self.id} user={self.user_id} default={self.is_default}>'


class ProductCategory(db.Model):
    """
    Product category model for hierarchical organization.
    
    ARCHITECTURE:
    =============
    Self-referencing foreign key enables nested categories:
    - parent_id = NULL → Top-level category
    - parent_id = ID → Subcategory
    
    EXAMPLE TREE:
    =============
    BARS & STANDS (parent_id=NULL)
    ├─ Pull-Up Bars (parent_id=1)
    │  ├─ Wall Mounted (parent_id=2)
    │  ├─ Doorway (parent_id=2)
    │  └─ Standalone (parent_id=2)
    ├─ Dip Stations (parent_id=1)
    └─ Parallelettes (parent_id=1)
    
    RINGS (parent_id=NULL)
    ├─ Gymnastics Rings (parent_id=6)
    └─ Ring Stands (parent_id=6)
    
    URL STRUCTURE:
    ==============
    - /products/bars-stands (top level)
    - /products/bars-stands/pull-up-bars (level 2)
    - /products/bars-stands/pull-up-bars/wall-mounted (level 3)
    
    SCALABILITY:
    ============
    - Unlimited nesting depth supported
    - Fast queries with proper indexing
    - Easy breadcrumb trail generation
    - Filter products by category + subcategories
    
    FUTURE ENHANCEMENTS:
    ====================
    - Category images/banners
    - SEO metadata per category
    - Category-specific filters
    - Featured categories
    - Analytics per category
    """
    
    __tablename__ = 'product_categories'
    __table_args__ = (
        CheckConstraint('display_order >= 0', name='ck_category_display_order_non_negative'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    
    # Self-referencing foreign key for hierarchy
    parent_id = db.Column(db.Integer, db.ForeignKey('product_categories.id'), nullable=True, index=True)
    
    # Display settings
    icon = db.Column(db.String(50))  # CSS class or emoji for display
    display_order = db.Column(db.Integer, default=0)  # Sort order within parent
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    children = db.relationship(
        'ProductCategory',
        backref=db.backref('parent', remote_side=[id]),
        cascade='all, delete-orphan',
        order_by='ProductCategory.display_order'
    )
    
    # Products in this category
    products = db.relationship('Product', backref='category', lazy='dynamic')
    
    # FUTURE: SEO metadata
    meta_title = db.Column(db.String(255), nullable=True)
    meta_desc = db.Column(db.Text, nullable=True)
    # image_url = db.Column(db.String(255))
    
    def get_breadcrumb_trail(self):
        """
        Generate breadcrumb trail from root to this category.
        
        Returns:
            list: [root_category, ..., this_category]
        """
        trail = [self]
        current = self
        while current.parent:
            trail.insert(0, current.parent)
            current = current.parent
        return trail
    
    def get_all_children(self, include_self=True):
        """
        Get all descendant categories recursively.
        
        Args:
            include_self: Whether to include this category
            
        Returns:
            list: All category objects in tree
        """
        categories = [self] if include_self else []
        for child in self.children:
            categories.extend(child.get_all_children(include_self=True))
        return categories
    
    def get_all_products(self, include_subcategories=True):
        """
        Get all products in this category.
        
        Args:
            include_subcategories: Include products from child categories
            
        Returns:
            Query: Product query object
        """
        if include_subcategories:
            category_ids = [cat.id for cat in self.get_all_children(include_self=True)]
            return Product.query.filter(Product.category_id.in_(category_ids), Product.is_active == True)
        else:
            return self.products.filter_by(is_active=True)
    
    def get_product_count(self, include_subcategories=True):
        """
        Count active products in this category.
        
        Args:
            include_subcategories: Include products from child categories
            
        Returns:
            int: Number of products
        """
        return self.get_all_products(include_subcategories).count()
    
    def get_depth_level(self):
        """
        Calculate depth level in tree (root=0, children=1, etc).
        
        Returns:
            int: Depth level
        """
        level = 0
        current = self
        while current.parent:
            level += 1
            current = current.parent
        return level
    
    def is_root(self):
        """Check if this is a top-level category."""
        return self.parent_id is None
    
    def has_children(self):
        """Check if this category has subcategories."""
        return len(self.children) > 0
    
    @classmethod
    def get_root_categories(cls):
        """
        Get all top-level categories.
        
        Returns:
            Query: Root categories ordered by display_order
        """
        return cls.query.filter_by(parent_id=None, is_active=True).order_by(cls.display_order)
    
    def __repr__(self):
        return f'<ProductCategory {self.name} (id={self.id}, parent_id={self.parent_id})>'


class Product(db.Model):
    """
    Product model for handmade calisthenics equipment.
    
    BUSINESS CONTEXT:
    =================
    - Production outsourced to local carpenters
    - We receive, inspect, and ship (not drop-shipping)
    - Stock managed manually by admin
    - Weight/dimensions needed for shipping cost calculation
    
    FUTURE WAREHOUSE MANAGEMENT:
    ============================
    - Add warehouse_location field (when multi-location inventory)
    - Add quality_grade field (A/B/C based on inspection)
    - Add batch_number for tracking carpenter batches
    - Add damage_notes field for quality control
    - Add return_count field for tracking defective units
    - Add restock_threshold for automated alerts
    - Add supplier_id FK for multi-supplier management
    - Integration with shipping aggregator (Shiprocket) for auto weight/dimension sync
    """
    
    __tablename__ = 'products'
    __table_args__ = (
        CheckConstraint('stock_quantity >= 0', name='ck_products_stock_non_negative'),
        CheckConstraint('price > 0', name='ck_products_price_positive'),
        CheckConstraint('weight_grams > 0', name='ck_products_weight_positive'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    slug = db.Column(db.String(150), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    
    # SKU - Stock Keeping Unit (nullable for backward compatibility)
    # Used for: inventory tracking, courier integration, accounting
    sku = db.Column(db.String(50), unique=True, nullable=True, index=True)
    
    # Category (nullable for backward compatibility)
    category_id = db.Column(db.Integer, db.ForeignKey('product_categories.id'), nullable=True, index=True)
    
    price = db.Column(db.Integer, nullable=False)  # Stored in paise (100 paise = ₹1)
    
    # Pricing System (Smart Discounts)
    price_original = db.Column(db.Integer, nullable=True)  # Original MRP in paise
    price_discounted = db.Column(db.Integer, nullable=True)  # Discounted price in paise
    is_discount_active = db.Column(db.Boolean, default=False)  # Discount toggle
    
    # Inventory Management
    stock_quantity = db.Column(db.Integer, nullable=False, default=0, index=True)
    
    # Shipping Information (required for shipping cost calculation)
    weight_grams = db.Column(db.Integer, nullable=False)  # Weight in grams
    dimensions = db.Column(db.String(100), nullable=True)  # Format: "LxWxH cm" (optional, for irregular items)
    
    # Product Metadata
    image_url = db.Column(db.String(255))
    hsn_code = db.Column(db.String(10), nullable=True)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=18.00)
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Admin tracking
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # Note: Orders accessed through OrderItem (Product → OrderItem → Order)
    variants = db.relationship('ProductVariant', backref='product', cascade='all, delete-orphan')
    reviews = db.relationship('Review', backref='product', cascade='all, delete-orphan')
    # images relationship is defined in ProductImage model
    
    # FUTURE: Analytics integration
    # views_count = db.Column(db.Integer, default=0)
    # sales_count = db.Column(db.Integer, default=0)
    # conversion_rate = db.Column(db.Float, default=0.0)
    
    def get_price_formatted(self):
        """Return price in rupees format."""
        return self.price / 100
    
    def get_price_display(self):
        """
        Return formatted price string based on discount status.
        
        PRICING LOGIC:
        - If discount is active and discounted price is set, use discounted price
        - Otherwise use regular price
        - Returns formatted string with currency symbol
        """
        if self.is_discount_active and self.price_discounted:
            return f'₹{self.price_discounted / 100:.2f}'
        return f'₹{self.get_price_formatted():.2f}'
    
    def get_original_price_display(self):
        """Get original price formatted (for strikethrough display)."""
        if self.price_original:
            return f'₹{self.price_original / 100:.2f}'
        return f'₹{self.get_price_formatted():.2f}'
    
    def get_discount_percentage(self):
        """
        Calculate discount percentage automatically.
        
        LOGIC:
        - If discount active and both prices set: calculate percentage
        - Otherwise return 0
        
        Returns:
            int: Discount percentage (0-100)
        """
        if not self.is_discount_active:
            return 0
        
        if not self.price_original or not self.price_discounted:
            return 0
        
        if self.price_original <= 0:
            return 0
        
        discount = ((self.price_original - self.price_discounted) / self.price_original) * 100
        return int(discount)
    
    def has_active_discount(self):
        """Check if discount badge should be displayed."""
        return (
            self.is_discount_active and 
            self.price_original and 
            self.price_discounted and 
            self.price_original > self.price_discounted
        )
    
    def get_average_rating(self):
        """Calculate average rating from approved reviews."""
        approved_reviews = Review.query.filter_by(
            product_id=self.id,
            is_approved=True
        ).all()
        
        if not approved_reviews:
            return 0
        
        total_rating = sum(r.rating for r in approved_reviews)
        return round(total_rating / len(approved_reviews), 1)
    
    def get_review_count(self):
        """Get count of approved reviews."""
        return Review.query.filter_by(
            product_id=self.id,
            is_approved=True
        ).count()
    
    def get_approved_reviews(self):
        """Get all approved reviews for display."""
        return Review.query.filter_by(
            product_id=self.id,
            is_approved=True
        ).order_by(Review.created_at.desc()).all()
    
    def get_primary_image(self):
        """
        Get primary image for this product (for listing display).
        
        Returns:
            ProductImage object or None
        """
        # Primary image will use ProductImage.get_primary_image(self.id)
        # This method is here for convenience
        from app.models import ProductImage
        return ProductImage.get_primary_image(self.id)
    
    def get_all_images(self):
        """
        Get all images for this product ordered by display_order.
        
        Returns:
            list: ProductImage objects
        """
        return self.images  # Auto-populated by SQLAlchemy relationship
    
    def decrease_stock(self, quantity):
        """
        Safely decrease stock when order is CONFIRMED.
        
        BUSINESS RULE:
        - Stock is reduced ONLY when admin confirms order (not on placement)
        - Prevents overselling from pending orders
        - Admin confirms after payment verification
        
        Args:
            quantity: Amount to decrease
            
        Returns:
            bool: True if successful, False if insufficient stock
        """
        if quantity <= 0:
            return False
        
        if self.stock_quantity < quantity:
            return False
        
        self.stock_quantity -= quantity
        return True
    
    def increase_stock(self, quantity):
        """
        Increase stock (for order cancellations, returns, or new inventory).
        
        Used when:
        - Order cancelled (return stock)
        - Customer return processed
        - New inventory received from carpenter
        - Admin manual adjustment
        """
        if quantity > 0:
            self.stock_quantity += quantity
            return True
        return False
    
    def set_stock(self, quantity):
        """
        Manually set stock quantity (admin override).
        
        Used for:
        - Receiving new inventory batches
        - Correcting stock discrepancies
        - Damage/loss adjustments
        
        Args:
            quantity: New stock quantity
            
        Returns:
            bool: True if successful
        """
        if quantity < 0:
            return False
        
        self.stock_quantity = quantity
        return True
    
    def is_in_stock(self):
        """Check if product has available stock."""
        return self.stock_quantity > 0 and self.is_active
    
    def __repr__(self):
        return f'<Product {self.name}>'


class ProductVariant(db.Model):
    """
    Product variants for size/flavour/color/weight style differentiation.

    DESIGN GOAL:
    - Keep parent product as merchandising container
    - Store variant-specific attributes in option_values JSON
    - Support variant-level inventory and optional price override
    """

    __tablename__ = 'product_variants'
    __table_args__ = (
        CheckConstraint('stock_quantity >= 0', name='ck_variant_stock_non_negative'),
    )

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    sku = db.Column(db.String(100), unique=True, nullable=False, index=True)

    # Flexible attributes, e.g. {"size": "XL", "color": "Black"}
    option_values = db.Column(db.JSON, nullable=False, default=dict)

    # Null means inherit from parent product pricing
    price_override = db.Column(db.Integer, nullable=True)

    stock_quantity = db.Column(db.Integer, nullable=False, default=0, index=True)
    weight_grams = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def get_effective_price(self):
        """Get variant price, inheriting parent product price when override is unset."""
        return self.price_override if self.price_override is not None else self.product.price

    def get_effective_weight_grams(self):
        """Get variant weight, inheriting parent product weight when override is unset."""
        return self.weight_grams if self.weight_grams is not None else self.product.weight_grams

    def __repr__(self):
        return f'<ProductVariant {self.sku} (Product {self.product_id})>'


class OrderItem(db.Model):
    """
    Order line items - individual products within an order.
    
    DESIGN PRINCIPLE:
    =================
    One Order = one purchase transaction (one order number)
    One Order contains many OrderItems (line items for each product)
    One OrderItem = one product with quantity and unit price snapshot
    
    KEY FEATURES:
    - Stores price snapshot (protects from product price changes)
    - Links to Product for reference (but price is immutable snapshot)
    - Tracks individual item status (shipped, delivered, etc. - future)
    - Enables per-item commission calculation (if needed)
    
    SCALABILITY:
    - Supports unlimited products per order
    - Historical price tracking (prices in OrderItem never change)
    - Per-item shipping tracking (future feature)
    - Per-item return management (future feature)
    """
    
    __tablename__ = 'order_items'
    __table_args__ = (
        CheckConstraint('quantity > 0', name='ck_orderitem_quantity_positive'),
        CheckConstraint('unit_price > 0', name='ck_orderitem_price_positive'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign key to Order
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    
    # Product reference (immutable snapshot)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)

    # Variant reference (nullable during transition/backfill)
    variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'), nullable=False, index=True)
    variant_snapshot = db.Column(db.JSON, nullable=True)  # e.g. {"size": "M", "flavour": "Chocolate"}
    
    # Quantity and price (snapshot - never modified)
    quantity = db.Column(db.Integer, nullable=False)  # How many units
    unit_price = db.Column(db.Integer, nullable=False)  # Price per unit in paise (snapshot at time of order)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    order = db.relationship('Order', backref='items')
    product = db.relationship('Product', backref='order_items')
    variant = db.relationship('ProductVariant', backref='order_items', foreign_keys=[variant_id])
    reviews = db.relationship('Review', backref='order_item', foreign_keys='Review.order_item_id')
    
    def get_subtotal(self):
        """Calculate subtotal: quantity × unit_price (in paise)."""
        return self.quantity * self.unit_price
    
    def get_subtotal_display(self):
        """Return formatted subtotal string."""
        return f'₹{self.get_subtotal() / 100:.2f}'
    
    def get_unit_price_display(self):
        """Return formatted unit price string."""
        return f'₹{self.unit_price / 100:.2f}'
    
    def __repr__(self):
        return f'<OrderItem order_id={self.order_id} product_id={self.product_id} qty={self.quantity}>'


class CouponCode(db.Model):
    """
    Coupon/Promotion Code model for flexible discount management.
    
    SUPPORTS MULTIPLE COUPON TYPES:
    ===============================
    - affiliate: Affiliate referral codes (linked to AffiliateProfile)
    - promotional: Marketing campaigns (no affiliate link)
    - seasonal: Time-limited promotions (e.g., SUMMER20, DIWALI25)
    - loyalty: Member rewards (e.g., VIP discounts)
    
    DESIGN PHILOSOPHY:
    ==================
    - Single table handles all coupon types (scalable)
    - Separates concerns: Affiliate system vs Coupon management
    - Audit trail: tracks creation, usage, expiry
    - Flexible: Can be percent-based or fixed amount
    - Analytics: Usage stats built in (current_uses tracking)
    
    AFFILIATE INTEGRATION:
    ======================
    - When affiliate_profile is created, corresponding CouponCode is created
    - affiliate_id field (optional) links to affiliate's user_id
    - coupon_type='affiliate' identifies affiliate coupons
    - Non-affiliate coupons have affiliate_id = NULL
    
    BUSINESS RULES:
    ===============
    - Code must be unique (database constraint)
    - Discount: either percent OR fixed amount (not both)
    - Max uses can be unlimited (NULL) or capped (e.g., 500)
    - Expiry is optional (NULL = never expires)
    - Min order value can filter by order size
    - Max discount can cap discount amount (e.g., max ₹500)
    """
    
    __tablename__ = 'coupon_codes'
    __table_args__ = (
        CheckConstraint('(discount_percent IS NOT NULL OR discount_amount_fixed IS NOT NULL)', 
                       name='ck_coupon_has_discount'),
        CheckConstraint('discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)', 
                       name='ck_coupon_percent_valid'),
        CheckConstraint('discount_amount_fixed IS NULL OR discount_amount_fixed >= 0', 
                       name='ck_coupon_fixed_non_negative'),
        CheckConstraint('max_uses IS NULL OR max_uses > 0', 
                       name='ck_coupon_max_uses_positive'),
        CheckConstraint('current_uses >= 0', 
                       name='ck_coupon_current_uses_non_negative'),
        CheckConstraint('min_order_value >= 0', 
                       name='ck_coupon_min_order_non_negative'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Coupon Code (unique identifier)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Discount: Either percent-based OR fixed amount (not both)
    discount_percent = db.Column(db.Integer, nullable=True)  # e.g., 10 for 10%
    discount_amount_fixed = db.Column(db.Integer, nullable=True)  # e.g., 10000 for ₹100 (in paise)
    
    # Coupon Type (for categorization and business logic)
    coupon_type = db.Column(
        db.String(20),
        nullable=False,
        default='promotional',
        index=True
    )  # affiliate, promotional, seasonal, loyalty
    
    # Affiliate Link (optional - only for affiliate coupons)
    affiliate_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Usage Limits
    max_uses = db.Column(db.Integer, nullable=True)  # NULL = unlimited
    current_uses = db.Column(db.Integer, nullable=False, default=0)
    
    # Minimum order value to apply coupon (in paise)
    min_order_value = db.Column(db.Integer, nullable=False, default=0)
    
    # Maximum discount cap (e.g., can't exceed ₹500 even if 50% of ₹2000 order)
    max_discount = db.Column(db.Integer, nullable=True)  # NULL = no cap
    
    # Status
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    
    # Expiry (optional)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Audit Trail
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    affiliate = db.relationship('User', foreign_keys=[affiliate_id], backref='affiliate_coupons')
    creator = db.relationship('User', foreign_keys=[created_by_user_id], backref='created_coupons')
    
    def is_valid(self):
        """
        Check if coupon is currently valid for use.
        
        Returns:
            tuple: (bool, str) - (is_valid, reason_if_invalid)
        """
        if not self.is_active:
            return False, 'Coupon is inactive'
        
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False, 'Coupon has expired'
        
        if self.max_uses and self.current_uses >= self.max_uses:
            return False, 'Coupon usage limit reached'
        
        return True, 'Valid'
    
    def can_apply_to_order(self, order_subtotal):
        """
        Check if coupon can apply to specific order.
        
        Args:
            order_subtotal: Order subtotal in paise
            
        Returns:
            tuple: (bool, str) - (can_apply, reason_if_not)
        """
        valid, reason = self.is_valid()
        if not valid:
            return False, reason
        
        if order_subtotal < self.min_order_value:
            return False, f'Order must be at least ₹{self.min_order_value / 100:.2f}'
        
        return True, 'Valid'
    
    def calculate_discount(self, order_subtotal):
        """
        Calculate discount amount for an order.
        
        Args:
            order_subtotal: Order subtotal in paise
            
        Returns:
            int: Discount amount in paise
        """
        if self.discount_percent:
            discount = int(order_subtotal * (self.discount_percent / 100))
        else:
            discount = self.discount_amount_fixed
        
        # Apply max discount cap if set
        if self.max_discount:
            discount = min(discount, self.max_discount)
        
        return discount
    
    def increment_usage(self):
        """Increment coupon usage count."""
        self.current_uses += 1
        db.session.commit()
    
    def get_discount_display(self):
        """Return formatted discount description."""
        if self.discount_percent:
            return f'{self.discount_percent}% off'
        else:
            return f'₹{self.discount_amount_fixed / 100:.2f} off'
    
    def __repr__(self):
        return f'<CouponCode code={self.code} type={self.coupon_type} uses={self.current_uses}/{self.max_uses}>'


class Order(db.Model):
    """
    Order model for customer purchases.
    
    BUSINESS MODEL (STANDARDS-COMPLIANT):
    ======================================
    - ONE order = ONE order number = ONE purchase transaction
    - ONE order contains multiple OrderItems (line items)
    - Each OrderItem = one product with quantity and snapshot price
    - Supports BOTH guest checkout and logged-in user orders
    - Guest checkout is DEFAULT (low friction)
    - Stores complete order snapshot (name, phone, email, address) always
    - No forced account creation
    - Email opt-in is explicit and voluntary (GDPR compliant)
    
    SHIPPING ARCHITECTURE (PAN-INDIA PHASE 1):
    ===========================================
    - Manual shipping workflow initially
    - Admin updates shipping_status and adds tracking_number
    - Prepared for shipping aggregator integration (Shiprocket)
    - COD support ready (future)
    - Return-to-origin (RTO) handling
    
    AFFILIATE COMMISSION:
    =====================
    - Orders can have optional affiliate_id (from referral link)
    - Commission calculated when order CONFIRMED (not on placement)
    - Commission credited to affiliate wallet as store credit
    - Self-referral prevented (affiliate can't use own code)
    
    FUTURE GLOBAL EXPANSION (PHASE 2):
    ===================================
    - Add country field for international orders
    - Add customs_value and hs_code for customs
    - Add currency field (INR, USD, EUR)
    - Add international_shipping_cost
    - Integration with international couriers (DHL, FedEx)
    
    FUTURE PAYMENT INTEGRATION:
    ===========================
    - Add payment_gateway (razorpay, stripe, paypal)
    - Add transaction_id (unique index)
    - Add payment_status (pending, completed, failed, refunded)
    - Add paid_at timestamp
    - COD workflow (cod_verified, cod_collected)
    """
    
    __tablename__ = 'orders'
    __table_args__ = (
        CheckConstraint('commission_amount >= 0', name='ck_orders_commission_non_negative'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(30), unique=True, nullable=False, index=True)  # VARCHAR(30) for ORD-YYYYMMDDHHMMSS-XXXXXX format
    
    # User reference (nullable for guest orders)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)

    # Optional link to a saved address used at checkout.
    # Snapshot fields below remain the immutable order record.
    address_id = db.Column(db.Integer, db.ForeignKey('user_addresses.id'), nullable=True, index=True)
    
    # Affiliate tracking (nullable - only filled if referred)
    affiliate_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Coupon tracking (nullable - only filled if coupon applied)
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupon_codes.id'), nullable=True, index=True)
    
    # Order details snapshot (always captured, regardless of guest/logged-in)
    guest_name = db.Column(db.String(120), nullable=False)
    guest_phone = db.Column(db.String(20), nullable=False)
    guest_email = db.Column(db.String(120), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)  # Indian state
    pincode = db.Column(db.String(6), nullable=False)  # 6-digit pincode
    address = db.Column(db.Text, nullable=False)
    
    # Affiliate Commission (calculated across all items)
    commission_amount = db.Column(db.Integer, nullable=False, default=0)  # In paise
    commission_status = db.Column(
        db.String(20),
        nullable=False,
        default=CommissionStatus.PENDING.value,
        index=True
    )
    
    # Order status tracking
    status = db.Column(
        db.String(20),
        nullable=False,
        default=OrderStatus.PENDING.value,
        index=True
    )
    
    # Shipping Information (Pan-India initially, Global Phase 2)
    shipping_status = db.Column(
        db.String(20),
        nullable=False,
        default=ShippingStatus.PENDING.value,
        index=True
    )
    tracking_number = db.Column(db.String(100), nullable=True, index=True)
    courier_name = db.Column(db.String(50), nullable=True)  # Delhivery, BlueDart, etc
    shipping_cost = db.Column(db.Integer, nullable=True)  # In paise (optional for now)
    currency_code = db.Column(db.String(3), nullable=False, default='INR', index=True)  # ISO 4217
    
    # Financial Snapshot Fields (IMMUTABLE - captured at order creation/confirmation)
    # These fields preserve historical financial data for accurate reporting
    # and payment gateway reconciliation
    subtotal_amount = db.Column(db.Integer, nullable=True)  # Sum of all OrderItem.subtotal (in paise)
    applied_discount = db.Column(db.Integer, nullable=False, default=0)  # Actual discount applied (in paise) - NEW!
    discount_type = db.Column(db.String(20), nullable=True)  # affiliate, promotional, seasonal, loyalty - NEW!
    shipping_amount = db.Column(db.Integer, nullable=True, default=0)  # Shipping cost snapshot
    discount_amount = db.Column(db.Integer, nullable=True, default=0)  # Total discounts applied
    tax_amount = db.Column(db.Integer, nullable=True, default=0)  # GST or taxes (currently 0)
    total_amount = db.Column(db.Integer, nullable=True)  # Final total: subtotal + shipping - discount + tax (IMMUTABLE)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)  # When admin confirms order
    shipped_at = db.Column(db.DateTime, nullable=True)  # When handed to courier
    delivered_at = db.Column(db.DateTime, nullable=True)  # When successfully delivered
    
    # Relationships
    affiliate = db.relationship('User', foreign_keys=[affiliate_id], backref='referral_orders')
    coupon = db.relationship('CouponCode', backref='orders')
    saved_address = db.relationship('UserAddress', foreign_keys=[address_id], backref='orders')
    # payment_gateway = db.Column(db.String(50))  # razorpay, stripe, paypal, etc
    # transaction_id = db.Column(db.String(100), unique=True, index=True)
    # payment_status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    # paid_at = db.Column(db.DateTime)
    # payment_method = db.Column(db.String(20))  # card, upi, netbanking, cod
    
    # FUTURE: International expansion (Phase 2)
    # country = db.Column(db.String(2))  # ISO 3166-1 alpha-2 code (IN, US, GB)
    # currency = db.Column(db.String(3), default='INR')  # ISO 4217 currency code
    # customs_value = db.Column(db.Integer)  # For customs declaration
    # hs_code = db.Column(db.String(10))  # Harmonized System code for customs
    # international_shipping_cost = db.Column(db.Integer)
    
    # FUTURE: Marketing & Analytics
    # coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'), nullable=True)
    # discount_amount = db.Column(db.Integer, default=0)  # in paise
    # utm_source = db.Column(db.String(100))  # For tracking campaign source
    # utm_campaign = db.Column(db.String(100))  # For tracking campaign
    
    def get_total_price_formatted(self):
        """Return total price in rupees format (calculated from items)."""
        return self.get_total_price() / 100
    
    def get_total_price(self):
        """Calculate total order value from all items (in paise)."""
        return sum(item.get_subtotal() for item in self.items)
    
    def get_total_price_display(self):
        """Return formatted total price string."""
        return f'₹{self.get_total_price_formatted():.2f}'
    
    def get_commission_amount_display(self):
        """Return formatted commission amount string."""
        return f'₹{self.commission_amount / 100:.2f}'
    
    def is_guest_order(self):
        """Check if this is a guest order."""
        return self.user_id is None
    
    def has_affiliate(self):
        """Check if order was referred by an affiliate."""
        return self.affiliate_id is not None
    
    def is_self_referral(self):
        """
        Check if customer used their own affiliate code.
        
        BUSINESS RULE: Affiliates cannot earn commission on own orders.
        """
        if not self.has_affiliate():
            return False
        return self.user_id == self.affiliate_id
    
    def calculate_commission(self, affiliate_profile):
        """
        Calculate commission for this order based on affiliate's rate.
        
        BUSINESS RULES:
        - Commission calculated when order is CONFIRMED
        - No commission for self-referrals
        - No commission for cancelled orders
        - Commission based on total_price (sum of all items)
        
        Args:
            affiliate_profile: AffiliateProfile instance
            
        Returns:
            int: Commission amount in paise
        """
        if self.is_self_referral():
            return 0
        
        if self.status == OrderStatus.CANCELLED.value:
            return 0
        
        # Calculate commission as percentage of total price from all items
        total_price = self.get_total_price()
        commission = int(total_price * (affiliate_profile.commission_percent / 100.0))
        return commission
    
    def approve_commission(self):
        """
        Approve commission and credit to affiliate wallet.
        
        Called by admin after order confirmation/shipment.
        
        BUSINESS LOGIC:
        - Update commission_status to APPROVED
        - Credit commission_amount to affiliate's wallet_balance
        - Update affiliate's total_earned
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.has_affiliate():
            return False
        
        if self.is_self_referral():
            self.commission_status = CommissionStatus.REJECTED.value
            db.session.commit()
            return False
        
        if self.commission_status == CommissionStatus.APPROVED.value:
            return False  # Already approved
        
        # Get affiliate profile
        from app.models import AffiliateProfile
        affiliate_profile = AffiliateProfile.query.filter_by(user_id=self.affiliate_id).first()
        
        if not affiliate_profile or not affiliate_profile.is_active:
            self.commission_status = CommissionStatus.REJECTED.value
            db.session.commit()
            return False
        
        # Credit wallet
        affiliate_profile.wallet_balance += self.commission_amount
        affiliate_profile.total_earned += self.commission_amount
        
        # Update commission status
        self.commission_status = CommissionStatus.APPROVED.value
        
        db.session.commit()
        return True
    
    def reject_commission(self):
        """
        Reject commission (for cancelled orders or policy violations).
        
        Returns:
            bool: True if successful
        """
        self.commission_status = CommissionStatus.REJECTED.value
        db.session.commit()
        return True
    
    def update_shipping_status(self, new_status, tracking_number=None, courier_name=None):
        """
        Update shipping status and related fields.
        
        Args:
            new_status: New ShippingStatus value
            tracking_number: Optional tracking number
            courier_name: Optional courier name
            
        Returns:
            bool: True if successful
        """
        self.shipping_status = new_status
        
        if tracking_number:
            self.tracking_number = tracking_number
        
        if courier_name:
            self.courier_name = courier_name
        
        # Set timestamps
        if new_status == ShippingStatus.SHIPPED.value:
            self.shipped_at = datetime.utcnow()
        elif new_status == ShippingStatus.DELIVERED.value:
            self.delivered_at = datetime.utcnow()
        
        db.session.commit()
        return True
    
    def confirm_order(self):
        """
        Confirm order and reduce stock for all items (WITH ATOMIC TRANSACTION).
        
        BUSINESS LOGIC (TRANSACTION-SAFE):
        - Mark order as CONFIRMED
        - Reduce product stock by quantity for EACH item
        - Capture financial snapshot (subtotal, shipping, tax, total)
        - Calculate and set commission_amount
        - Create Payment record (status = completed for WhatsApp)
        - Create InventoryLog entries for each item
        - Set confirmed_at timestamp
        
        ATOMICITY:
        - All changes commit together or rollback completely
        - No partial stock deduction allowed
        - No orphaned financial records
        
        Returns:
            bool: True if successful, False if any item has insufficient stock or error
        """
        if self.status == OrderStatus.CONFIRMED.value:
            return False  # Already confirmed
        
        try:
            order_item_product_ids = [item.product_id for item in self.items]
            locked_products = {
                product.id: product
                for product in (
                    Product.query
                    .filter(Product.id.in_(order_item_product_ids))
                    .with_for_update()
                    .all()
                )
            }

            # ATOMIC TRANSACTION: All or nothing
            # Check stock availability first (before committing)
            for item in self.items:
                product = locked_products.get(item.product_id)
                if not product or product.stock_quantity < item.quantity:
                    return False  # Insufficient stock - abort without changes
            
            # 1. Calculate financial snapshot (never changes after this)
            self.subtotal_amount = sum(item.get_subtotal() for item in self.items)
            self.shipping_amount = self.shipping_cost or 0
            
            # Apply discount from coupon if present
            if self.coupon_id and self.applied_discount > 0:
                self.discount_amount = self.applied_discount
                self.discount_type = self.coupon.coupon_type if self.coupon else None
            else:
                self.discount_amount = 0
                self.discount_type = None
            
            self.tax_amount = 0  # Ready for future GST implementation
            self.total_amount = self.subtotal_amount + self.shipping_amount - self.discount_amount + self.tax_amount
            
            # 2. Reduce stock and create inventory logs for each item
            for item in self.items:
                product = locked_products.get(item.product_id)
                if not product.decrease_stock(item.quantity):
                    return False  # Should not happen (checked above), but safety check
                
                # Create InventoryLog entry for audit trail
                inventory_log = InventoryLog(
                    product_id=item.product_id,
                    change_type=InventoryChangeType.SALE.value,
                    quantity=-item.quantity,  # Negative for stock reduction
                    reference_order_id=self.id
                )
                db.session.add(inventory_log)
            
            # 3. Calculate commission if affiliate exists
            # IMPORTANT: Commission calculated on ACTUAL REVENUE (after discount) - Option A
            if self.has_affiliate() and not self.is_self_referral():
                from app.models import AffiliateProfile
                affiliate_profile = AffiliateProfile.query.filter_by(user_id=self.affiliate_id).first()
                if affiliate_profile and affiliate_profile.is_active:
                    # Commission base = subtotal - discount (actual money received)
                    commission_base = self.subtotal_amount - self.discount_amount
                    commission = int(commission_base * (affiliate_profile.commission_percent / 100.0))
                    self.commission_amount = commission
            
            # 4. Update order status
            self.status = OrderStatus.CONFIRMED.value
            self.confirmed_at = datetime.utcnow()

            # 4.1 Track coupon usage on successful order confirmation
            if self.coupon_id and self.applied_discount > 0 and self.coupon:
                self.coupon.current_uses = (self.coupon.current_uses or 0) + 1
            
            # 5. Create Payment record for WhatsApp manual payment
            payment = Payment(
                order_id=self.id,
                gateway='whatsapp_manual',
                amount=self.total_amount,
                currency='INR',
                status=PaymentStatus.COMPLETED.value,
                paid_at=datetime.utcnow()
            )
            db.session.add(payment)
            
            # COMMIT ALL CHANGES ATOMICALLY
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            # Log error but don't crash
            from flask import current_app
            current_app.logger.error(f'Error confirming order {self.order_number}: {str(e)}')
            return False
    
    def cancel_order(self):
        """
        Cancel order and restore stock for all items.
        
        BUSINESS LOGIC:
        - Mark order as CANCELLED
        - Restore product stock if order was confirmed for EACH item
        - Create InventoryLog entries for audit trail
        - Reject commission if applicable
        
        Returns:
            bool: True if successful
        """
        if self.status == OrderStatus.CANCELLED.value:
            return False  # Already cancelled
        
        try:
            # Restore stock for each item if order was confirmed
            if self.status == OrderStatus.CONFIRMED.value:
                for item in self.items:
                    product = item.product
                    if product:
                        product.increase_stock(item.quantity)
                        
                        # Create InventoryLog entry for stock restoration
                        inventory_log = InventoryLog(
                            product_id=item.product_id,
                            change_type=InventoryChangeType.RETURN.value,
                            quantity=item.quantity,  # Positive for stock restore
                            reference_order_id=self.id,
                            notes=f'Order {self.order_number} cancelled'
                        )
                        db.session.add(inventory_log)
            
            # Reject commission
            if self.has_affiliate():
                self.reject_commission()
            
            # Update status
            self.status = OrderStatus.CANCELLED.value
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            from flask import current_app
            current_app.logger.error(f'Error cancelling order {self.order_number}: {str(e)}')
            return False
    
    def __repr__(self):
        return f'<Order {self.order_number}>'


class AffiliateProfile(db.Model):
    """
    Affiliate profile for micro-influencer marketing program.
    
    BUSINESS MODEL:
    ===============
    - Micro-influencers receive unique affiliate codes
    - Commission paid as STORE CREDIT (not cash withdrawal)
    - Simple wallet system for tracking earnings
    - Influencers may receive free products initially
    - Commission credited when customer order CONFIRMED
    - Self-referral prevention (can't use own code)
    
    COMMISSION WORKFLOW:
    ====================
    1. Customer places order with affiliate code
    2. Order.affiliate_id set to affiliate's user_id
    3. Admin confirms order → commission calculated
    4. Admin approves commission → wallet_balance credited
    5. Affiliate uses wallet balance for store credit
    
    WALLET SYSTEM:
    ==============
    - wallet_balance: Current spendable balance
    - total_earned: Lifetime earnings (never decreases)
    - total_redeemed: Lifetime redemptions
    - Balance formula: wallet_balance = total_earned - total_redeemed
    
    FUTURE ENHANCEMENTS:
    ====================
    - Affiliate tiers (bronze, silver, gold) based on performance
    - Bonus incentives for hitting targets
    - Monthly performance reports
    - Social media integration (auto-track posts)
    - Product seeding workflow (track free product value)
    - Referral link analytics (clicks, conversions)
    - Affiliate community dashboard
    - Withdrawal option (cash payout via bank transfer)
    """
    
    __tablename__ = 'affiliate_profiles'
    __table_args__ = (
        CheckConstraint('commission_percent >= 0', name='ck_affiliate_commission_non_negative'),
        CheckConstraint('commission_percent <= 100', name='ck_affiliate_commission_max_100'),
        CheckConstraint('total_earned >= 0', name='ck_affiliate_total_earned_non_negative'),
        CheckConstraint('wallet_balance >= 0', name='ck_affiliate_wallet_non_negative'),
        CheckConstraint('total_redeemed >= 0', name='ck_affiliate_total_redeemed_non_negative'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Link to User (one-to-one) with cascade delete
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Affiliate Code (unique referral code)
    affiliate_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    
    # Commission Rate (percentage)
    commission_percent = db.Column(db.Float, nullable=False, default=10.0)  # Default 10%
    
    # Product Seeding Tracking
    has_received_free_product = db.Column(db.Boolean, default=False)
    
    # Wallet & Earnings (all in paise)
    total_earned = db.Column(db.Integer, nullable=False, default=0)  # Lifetime earnings
    wallet_balance = db.Column(db.Integer, nullable=False, default=0)  # Current balance
    total_redeemed = db.Column(db.Integer, nullable=False, default=0)  # Lifetime redemptions
    
    # Status
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('affiliate_profile', uselist=False))
    
    # FUTURE: Tier system
    tier = db.Column(db.String(20), nullable=False, default='bronze', index=True)  # bronze, silver, gold, platinum
    # tier_updated_at = db.Column(db.DateTime)
    
    # FUTURE: Performance tracking
    # total_clicks = db.Column(db.Integer, default=0)
    # total_conversions = db.Column(db.Integer, default=0)
    # conversion_rate = db.Column(db.Float, default=0.0)
    
    # FUTURE: Social media integration
    # instagram_handle = db.Column(db.String(100))
    # youtube_channel = db.Column(db.String(100))
    # tiktok_handle = db.Column(db.String(100))
    
    def get_wallet_balance_display(self):
        """Return formatted wallet balance."""
        return f'₹{self.wallet_balance / 100:.2f}'
    
    def get_total_earned_display(self):
        """Return formatted total earned."""
        return f'₹{self.total_earned / 100:.2f}'
    
    def get_total_redeemed_display(self):
        """Return formatted total redeemed."""
        return f'₹{self.total_redeemed / 100:.2f}'
    
    def credit_wallet(self, amount):
        """
        Credit wallet with commission.
        
        Args:
            amount: Amount in paise to credit
            
        Returns:
            bool: True if successful
        """
        if amount <= 0:
            return False
        
        self.wallet_balance += amount
        self.total_earned += amount
        db.session.commit()
        return True
    
    def debit_wallet(self, amount):
        """
        Debit wallet when affiliate uses store credit.
        
        Args:
            amount: Amount in paise to debit
            
        Returns:
            bool: True if successful, False if insufficient balance
        """
        if amount <= 0:
            return False
        
        if self.wallet_balance < amount:
            return False  # Insufficient balance
        
        self.wallet_balance -= amount
        self.total_redeemed += amount
        db.session.commit()
        return True
    
    def adjust_wallet(self, amount, reason=''):
        """
        Admin manual adjustment (positive or negative).
        
        Used for:
        - Corrections
        - Bonuses
        - Penalties
        
        Args:
            amount: Amount in paise (positive to credit, negative to debit)
            reason: Reason for adjustment (for audit log)
            
        Returns:
            bool: True if successful
        """
        new_balance = self.wallet_balance + amount
        
        if new_balance < 0:
            return False  # Can't go negative
        
        self.wallet_balance = new_balance
        
        if amount > 0:
            self.total_earned += amount
        else:
            self.total_redeemed += abs(amount)
        
        db.session.commit()
        return True
    
    def get_referral_count(self):
        """
        Get count of orders referred by this affiliate.
        
        Returns:
            int: Number of orders with this affiliate_id
        """
        return Order.query.filter_by(affiliate_id=self.user_id).count()
    
    def get_confirmed_referral_count(self):
        """
        Get count of CONFIRMED orders referred by this affiliate.
        
        Returns:
            int: Number of confirmed orders
        """
        return Order.query.filter_by(
            affiliate_id=self.user_id,
            status=OrderStatus.CONFIRMED.value
        ).count()
    
    def get_pending_commission(self):
        """
        Calculate total pending commission (orders confirmed but commission not approved).
        
        Returns:
            int: Total pending commission in paise
        """
        orders = Order.query.filter_by(
            affiliate_id=self.user_id,
            commission_status=CommissionStatus.PENDING.value,
            status=OrderStatus.CONFIRMED.value
        ).all()
        
        return sum(order.commission_amount for order in orders)
    
    def get_pending_commission_display(self):
        """Return formatted pending commission."""
        pending = self.get_pending_commission()
        return f'₹{pending / 100:.2f}'
    
    @staticmethod
    def generate_affiliate_code(name):
        """
        Generate unique affiliate code from name.
        
        Format: First 4 letters of name + 4 random chars
        Example: JOHN1A2B
        
        Args:
            name: User's name
            
        Returns:
            str: Unique affiliate code
        """
        import random
        import string
        
        # Get first 4 letters (uppercase, no spaces)
        prefix = ''.join(c for c in name if c.isalpha())[:4].upper()
        if len(prefix) < 4:
            prefix = prefix.ljust(4, 'X')
        
        # Generate unique code
        while True:
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            code = f'{prefix}{suffix}'
            
            # Check if code already exists
            if not AffiliateProfile.query.filter_by(affiliate_code=code).first():
                return code
    
    def __repr__(self):
        return f'<AffiliateProfile {self.affiliate_code} (User {self.user_id})>'


class AdminActionLog(db.Model):
    """
    Admin action audit log for security and compliance.
    
    PURPOSE:
    ========
    - Track all admin actions for accountability
    - Enable security audits and investigations
    - Detect unauthorized or anomalous behavior
    - Support compliance requirements
    - Enable user support investigations
    
    WHAT TO LOG:
    - Product creation, updates, deletion
    - User promotions and demotions
    - Account deactivations
    - Order status changes
    - Permission changes
    - Login attempts (failed and successful)
    
    FUTURE ENHANCEMENTS:
    - Email alerts for critical actions
    - Dashboard visualization
    - Automated alerts on patterns
    - Integration with SIEM systems
    - Data retention policies (e.g., keep 1 year)
    - Export for compliance (audit reports)
    """
    
    __tablename__ = 'admin_action_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Who performed the action
    # NOTE: Nullable to preserve audit trail when admin user is deleted
    # Orphaned logs (admin_id = NULL) represent actions by deleted admins
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # What action
    action_type = db.Column(
        db.String(50),
        nullable=False,
        index=True
    )
    # Examples: CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, PROMOTE_USER, DEMOTE_USER, DEACTIVATE_USER
    
    # What was affected
    target_id = db.Column(db.Integer, nullable=True, index=True)
    # Examples: product_id, user_id (ID of affected resource)
    
    # When
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Where (for security analysis)
    ip_address = db.Column(db.String(45), nullable=True)
    # IPv4: max 15 chars, IPv6: max 39 chars (padded to 45 for safety)
    
    # Why (context)
    description = db.Column(db.Text, nullable=True)
    # Examples: "Deleted product 'Parallettes'" or "Promoted user to admin"
    
    # Relationships
    admin = db.relationship('User', foreign_keys=[admin_id], backref='admin_actions')
    
    def __repr__(self):
        return f'<AdminActionLog {self.action_type} by {self.admin_id}>'
    
    @classmethod
    def create_log(cls, admin_id, action_type, target_id=None, ip_address=None, description=''):
        """
        Helper method to create and commit an action log.
        
        Args:
            admin_id (int): ID of admin performing action
            action_type (str): Type of action (e.g., 'CREATE_PRODUCT')
            target_id (int): ID of affected resource (optional)
            ip_address (str): IP address of request (optional)
            description (str): Human-readable description (optional)
            
        Returns:
            AdminActionLog: Created log entry or None on error
        """
        try:
            log = cls(
                admin_id=admin_id,
                action_type=action_type,
                target_id=target_id,
                ip_address=ip_address,
                description=description,
                timestamp=datetime.utcnow()
            )
            db.session.add(log)
            db.session.commit()
            return log
        except Exception as e:
            db.session.rollback()
            return None
    
    @classmethod
    def get_admin_actions(cls, admin_id, limit=100):
        """
        Get recent actions by a specific admin.
        
        Useful for:
        - User management dashboard
        - Security investigation
        - Admin activity reports
        
        Args:
            admin_id (int): ID of admin
            limit (int): Maximum number of records
            
        Returns:
            list: AdminActionLog records, ordered by newest first
        """
        return cls.query.filter_by(admin_id=admin_id).order_by(
            cls.timestamp.desc()
        ).limit(limit).all()
    
    @classmethod
    def get_recent_actions(cls, action_type=None, limit=100, hours=24):
        """
        Get recent actions across all admins.
        
        Useful for:
        - Security dashboard
        - Real-time monitoring
        - Alert detection
        
        Args:
            action_type (str): Filter by action type (optional)
            limit (int): Maximum number of records
            hours (int): Look back period in hours
            
        Returns:
            list: AdminActionLog records
        """
        from datetime import timedelta
        
        query = cls.query
        
        if action_type:
            query = query.filter_by(action_type=action_type)
        
        # From the last N hours
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(cls.timestamp >= cutoff_time)
        
        return query.order_by(cls.timestamp.desc()).limit(limit).all()


class ProductImage(db.Model):
    """
    Product image model for multi-image support per product.
    
    ARCHITECTURE DECISIONS:
    ======================
    1. Images stored in local filesystem (/static/images/) initially
    2. Database stores relative paths only
    3. Design abstracts storage mechanism for easy cloud migration
    4. Each image has metadata: is_primary, display_order, created_at
    5. Primary image used for product listing thumbnail
    6. All images shown as gallery on product detail page
    
    FILE STRUCTURE:
    ===============
    /static/images/
    ├── original/          # Full resolution (max 1000px width)
    │   └── {uuid}.jpg     # e.g., 550e8400-e29b-41d4-a716-446655440000.jpg
    └── thumbnails/        # Thumbnails for gallery (300px width)
        └── {uuid}.jpg
    
    DATABASE STORAGE:
    =================
    image_path: Stores relative path from project root
    Examples:
    - "static/images/original/550e8400-e29b-41d4-a716-446655440000.jpg"
    - "static/images/thumbnails/550e8400-e29b-41d4-a716-446655440000.jpg"
    
    CLOUD MIGRATION PLAN (S3/R2):
    =============================
    When migrating to S3:
    1. Create new column: cloud_url (nullable, string)
    2. Update image upload utility to save to S3 and store full URL
    3. Update templates to check cloud_url first, then fallback to local
    4. Gradually migrate existing images in background job
    5. No schema breaking changes needed
    6. Keep local paths for rollback capability
    
    SECURITY CONSIDERATIONS:
    ========================
    - Files stored outside webroot initially (FUTURE)
    - Served through Flask route with permission checks (FUTURE)
    - UUID prevents directory traversal attacks
    - File type validation in upload utility
    - Max file size enforced (5MB)
    """
    
    __tablename__ = 'product_images'
    __table_args__ = (
        db.Index('idx_product_id_display_order', 'product_id', 'display_order'),
        db.Index('idx_product_id_is_primary', 'product_id', 'is_primary'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    
    # Image metadata
    image_path = db.Column(db.String(255), nullable=False)  # Relative path from project root or full URL
    storage_path = db.Column(db.String(500), nullable=True)  # Backend-specific storage path (for deletion)
    is_primary = db.Column(db.Boolean, default=False, index=True)  # Primary image for listing
    display_order = db.Column(db.Integer, default=0)  # Sort order for gallery
    
    # Tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    product = db.relationship('Product', backref=db.backref('images', cascade='all, delete-orphan'))
    
    def __repr__(self):
        return f'<ProductImage {self.id} (Product {self.product_id})>'
    
    @classmethod
    def set_primary_image(cls, product_id, image_id):
        """
        Set an image as the primary image for a product.
        
        Only one image per product can be primary.
        This method unsets any previously primary image.
        
        Args:
            product_id (int): Product ID
            image_id (int): Image ID to set as primary
            
        Returns:
            bool: True if successful
        """
        try:
            # Unset any existing primary images for this product
            cls.query.filter_by(product_id=product_id, is_primary=True).update(
                {'is_primary': False},
                synchronize_session=False
            )
            
            # Set new primary image
            image = cls.query.filter_by(id=image_id, product_id=product_id).first()
            if image:
                image.is_primary = True
                db.session.commit()
                return True
            return False
        except Exception:
            db.session.rollback()
            return False
    
    @classmethod
    def get_product_images(cls, product_id):
        """
        Get all images for a product, ordered by display_order.
        
        Args:
            product_id (int): Product ID
            
        Returns:
            list: ProductImage records ordered by display_order
        """
        return cls.query.filter_by(product_id=product_id).order_by(
            cls.display_order.asc()
        ).all()
    
    @classmethod
    def get_primary_image(cls, product_id):
        """
        Get primary image for a product.
        
        Used on product listing page to show thumbnail.
        
        Args:
            product_id (int): Product ID
            
        Returns:
            ProductImage: Primary image object or None
        """
        return cls.query.filter_by(product_id=product_id, is_primary=True).first()


# FUTURE: Additional models for scalability

class Review(db.Model):
    """
    Product reviews and ratings (admin-controlled).
    
    ADMIN CONTROL:
    ==============
    - Reviews are added/edited by admin only (for now)
    - Future: Enable customer-submitted reviews with approval workflow
    
    APPROVAL WORKFLOW:
    ==================
    - is_approved = True: Visible on product page
    - is_approved = False: Hidden from customers (for moderation)
    
    RATING SYSTEM:
    ==============
    - Rating is 1-5 scale
    - Average rating auto-calculated from approved reviews
    - Displayed on product cards and product page
    
    FUTURE ENHANCEMENTS:
    ====================
    - verified_purchase: Only show reviews from actual buyers
    - helpful_count: Users mark review as helpful
    - author_email: For verified purchase checks
    - response_by_admin: Admin can reply to reviews
    - images: Allow review images
    - upvote/downvote system
    """
    
    __tablename__ = 'reviews'
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='ck_reviews_rating_range'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    order_item_id = db.Column(db.Integer, db.ForeignKey('order_items.id'), nullable=True, index=True)
    
    # Reviewer Information
    name = db.Column(db.String(120), nullable=False)  # e.g., "Rahul Sharma"
    role = db.Column(db.String(100), nullable=True)  # e.g., "Fitness Coach", "Powerlifter", "Calisthenics Athlete"
    
    # Review Content
    rating = db.Column(db.Integer, nullable=False)  # 1-5 scale
    title = db.Column(db.String(150), nullable=True)  # Optional short headline
    comment = db.Column(db.Text, nullable=False)  # Main review text
    
    # Approval Status
    is_approved = db.Column(db.Boolean, default=True, index=True)  # Admin controlled
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_verified_purchase(self):
        """A review is verified when it is linked to an actual order item."""
        return self.order_item_id is not None
    
    def __repr__(self):
        return f'<Review {self.id} - Product {self.product_id} - {self.rating}★>'


# class Inventory_Alert(db.Model):
#     """Low stock alerts for admin."""
#     __tablename__ = 'inventory_alerts'
#     id = db.Column(db.Integer, primary_key=True)
#     product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
#     threshold = db.Column(db.Integer, default=5)
#     is_active = db.Column(db.Boolean, default=True)
#     product = db.relationship('Product', backref='stock_alert')

class PolicyPage(db.Model):
    """
    Editable policy pages (Shipping, Returns, Terms, Privacy, etc).
    
    ADMIN CONTROL:
    ==============
    - Admins can edit policy content directly from admin panel
    - No redeployment needed for policy updates
    - Simple rich text editing (TinyMCE integration future)
    - Version history for audit trail (future)
    
    BUSINESS LOGIC:
    ===============
    - slug is unique identifier (shipping, returns, terms, privacy)
    - content is stored as HTML for formatting flexibility
    - updated_at tracks last modification
    - Frontend dynamically renders from database
    
    SIMPLE MVP APPROACH:
    - No versioning (can add later)
    - No approval workflow (direct admin edit)
    - No draft/publish workflow (published immediately)
    - Single language (multi-language future)
    
    FUTURE ENHANCEMENTS:
    - Version history and rollback
    - Draft/Publish workflow
    - Multi-language support
    - Change approval workflow (for large orgs)
    - Email notification on updates
    """
    
    __tablename__ = 'policy_pages'
    
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)  # shipping, returns, terms, privacy
    title = db.Column(db.String(200), nullable=False)  # "Shipping Policy", "Return & Refund Policy"
    content = db.Column(db.Text, nullable=False)  # HTML content
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Track which admin edited
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    editor = db.relationship('User', backref='policy_pages_edited', foreign_keys=[updated_by])
    
    def __repr__(self):
        return f'<PolicyPage {self.slug}>'

class CartItem(db.Model):
    """
    Shopping cart items for logged-in users.
    
    DESIGN:
    =======
    - Only stores cart items for authenticated users
    - Each item is a product + quantity combination
    - Persists across sessions and devices
    - Clears when user checks out or explicitly removes
    
    BUSINESS RULES:
    - One row per product per user (unique constraint)
    - Cannot exceed product stock quantity
    - Auto-removes if product is deactivated
    
    FUTURE:
    - Save abandoned carts for recovery emails
    - Cart history/audit trail
    - Analytics on cart abandonment
    - ML-based product recommendations from cart
    """
    
    __tablename__ = 'cart_items'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'variant_id', name='uq_user_variant_cart'),
        CheckConstraint('quantity > 0', name='ck_cart_quantity_positive'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='cart_items', foreign_keys=[user_id])
    product = db.relationship('Product', backref='in_carts', foreign_keys=[product_id])
    variant = db.relationship('ProductVariant', backref='in_carts', foreign_keys=[variant_id])
    
    def get_subtotal(self):
        """Calculate subtotal for this cart item in paise."""
        if not self.product:
            return 0
        if self.variant:
            return self.variant.get_effective_price() * self.quantity
        # Use discounted price if active, else regular price
        if self.product.is_discount_active and self.product.price_discounted:
            price = self.product.price_discounted
        else:
            price = self.product.price
        return price * self.quantity
    
    def get_subtotal_display(self):
        """Return formatted subtotal string."""
        return f'₹{self.get_subtotal() / 100:.2f}'
    
    def is_stock_available(self):
        """Check if requested quantity is in stock."""
        if self.variant:
            return self.variant.stock_quantity >= self.quantity and self.variant.is_active
        return self.product and self.product.stock_quantity >= self.quantity
    
    def __repr__(self):
        return f'<CartItem user={self.user_id} product={self.product_id} qty={self.quantity}>'


class Payment(db.Model):
    """
    Payment transaction records for orders.
    
    ARCHITECTURE:
    =============
    Separates payment lifecycle from order lifecycle:
    - Order = what customer bought (business transaction)
    - Payment = how they paid (financial transaction)
    
    CURRENT STATE (MVP):
    - gateway = "whatsapp_manual" (admin confirms via WhatsApp)
    - Created when order is confirmed
    - status = "completed" when admin confirms
    
    FUTURE INTEGRATION:
    - Razorpay: gateway = "razorpay", transaction_id from API
    - Stripe: gateway = "stripe", transaction_id from API
    - Multiple attempts: Same order can have multiple payment records
    - Partial payments: Multiple payments sum to order total
    - Refunds: Create negative payment record
    
    SCALABILITY:
    - raw_response: Store full API response for debugging
    - transaction_id: Unique gateway reference for reconciliation
    - Indexed for fast reporting and reconciliation
    """
    
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    gateway = db.Column(db.String(50), nullable=True)  # whatsapp_manual, razorpay, stripe, etc
    transaction_id = db.Column(db.String(100), unique=True, nullable=True, index=True)  # From payment gateway
    amount = db.Column(db.Integer, nullable=False)  # Amount in paise
    currency = db.Column(db.String(3), nullable=False, default='INR')  # ISO 4217
    status = db.Column(db.String(20), nullable=False, default=PaymentStatus.PENDING.value, index=True)
    raw_response = db.Column(db.Text, nullable=True)  # Full API response (JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at = db.Column(db.DateTime, nullable=True)  # When payment completed
    
    # Relationships
    order = db.relationship('Order', backref='payments', foreign_keys=[order_id])
    
    def get_amount_display(self):
        """Return formatted amount string."""
        return f'₹{self.amount / 100:.2f}'
    
    def is_successful(self):
        """Check if payment was successful."""
        return self.status == PaymentStatus.COMPLETED.value
    
    def __repr__(self):
        return f'<Payment order={self.order_id} gateway={self.gateway} status={self.status}>'


class ExchangeRate(db.Model):
    """Historical FX rates used for presentment and reporting conversions."""

    __tablename__ = 'exchange_rates'
    __table_args__ = (
        db.UniqueConstraint('base_currency', 'quote_currency', 'effective_at', name='uq_exchange_rates_pair_effective_at'),
        CheckConstraint('base_currency <> quote_currency', name='ck_exchange_rates_pair_distinct'),
        CheckConstraint('rate_to_quote > 0', name='ck_exchange_rates_rate_positive'),
    )

    id = db.Column(db.Integer, primary_key=True)
    base_currency = db.Column(db.String(3), nullable=False, index=True)  # ISO 4217
    quote_currency = db.Column(db.String(3), nullable=False, index=True)  # ISO 4217
    rate_to_quote = db.Column(db.Numeric(18, 8), nullable=False)
    effective_at = db.Column(db.DateTime, nullable=False, index=True)
    source = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<ExchangeRate {self.base_currency}/{self.quote_currency} rate={self.rate_to_quote} at={self.effective_at}>'


class InventoryLog(db.Model):
    """
    Audit trail for all inventory changes.
    
    BUSINESS REQUIREMENTS:
    ========================
    Every stock increase/decrease MUST create a log entry:
    - SALE: Stock reduced when order confirmed
    - RETURN: Stock restored from customer return
    - MANUAL_ADJUSTMENT: Admin correction (damage, loss, found)
    - RECEIVED: New inventory from supplier
    
    BENEFITS:
    - Complete audit trail (who, what, when, why)
    - Debug stock discrepancies
    - Analytics: product velocity, turnover
    - Reconciliation with accounting
    - Foundation for warehouse management
    
    SCALABILITY:
    - Links to orders for sales/returns
    - Links to admins for manual changes
    - Notes field for human-readable reason
    - Indexed for fast reporting and queries
    
    FUTURE:
    - Stock valuation (quantity × unit cost)
    - Warehouse location tracking
    - Batch/lot tracking
    - Barcode scanning integration
    """
    
    __tablename__ = 'inventory_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    change_type = db.Column(db.String(20), nullable=False, index=True)  # sale, return, manual_adjustment, received
    quantity = db.Column(db.Integer, nullable=False)  # Positive or negative
    reference_order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True, index=True)  # For sales/returns
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Admin who made the change
    notes = db.Column(db.Text, nullable=True)  # Human-readable reason
    
    # Relationships
    product = db.relationship('Product', backref='inventory_logs', foreign_keys=[product_id])
    order = db.relationship('Order', backref='inventory_logs', foreign_keys=[reference_order_id])
    admin = db.relationship('User', backref='inventory_changes_made', foreign_keys=[created_by])
    
    @staticmethod
    def log_sale(product_id, quantity, order_id):
        """
        Create inventory log for order confirmation (stock reduction).
        
        Args:
            product_id: Product ID
            quantity: Quantity sold (will be stored as negative)
            order_id: Reference order ID
        
        Returns:
            InventoryLog object
        """
        log = InventoryLog(
            product_id=product_id,
            change_type=InventoryChangeType.SALE.value,
            quantity=-abs(quantity),  # Always negative for sales
            reference_order_id=order_id
        )
        db.session.add(log)
        return log
    
    @staticmethod
    def log_return(product_id, quantity, order_id):
        """Create inventory log for customer return (stock increase)."""
        log = InventoryLog(
            product_id=product_id,
            change_type=InventoryChangeType.RETURN.value,
            quantity=abs(quantity),  # Always positive for returns
            reference_order_id=order_id
        )
        db.session.add(log)
        return log
    
    @staticmethod
    def log_manual_adjustment(product_id, quantity, admin_id, notes=None):
        """Create inventory log for admin manual adjustment."""
        log = InventoryLog(
            product_id=product_id,
            change_type=InventoryChangeType.MANUAL_ADJUSTMENT.value,
            quantity=quantity,  # Can be positive or negative
            created_by=admin_id,
            notes=notes
        )
        db.session.add(log)
        return log
    
    @staticmethod
    def log_received(product_id, quantity, admin_id, notes=None):
        """Create inventory log for new inventory received."""
        log = InventoryLog(
            product_id=product_id,
            change_type=InventoryChangeType.RECEIVED.value,
            quantity=abs(quantity),  # Always positive for received
            created_by=admin_id,
            notes=notes
        )
        db.session.add(log)
        return log
    
    def __repr__(self):
        return f'<InventoryLog product={self.product_id} type={self.change_type} qty={self.quantity}>'


#     id = db.Column(db.Integer, primary_key=True)
#     recipient = db.Column(db.String(120), nullable=False)
#     subject = db.Column(db.String(200), nullable=False)
#     body = db.Column(db.Text, nullable=False)
#     status = db.Column(db.String(20), default='pending')  # pending, sent, failed
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     sent_at = db.Column(db.DateTime)
