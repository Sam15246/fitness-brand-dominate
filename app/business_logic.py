"""
Business Logic & Helper Functions
==================================

Centralized business rules and validation logic for DOMINATE ecommerce.

SEPARATION OF CONCERNS:
- Models: Database structure and basic CRUD
- Business Logic: Complex workflows, validations, calculations
- Routes: HTTP handling and presentation

This module prevents business logic bloat in routes and models.
"""

from datetime import datetime
from app.models import db, User, Product, Order, AffiliateProfile, OrderStatus, ShippingStatus, CommissionStatus, Payment, InventoryLog, PaymentStatus, InventoryChangeType


class StockManager:
    """
    Manages product stock with business rules.
    
    BUSINESS RULES:
    - Stock never goes negative
    - Stock reduced ONLY when order confirmed (not on placement)
    - Stock restored on cancellation
    - Admin can manually adjust stock
    """
    
    @staticmethod
    def check_availability(product_id, quantity):
        """
        Check if product has sufficient stock.
        
        Args:
            product_id: Product ID
            quantity: Required quantity
            
        Returns:
            tuple: (bool, str) - (is_available, message)
        """
        product = Product.query.get(product_id)
        
        if not product:
            return False, 'Product not found'
        
        if not product.is_active:
            return False, 'Product is not available'
        
        if product.stock_quantity < quantity:
            return False, f'Insufficient stock. Only {product.stock_quantity} units available'
        
        return True, 'Stock available'
    
    @staticmethod
    def reserve_stock(product_id, quantity):
        """
        Reserve stock for confirmed order.
        
        BUSINESS RULE: Stock reduced on order confirmation (not placement)
        
        Args:
            product_id: Product ID
            quantity: Quantity to reserve
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        product = Product.query.get(product_id)
        
        if not product:
            return False, 'Product not found'
        
        if product.decrease_stock(quantity):
            db.session.commit()
            return True, f'Reserved {quantity} units'
        else:
            return False, 'Insufficient stock'
    
    @staticmethod
    def release_stock(product_id, quantity):
        """
        Release reserved stock (for cancellations).
        
        Args:
            product_id: Product ID
            quantity: Quantity to release
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        product = Product.query.get(product_id)
        
        if not product:
            return False, 'Product not found'
        
        if product.increase_stock(quantity):
            db.session.commit()
            return True, f'Released {quantity} units back to stock'
        else:
            return False, 'Failed to release stock'
    
    @staticmethod
    def adjust_stock(product_id, new_quantity, admin_id, reason=''):
        """
        Admin manual stock adjustment.
        
        Used for:
        - New inventory received
        - Damage/loss correction
        - Stock discrepancy correction
        
        Args:
            product_id: Product ID
            new_quantity: New stock quantity
            admin_id: Admin performing adjustment
            reason: Reason for adjustment
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        product = Product.query.get(product_id)
        
        if not product:
            return False, 'Product not found'
        
        if new_quantity < 0:
            return False, 'Stock quantity cannot be negative'
        
        old_quantity = product.stock_quantity
        delta = new_quantity - old_quantity

        if not product.set_stock(new_quantity):
            return False, 'Failed to adjust stock'

        try:
            from app.models import AdminActionLog
            from app.security import get_client_ip

            InventoryLog.log_manual_adjustment(
                product_id=product_id,
                quantity=delta,
                admin_id=admin_id,
                notes=f'Stock adjusted from {old_quantity} to {new_quantity}. Reason: {reason}'
            )

            action_log = AdminActionLog(
                admin_id=admin_id,
                action_type='ADJUST_STOCK',
                target_id=product_id,
                ip_address=get_client_ip(),
                description=f'Adjusted stock from {old_quantity} to {new_quantity}. Reason: {reason}'
            )
            db.session.add(action_log)
            db.session.commit()
            return True, f'Stock adjusted to {new_quantity} units'
        except Exception:
            db.session.rollback()
            return False, 'Failed to adjust stock'


class AffiliateManager:
    """
    Manages affiliate operations and commission calculations.
    
    BUSINESS RULES:
    - Commission calculated when order CONFIRMED
    - No commission for self-referral
    - Commission paid as store credit (wallet)
    - Admin approves commission manually
    """
    
    @staticmethod
    def validate_affiliate_code(code):
        """
        Validate affiliate code existence and active status.
        
        Args:
            code: Affiliate code
            
        Returns:
            tuple: (AffiliateProfile or None, str message)
        """
        if not code:
            return None, 'No affiliate code provided'
        
        affiliate = AffiliateProfile.query.filter_by(affiliate_code=code.upper()).first()
        
        if not affiliate:
            return None, 'Invalid affiliate code'
        
        if not affiliate.is_active:
            return None, 'Affiliate code is inactive'
        
        return affiliate, 'Valid affiliate code'
    
    @staticmethod
    def calculate_commission(order_id):
        """
        Calculate commission for an order.
        
        Args:
            order_id: Order ID
            
        Returns:
            tuple: (int, str) - (commission_amount in paise, message)
        """
        order = Order.query.get(order_id)
        
        if not order:
            return 0, 'Order not found'
        
        if not order.has_affiliate():
            return 0, 'No affiliate for this order'
        
        if order.is_self_referral():
            return 0, 'Self-referral not eligible for commission'
        
        if order.status == OrderStatus.CANCELLED.value:
            return 0, 'Cancelled orders not eligible'
        
        affiliate = AffiliateProfile.query.filter_by(user_id=order.affiliate_id).first()
        
        if not affiliate or not affiliate.is_active:
            return 0, 'Affiliate not found or inactive'
        
        commission = order.calculate_commission(affiliate)
        return commission, f'Commission: {commission / 100:.2f}'
    
    @staticmethod
    def approve_commission(order_id, admin_id):
        """
        Approve commission and credit affiliate wallet.
        
        BUSINESS FLOW:
        1. Validate order is confirmed
        2. Calculate commission
        3. Credit affiliate wallet
        4. Update order commission status
        5. Log admin action
        
        Args:
            order_id: Order ID
            admin_id: Admin approving commission
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        order = Order.query.get(order_id)
        
        if not order:
            return False, 'Order not found'
        
        if order.status != OrderStatus.CONFIRMED.value:
            return False, 'Order must be confirmed before approving commission'
        
        if order.commission_status == CommissionStatus.APPROVED.value:
            return False, 'Commission already approved'
        
        if not order.has_affiliate():
            return False, 'No affiliate for this order'
        
        if order.is_self_referral():
            order.reject_commission()
            return False, 'Self-referral not eligible for commission'
        
        # Approve commission
        if order.approve_commission():
            # Log admin action
            from app.models import AdminActionLog
            from app.security import get_client_ip
            
            affiliate = AffiliateProfile.query.filter_by(user_id=order.affiliate_id).first()
            
            AdminActionLog.create_log(
                admin_id=admin_id,
                action_type='APPROVE_COMMISSION',
                target_id=order_id,
                ip_address=get_client_ip(),
                description=f'Approved commission ₹{order.commission_amount / 100:.2f} for affiliate {affiliate.affiliate_code}'
            )
            
            return True, f'Commission approved: ₹{order.commission_amount / 100:.2f}'
        else:
            return False, 'Failed to approve commission'
    
    @staticmethod
    def create_affiliate_profile(user_id, commission_percent=10.0):
        """
        Create affiliate profile for a user.
        
        Args:
            user_id: User ID
            commission_percent: Commission rate (default 10%)
            
        Returns:
            tuple: (AffiliateProfile or None, str message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return None, 'User not found'
        
        # Check if already has profile
        existing = AffiliateProfile.query.filter_by(user_id=user_id).first()
        if existing:
            return None, 'User already has affiliate profile'
        
        # Generate unique code
        affiliate_code = AffiliateProfile.generate_affiliate_code(user.name)
        
        # Create profile
        profile = AffiliateProfile(
            user_id=user_id,
            affiliate_code=affiliate_code,
            commission_percent=commission_percent,
            is_active=True
        )
        
        db.session.add(profile)
        db.session.commit()
        
        return profile, f'Affiliate profile created with code: {affiliate_code}'


class OrderManager:
    """
    Manages order workflow and lifecycle.
    
    BUSINESS FLOW:
    1. Place order (PENDING status, stock NOT reduced)
    2. Admin confirms order (stock reduced, commission calculated)
    3. Admin packs and ships order
    4. Admin marks as delivered
    5. Admin approves commission
    """
    
    @staticmethod
    def place_order(product_id, quantity, customer_data, affiliate_code=None, user_id=None):
        """
        Place a new order (guest or logged-in user).
        
        BUSINESS RULES:
        - Stock NOT reduced on placement (only on confirmation)
        - Validate stock availability
        - Generate unique order number
        - Set affiliate if code provided
        
        Args:
            product_id: Product ID
            quantity: Order quantity
            customer_data: Dict with name, phone, email, address, city, state, pincode
            affiliate_code: Optional affiliate referral code
            user_id: Optional user ID (for registered users)
            
        Returns:
            tuple: (Order or None, str message)
        """
        # Validate required customer data fields (CRITICAL for database integrity)
        required_fields = ['name', 'phone', 'email', 'address', 'city', 'state', 'pincode']
        for field in required_fields:
            if field not in customer_data or not customer_data[field] or (isinstance(customer_data[field], str) and customer_data[field].strip() == ''):
                return None, f'Missing required field: {field}'
        
        # Validate product availability
        available, msg = StockManager.check_availability(product_id, quantity)
        if not available:
            return None, msg
        
        # Get product
        product = Product.query.get(product_id)
        
        # Calculate total price
        total_price = product.price * quantity
        
        # Validate affiliate code
        affiliate_id = None
        if affiliate_code:
            affiliate, msg = AffiliateManager.validate_affiliate_code(affiliate_code)
            if affiliate:
                affiliate_id = affiliate.user_id
                
                # Prevent self-referral
                if user_id and affiliate_id == user_id:
                    affiliate_id = None
        
        # Generate order number
        import random
        import string
        order_number = f'ORD{datetime.utcnow().strftime("%Y%m%d")}{random.randint(1000, 9999)}'
        
        # Check if order number exists (rare collision)
        while Order.query.filter_by(order_number=order_number).first():
            order_number = f'ORD{datetime.utcnow().strftime("%Y%m%d")}{random.randint(1000, 9999)}'
        
        # Create order with all required fields
        order = Order(
            order_number=order_number,
            user_id=user_id,
            affiliate_id=affiliate_id,
            product_id=product_id,
            quantity=quantity,
            total_price=total_price,
            guest_name=customer_data['name'],
            guest_phone=customer_data['phone'],
            guest_email=customer_data['email'],
            address=customer_data['address'],
            city=customer_data['city'],
            state=customer_data['state'],  # REQUIRED - no longer optional
            pincode=customer_data['pincode'],  # REQUIRED - no longer optional
            status=OrderStatus.PENDING.value,
            shipping_status=ShippingStatus.PENDING.value,
            commission_amount=0,  # Calculated on confirmation
            commission_status=CommissionStatus.PENDING.value
        )
        
        db.session.add(order)
        db.session.commit()
        
        return order, f'Order placed successfully: {order_number}'
    
    @staticmethod
    def confirm_order(order_id, admin_id):
        """
        Confirm order and reduce stock.
        
        Args:
            order_id: Order ID
            admin_id: Admin confirming order
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        order = Order.query.get(order_id)
        
        if not order:
            return False, 'Order not found'
        
        if order.status == OrderStatus.CONFIRMED.value:
            return False, 'Order already confirmed'
        
        if order.status == OrderStatus.CANCELLED.value:
            return False, 'Cannot confirm cancelled order'
        
        # Confirm order (reduces stock and calculates commission)
        if order.confirm_order():
            # Log admin action - calculate total items
            from app.models import AdminActionLog
            from app.security import get_client_ip
            
            total_qty = sum(item.quantity for item in order.items)
            AdminActionLog.create_log(
                admin_id=admin_id,
                action_type='CONFIRM_ORDER',
                target_id=order_id,
                ip_address=get_client_ip(),
                description=f'Confirmed order {order.order_number} - Stock reduced for {len(order.items)} item(s) (total qty: {total_qty})'
            )
            
            return True, f'Order confirmed: {order.order_number}'
        else:
            return False, 'Failed to confirm order (insufficient stock)'
    
    @staticmethod
    def cancel_order(order_id, admin_id, reason=''):
        """
        Cancel order and restore stock if necessary.
        
        Args:
            order_id: Order ID
            admin_id: Admin cancelling order
            reason: Reason for cancellation
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        order = Order.query.get(order_id)
        
        if not order:
            return False, 'Order not found'
        
        if order.status == OrderStatus.CANCELLED.value:
            return False, 'Order already cancelled'
        
        # Cancel order (restores stock if confirmed)
        if order.cancel_order():
            # Log admin action
            from app.models import AdminActionLog
            from app.security import get_client_ip
            
            AdminActionLog.create_log(
                admin_id=admin_id,
                action_type='CANCEL_ORDER',
                target_id=order_id,
                ip_address=get_client_ip(),
                description=f'Cancelled order {order.order_number}. Reason: {reason}'
            )
            
            return True, f'Order cancelled: {order.order_number}'
        else:
            return False, 'Failed to cancel order'
    
    @staticmethod
    def update_shipping(order_id, shipping_status, tracking_number=None, courier_name=None, admin_id=None):
        """
        Update shipping status and tracking information.
        
        Args:
            order_id: Order ID
            shipping_status: New shipping status
            tracking_number: Optional tracking number
            courier_name: Optional courier name
            admin_id: Admin updating shipping
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        order = Order.query.get(order_id)
        
        if not order:
            return False, 'Order not found'
        
        if order.status == OrderStatus.CANCELLED.value:
            return False, 'Cannot update shipping for cancelled order'
        
        # Update shipping
        if order.update_shipping_status(shipping_status, tracking_number, courier_name):
            # Log admin action
            if admin_id:
                from app.models import AdminActionLog
                from app.security import get_client_ip
                
                desc = f'Updated shipping status to {shipping_status} for order {order.order_number}'
                if tracking_number:
                    desc += f' - Tracking: {tracking_number}'
                if courier_name:
                    desc += f' - Courier: {courier_name}'
                
                AdminActionLog.create_log(
                    admin_id=admin_id,
                    action_type='UPDATE_SHIPPING',
                    target_id=order_id,
                    ip_address=get_client_ip(),
                    description=desc
                )
            
            return True, f'Shipping updated: {shipping_status}'
        else:
            return False, 'Failed to update shipping'


# FUTURE: Add more business logic managers
# class InventoryManager:
#     """Warehouse and multi-location inventory management."""
#     pass
#
# class NotificationManager:
#     """Email, SMS, WhatsApp notifications."""
#     pass
#
# class ReportingManager:
#     """Sales reports, analytics, insights."""
#     pass
