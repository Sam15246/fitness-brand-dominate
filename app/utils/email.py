"""
Email utilities for order confirmations, password resets, and marketing communications.

ARCHITECTURE:
=============
- Uses Flask-Mail extension for SMTP sending
- Backend-agnostic: Mailgun, SendGrid, or Gmail via config
- Template-based: HTML emails with fallback to plain text
- Logging: All email attempts logged for debugging

FUTURE SCALABILITY PATHS:
==========================
1. Email Queuing: Use Celery + Redis for async email sending (high volume)
2. Template System: Move to Jinja2 templates stored in database (easier editing)
3. Unsubscribe Management: Add email_lists table, track unsubscribes
4. Analytics: Track open rates, click rates (via tracking pixels/links)
5. Retry Logic: Exponential backoff for failed sends
6. Bounce Handling: Process bounce webhooks from Mailgun/SendGrid
"""

from flask import current_app, url_for
from flask_mail import Message
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def send_password_reset_email(user_email: str, reset_token: str) -> dict:
    """
    Send password reset email with secure token link.
    
    SECURITY DESIGN:
    ================
    - Token generated with itsdangerous (cryptographically signed)
    - Token expires in 24 hours (configurable)
    - Link is single-use (token deleted after reset)
    - No user enumeration (same response for valid/invalid emails)
    
    Args:
        user_email: Recipient email address
        reset_token: Secure token for password reset
        
    Returns:
        dict: {'success': bool, 'message': str}
        
    Example:
        >>> send_password_reset_email('user@example.com', 'abc123token')
        {'success': True, 'message': 'Password reset email sent'}
    """
    try:
        # Import here to avoid circular imports
        from app import mail
        
        # Generate reset URL (full URL with protocol and domain)
        reset_url = url_for('auth.reset_password_form', token=reset_token, _external=True)
        
        # Generate logo URL (full URL for email)
        logo_url = url_for('static', filename='images/logo.png', _external=True)
        
        # Email subject
        subject = "Reset Your Password - DOMINATE"
        
        # HTML email template (DOMINATE brand theme: brown/cream/beige)
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #2C2C2C;
                    background-color: #F9F6F0;
                    margin: 0;
                    padding: 0;
                }}
                .email-wrapper {{
                    background-color: #F9F6F0;
                    padding: 40px 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: #FFFFFF;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(139, 111, 71, 0.15);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #8B6F47 0%, #A68968 100%);
                    padding: 30px 20px;
                    text-align: center;
                }}
                .logo {{
                    max-width: 160px;
                    height: auto;
                    margin-bottom: 15px;
                }}
                .header h1 {{
                    color: #FFFFFF;
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .content p {{
                    color: #2C2C2C;
                    margin-bottom: 16px;
                    font-size: 15px;
                }}
                .button-container {{
                    text-align: center;
                    margin: 30px 0;
                }}
                .button {{
                    display: inline-block;
                    background: #8B6F47;
                    color: #FFFFFF;
                    padding: 16px 36px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    box-shadow: 0 4px 10px rgba(139, 111, 71, 0.25);
                    transition: all 0.3s ease;
                }}
                .button:hover {{
                    background: #6F5839;
                    box-shadow: 0 6px 14px rgba(139, 111, 71, 0.35);
                }}
                .link-box {{
                    background: #F9F6F0;
                    border: 2px solid #E8DCC8;
                    padding: 16px;
                    border-radius: 8px;
                    word-break: break-all;
                    margin: 20px 0;
                    font-size: 13px;
                    color: #6F5839;
                }}
                .warning {{
                    background: #FFF4E6;
                    border-left: 4px solid #D4A574;
                    padding: 18px;
                    margin: 25px 0;
                    border-radius: 0 8px 8px 0;
                }}
                .warning strong {{
                    color: #8B6F47;
                    font-size: 15px;
                }}
                .divider {{
                    height: 2px;
                    background: linear-gradient(to right, transparent, #D4BEA0, transparent);
                    margin: 30px 0;
                }}
                .footer {{
                    background: #E8DCC8;
                    padding: 25px 30px;
                    text-align: center;
                }}
                .footer p {{
                    margin: 8px 0;
                    font-size: 13px;
                    color: #6F5839;
                }}
                .footer-brand {{
                    font-weight: 600;
                    color: #8B6F47;
                    letter-spacing: 1px;
                }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="container">
                    <div class="header">
                        <img src="{logo_url}" alt="DOMINATE Logo" class="logo">
                        <h1>Password Reset Request</h1>
                    </div>
                    
                    <div class="content">
                        <p><strong>Hello,</strong></p>
                        
                        <p>You requested to reset your password for your <strong>DOMINATE</strong> account.</p>
                        
                        <p>Click the button below to reset your password:</p>
                        
                        <div class="button-container">
                            <a href="{reset_url}" class="button">Reset Password</a>
                        </div>
                        
                        <p style="font-size: 14px; color: #6F5839;">Or copy and paste this link into your browser:</p>
                        
                        <div class="link-box">
                            {reset_url}
                        </div>
                        
                        <div class="warning">
                            <strong>⏱ This link expires in 24 hours.</strong><br>
                            <span style="font-size: 14px; color: #6F5839;">For security, this password reset link can only be used once.</span>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <p style="font-size: 14px; color: #6F5839;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                    </div>
                    
                    <div class="footer">
                        <p>Need help? Contact us via WhatsApp or Instagram.</p>
                        <p class="footer-brand">DOMINATE</p>
                        <p>&copy; 2026 DOMINATE. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback (for email clients that don't support HTML)
        text_body = f"""
Password Reset Request

You requested to reset your password for your DOMINATE account.

Click the link below to reset your password:
{reset_url}

This link expires in 24 hours.

If you didn't request a password reset, you can safely ignore this email.

---
Need help? Contact us via WhatsApp or Instagram.
© 2026 DOMINATE. All rights reserved.
        """
        
        # Create message
        msg = Message(
            subject=subject,
            recipients=[user_email],
            body=text_body,
            html=html_body
        )
        
        # Send email
        mail.send(msg)
        
        logger.info(f"Password reset email sent to {user_email}")
        return {'success': True, 'message': 'Password reset email sent'}
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user_email}: {str(e)}")
        return {'success': False, 'message': f'Email error: {str(e)}'}


def send_welcome_email(user_email: str, user_name: str) -> dict:
    """
    Send welcome email to new user (FUTURE).
    
    Args:
        user_email: Recipient email address
        user_name: User's display name
        
    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        from app import mail
        
        subject = f"Welcome to Fitness Brand, {user_name}!"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome, {user_name}!</h2>
            <p>Your account has been created successfully.</p>
            <p>Start exploring our handcrafted calisthenics equipment:</p>
            <a href="{url_for('main.index', _external=True)}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Browse Products
            </a>
        </body>
        </html>
        """
        
        msg = Message(subject=subject, recipients=[user_email], html=html_body)
        mail.send(msg)
        
        logger.info(f"Welcome email sent to {user_email}")
        return {'success': True, 'message': 'Welcome email sent'}
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user_email}: {str(e)}")
        return {'success': False, 'message': f'Email error: {str(e)}'}


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
