"""
Email configuration abstraction layer.

DESIGN PRINCIPLES:
==================
1. All config from environment variables (zero hardcoding)
2. Backend abstraction: Mailgun ↔ SendGrid ↔ Gmail with ONE env var change
3. Zero code changes needed when switching email providers
4. Fail-safe defaults for development

MIGRATION PATH:
===============
Development → Production requires ZERO code changes:
1. Update .env file only (change MAILGUN_DOMAIN to your domain)
2. Restart app
3. Done!

SUPPORTED BACKENDS:
===================
- brevo: ⭐ RECOMMENDED (free tier: 9,000/month, excellent)
- resend: Modern alternative (free tier: 3,000/month)
- amazon_ses: Pay-as-you-go ($0.10 per 1,000 emails)
- mailgun: OK but limited free tier (3,000/month)
- sendgrid: Alternative (free tier: 3,000/month)
- gmail: Development only (not for production)

Example usage:
--------------
from app.config.email_config import get_email_config

config = get_email_config()
# Returns dict with SMTP settings ready for Flask-Mail
"""

import os
from typing import Dict, Optional


def get_email_config() -> Dict[str, any]:
    """
    Get email configuration from environment variables.
    
    Returns:
        dict: Configuration dict compatible with Flask-Mail
        
    Environment Variables Required:
        - MAIL_BACKEND: 'brevo', 'resend', 'mailgun', 'sendgrid', 'amazon_ses', or 'gmail'
        - BREVO_API_KEY: Your Brevo SMTP key (recommended)
        - RESEND_API_KEY: Your Resend API key (alternative)
        - MAILGUN_DOMAIN + MAILGUN_API_KEY: For Mailgun
        - MAIL_FROM_ADDRESS: Sender email address
        - MAIL_FROM_NAME: Sender display name
        
    Returns dict with keys:
        - mail_server: SMTP server hostname
        - mail_port: SMTP port (587 for TLS)
        - mail_use_tls: True for secure connection
        - mail_username: SMTP username
        - mail_password: SMTP password
        - mail_default_sender: Tuple (name, email)
    """
    backend = os.getenv('MAIL_BACKEND', 'brevo').lower()
    
    # Common settings
    config = {
        'mail_use_tls': True,
        'mail_use_ssl': False,
        'mail_default_sender': (
            os.getenv('MAIL_FROM_NAME', 'Fitness Brand'),
            os.getenv('MAIL_FROM_ADDRESS', 'noreply@example.com')
        ),
    }
    
    # Backend-specific SMTP settings
    if backend == 'brevo':
        # Brevo (formerly Sendinblue) - RECOMMENDED
        # Free tier: 300 emails/day (9,000/month)
        # Get API key from: https://app.brevo.com/settings/keys/smtp
        config.update({
            'mail_server': 'smtp-relay.brevo.com',
            'mail_port': 587,
            'mail_username': os.getenv('BREVO_SMTP_USERNAME'),  # Login from Brevo dashboard (e.g., a42a0c001@smtp-brevo.com)
            'mail_password': os.getenv('BREVO_API_KEY'),  # SMTP API key from Brevo
        })
    
    elif backend == 'resend':
        # Resend - Modern alternative
        # Free tier: 3,000 emails/month
        # Get API key from: https://resend.com/api-keys
        config.update({
            'mail_server': 'smtp.resend.com',
            'mail_port': 587,
            'mail_username': 'resend',  # Always 'resend'
            'mail_password': os.getenv('RESEND_API_KEY'),
        })
    
    elif backend == 'amazon_ses':
        # Amazon SES - Pay as you go
        # Cost: $0.10 per 1,000 emails
        # Get credentials from: AWS IAM Console
        aws_region = os.getenv('AWS_SES_REGION', 'us-east-1')
        config.update({
            'mail_server': f'email-smtp.{aws_region}.amazonaws.com',
            'mail_port': 587,
            'mail_username': os.getenv('AWS_SES_SMTP_USERNAME'),
            'mail_password': os.getenv('AWS_SES_SMTP_PASSWORD'),
        })
    
    elif backend == 'mailgun':
        mailgun_domain = os.getenv('MAILGUN_DOMAIN')
        if not mailgun_domain:
            raise ValueError(
                'MAILGUN_DOMAIN not set in environment. '
                'Get your sandbox domain from https://app.mailgun.com/'
            )
        
        config.update({
            'mail_server': 'smtp.mailgun.org',
            'mail_port': 587,
            'mail_username': f'postmaster@{mailgun_domain}',
            'mail_password': os.getenv('MAILGUN_API_KEY'),
        })
    
    elif backend == 'sendgrid':
        config.update({
            'mail_server': 'smtp.sendgrid.net',
            'mail_port': 587,
            'mail_username': 'apikey',  # SendGrid always uses 'apikey' as username
            'mail_password': os.getenv('SENDGRID_API_KEY'),
        })
    
    elif backend == 'gmail':
        # WARNING: Gmail SMTP should ONLY be used for development/testing
        # Not suitable for production (daily limits, spam risk)
        config.update({
            'mail_server': 'smtp.gmail.com',
            'mail_port': 587,
            'mail_username': os.getenv('GMAIL_ADDRESS'),
            'mail_password': os.getenv('GMAIL_APP_PASSWORD'),
        })
    
    else:
        raise ValueError(
            f'Unknown MAIL_BACKEND: {backend}. '
            f'Valid options: brevo, resend, mailgun, sendgrid, amazon_ses, gmail'
        )
    
    return config


def validate_email_config() -> tuple[bool, Optional[str]]:
    """
    Validate email configuration is complete.
    
    Returns:
        tuple: (is_valid, error_message)
        - is_valid: True if config is complete
        - error_message: None if valid, error string if invalid
    """
    backend = os.getenv('MAIL_BACKEND', 'brevo').lower()
    
    if backend == 'brevo':
        if not os.getenv('BREVO_API_KEY'):
            return False, 'BREVO_API_KEY not set'
    
    elif backend == 'resend':
        if not os.getenv('RESEND_API_KEY'):
            return False, 'RESEND_API_KEY not set'
    
    elif backend == 'amazon_ses':
        if not os.getenv('AWS_SES_SMTP_USERNAME'):
            return False, 'AWS_SES_SMTP_USERNAME not set'
        if not os.getenv('AWS_SES_SMTP_PASSWORD'):
            return False, 'AWS_SES_SMTP_PASSWORD not set'
    
    elif backend == 'mailgun':
        if not os.getenv('MAILGUN_DOMAIN'):
            return False, 'MAILGUN_DOMAIN not set'
        if not os.getenv('MAILGUN_API_KEY'):
            return False, 'MAILGUN_API_KEY not set'
    
    elif backend == 'sendgrid':
        if not os.getenv('SENDGRID_API_KEY'):
            return False, 'SENDGRID_API_KEY not set'
    
    elif backend == 'gmail':
        if not os.getenv('GMAIL_ADDRESS'):
            return False, 'GMAIL_ADDRESS not set'
        if not os.getenv('GMAIL_APP_PASSWORD'):
            return False, 'GMAIL_APP_PASSWORD not set'
    
    else:
        return False, f'Unknown MAIL_BACKEND: {backend}'
    
    if not os.getenv('MAIL_FROM_ADDRESS'):
        return False, 'MAIL_FROM_ADDRESS not set'
    
    return True, None
