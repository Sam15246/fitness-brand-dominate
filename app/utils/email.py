"""
Email utilities for order confirmations and marketing communications.

FUTURE SCALABILITY PATHS:
1. SMTP Setup: Configure Flask-Mail with app.config['MAIL_SERVER'], MAIL_PORT, MAIL_USE_TLS
2. SendGrid Integration: Use sendgrid.SendGridAPIClient with dynamic templates
3. Mailgun Integration: Use mailgun-python SDK
4. Email Queuing: Use Celery + Redis for async email sending
5. Template System: Move to Jinja2 templates stored in database
6. Unsubscribe Management: Add email_lists table, track unsubscribes via MGN webhooks
"""

from flask import current_app
from datetime import datetime


def send_order_confirmation_email(order):
    """
    Send order confirmation email to customer.
    
    MULTI-ITEM ORDERS:
    - Supports multiple products per order
    - Lists all order items with quantities and prices
    - Shows total amount across all items
    
    CURRENT: Placeholder implementation
    SCALABILITY: Replace with SMTP/SendGrid/Mailgun after initial launch
    
    Args:
        order: Order object with multiple OrderItems
        
    Returns:
        dict: {'success': bool, 'message': str}
    """
    
    # FUTURE: Replace with actual email sending
    try:
        customer_email = order.guest_email
        order_number = order.order_number
        
        # Build email content with all items
        items_text = ""
        for idx, item in enumerate(order.items, 1):
            product_name = item.product.name if item.product else "Product"
            unit_price = item.get_unit_price_display()
            quantity = item.quantity
            subtotal = item.get_subtotal_display()
            items_text += f"\n  {idx}. {product_name}\n     Qty: {quantity} × {unit_price} = {subtotal}"
        
        total_price = order.get_total_price_display()
        
        # Build email content
        email_body = f"""
        Order Confirmation - {order_number}
        
        Thank you for your order!
        
        ORDER ITEMS:{items_text}
        
        Total: {total_price}
        
        Order Details:
        Name: {order.guest_name}
        Phone: {order.guest_phone}
        City: {order.city}
        Address: {order.address}
        
        Expected Delivery: 5-7 business days
        
        Question? Reply to this email or WhatsApp us.
        """
        
        # LOG FOR DEBUGGING/TESTING (remove in production after email setup)
        current_app.logger.info(f"[EMAIL] Order confirmation for {customer_email} - {order_number}")
        
        # TODO: Implement actual email sending here
        # Option 1: SMTP with Flask-Mail
        # msg = Message(f'Order Confirmed: {order_number}', recipients=[customer_email])
        # msg.body = email_body
        # mail.send(msg)
        
        # Option 2: SendGrid API
        # sg = sendgrid.SendGridAPIClient(current_app.config['SENDGRID_API_KEY'])
        # from sendgrid.helpers.mail import Mail, Email, To, Content
        # mail = Mail(...)
        # response = sg.send(mail)
        
        # Option 3: Mailgun API
        # requests.post(
        #     f"https://api.mailgun.net/v3/{current_app.config['MAILGUN_DOMAIN']}/messages",
        #     auth=("api", current_app.config['MAILGUN_API_KEY']),
        #     data={"from": "noreply@brand.com", "to": customer_email, "subject": ..., "text": ...}
        # )
        
        return {'success': True, 'message': 'Email queued (implementation pending)'}
    
    except Exception as e:
        current_app.logger.error(f"Email error: {str(e)}")
        return {'success': False, 'message': f'Email error: {str(e)}'}


def send_marketing_email(user, subject, body):
    """
    Send marketing/promotional email to opted-in users.
    
    CURRENT: Placeholder implementation
    FUTURE: Batch send via background task queue (Celery/RQ)
    
    Respects user's email_marketing_opt_in preference.
    
    Args:
        user: User object
        subject: Email subject
        body: Email body
        
    Returns:
        dict: {'success': bool, 'message': str}
    """
    
    if not user.email_marketing_opt_in:
        current_app.logger.info(f"Marketing email skipped: {user.email} (opt-out)")
        return {'success': False, 'message': 'User opted out of marketing emails'}
    
    try:
        # TODO: Implement actual email sending
        current_app.logger.info(f"[MARKETING EMAIL] To: {user.email} - {subject}")
        
        return {'success': True, 'message': 'Marketing email queued'}
    
    except Exception as e:
        current_app.logger.error(f"Marketing email error: {str(e)}")
        return {'success': False, 'message': f'Error: {str(e)}'}


def send_admin_notification_email(subject, order_details):
    """
    Send admin notifications for new orders, low stock, etc.
    
    CURRENT: Placeholder
    FUTURE: Configure admin email addresses in env vars
    
    Args:
        subject: Email subject
        order_details: Details to include in email
        
    Returns:
        dict: {'success': bool, 'message': str}
    """
    
    try:
        admin_email = current_app.config.get('ADMIN_EMAIL', 'admin@brand.com')
        
        # TODO: Implement admin notifications
        current_app.logger.info(f"[ADMIN NOTIFICATION] {subject}")
        
        return {'success': True, 'message': 'Admin notification queued'}
    
    except Exception as e:
        current_app.logger.error(f"Admin notification error: {str(e)}")
        return {'success': False, 'message': f'Error: {str(e)}'}


# FUTURE: Batch email campaigns for opted-in users
# def send_campaign_emails(campaign_id, recipient_list):
#     """
#     Send bulk marketing campaign emails.
#     IMPLEMENT: Use Celery tasks to send emails in batches
#     with rate limiting and retry logic.
#     """
#     pass


# FUTURE: Email verification for new registrations
# def send_verification_email(user):
#     """Send email verification link on user signup."""
#     pass


# FUTURE: Password reset emails
# def send_password_reset_email(user, token):
#     """Send password reset link."""
#     pass


# FUTURE: Abandoned cart recovery
# def send_cart_recovery_email(cart):
#     """Send reminder for abandoned carts."""
#     pass
