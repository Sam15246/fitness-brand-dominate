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


class User(UserMixin, db.Model):
    """User model with role-based access.
    
    Supports both admin and regular users.
    Email marketing opt-in controls product/promo communications.
    """
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))  # User's preferred phone for orders
    role = db.Column(
        db.String(20),
        nullable=False,
        default=UserRole.USER.value,
        index=True
    )
    is_active = db.Column(db.Boolean, default=True, index=True)
    email_marketing_opt_in = db.Column(db.Boolean, default=False)  # User consent for marketing emails
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    products_created = db.relationship('Product', backref='created_by_user', foreign_keys='Product.created_by')
    orders = db.relationship('Order', backref='user', foreign_keys='Order.user_id')
    
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
        return check_password_hash(self.password_hash, password)
    
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
    
    def __repr__(self):
        return f'<User {self.email} ({self.role})>'


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
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Admin tracking
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    orders = db.relationship('Order', backref='product', cascade='all, delete-orphan')
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
        db.session.commit()
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
            db.session.commit()
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
        db.session.commit()
        return True
    
    def is_in_stock(self):
        """Check if product has available stock."""
        return self.stock_quantity > 0 and self.is_active
    
    def __repr__(self):
        return f'<Product {self.name}>'


class Order(db.Model):
    """
    Order model for customer purchases.
    
    BUSINESS MODEL:
    ===============
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
        CheckConstraint('quantity > 0', name='ck_orders_quantity_positive'),
        CheckConstraint('total_price > 0', name='ck_orders_total_price_positive'),
        CheckConstraint('commission_amount >= 0', name='ck_orders_commission_non_negative'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    
    # User reference (nullable for guest orders)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Affiliate tracking (nullable - only filled if referred)
    affiliate_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Order details snapshot (always captured, regardless of guest/logged-in)
    guest_name = db.Column(db.String(120), nullable=False)
    guest_phone = db.Column(db.String(20), nullable=False)
    guest_email = db.Column(db.String(120), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)  # Indian state
    pincode = db.Column(db.String(6), nullable=False)  # 6-digit pincode
    address = db.Column(db.Text, nullable=False)
    
    # Product and quantity
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    total_price = db.Column(db.Integer, nullable=False)  # Stored in paise (100 paise = ₹1)
    
    # Affiliate Commission
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
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)  # When admin confirms order
    shipped_at = db.Column(db.DateTime, nullable=True)  # When handed to courier
    delivered_at = db.Column(db.DateTime, nullable=True)  # When successfully delivered
    
    # Relationships
    affiliate = db.relationship('User', foreign_keys=[affiliate_id], backref='referral_orders')
    
    # FUTURE: Payment integration
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
        """Return total price in rupees format."""
        return self.total_price / 100
    
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
        - Commission based on total_price (not including shipping)
        
        Args:
            affiliate_profile: AffiliateProfile instance
            
        Returns:
            int: Commission amount in paise
        """
        if self.is_self_referral():
            return 0
        
        if self.status == OrderStatus.CANCELLED.value:
            return 0
        
        # Calculate commission as percentage of total_price
        commission = int(self.total_price * (affiliate_profile.commission_percent / 100.0))
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
        Confirm order and reduce stock.
        
        BUSINESS LOGIC:
        - Mark order as CONFIRMED
        - Reduce product stock by quantity
        - Calculate and set commission_amount
        - Set confirmed_at timestamp
        
        Returns:
            bool: True if successful, False if insufficient stock
        """
        if self.status == OrderStatus.CONFIRMED.value:
            return False  # Already confirmed
        
        # Reduce stock
        product = Product.query.get(self.product_id)
        if not product or not product.decrease_stock(self.quantity):
            return False  # Insufficient stock
        
        # Calculate commission if affiliate exists
        if self.has_affiliate() and not self.is_self_referral():
            from app.models import AffiliateProfile
            affiliate_profile = AffiliateProfile.query.filter_by(user_id=self.affiliate_id).first()
            if affiliate_profile and affiliate_profile.is_active:
                self.commission_amount = self.calculate_commission(affiliate_profile)
        
        # Update order status
        self.status = OrderStatus.CONFIRMED.value
        self.confirmed_at = datetime.utcnow()
        
        db.session.commit()
        return True
    
    def cancel_order(self):
        """
        Cancel order and restore stock.
        
        BUSINESS LOGIC:
        - Mark order as CANCELLED
        - Restore product stock if order was confirmed
        - Reject commission if applicable
        
        Returns:
            bool: True if successful
        """
        if self.status == OrderStatus.CANCELLED.value:
            return False  # Already cancelled
        
        # Restore stock if order was confirmed
        if self.status == OrderStatus.CONFIRMED.value:
            product = Product.query.get(self.product_id)
            if product:
                product.increase_stock(self.quantity)
        
        # Reject commission
        if self.has_affiliate():
            self.reject_commission()
        
        # Update status
        self.status = OrderStatus.CANCELLED.value
        
        db.session.commit()
        return True
    
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
    
    # Link to User (one-to-one)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    
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
    # tier = db.Column(db.String(20), default='bronze')  # bronze, silver, gold, platinum
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
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
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


# class Email_Notification(db.Model):
#     """Queued email notifications."""
#     __tablename__ = 'email_notifications'
#     id = db.Column(db.Integer, primary_key=True)
#     recipient = db.Column(db.String(120), nullable=False)
#     subject = db.Column(db.String(200), nullable=False)
#     body = db.Column(db.Text, nullable=False)
#     status = db.Column(db.String(20), default='pending')  # pending, sent, failed
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     sent_at = db.Column(db.DateTime)
