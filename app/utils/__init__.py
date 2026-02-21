"""Utility modules for DOMINATE ecommerce."""

# Import email utilities
from .email import (
    send_order_confirmation_email,
    send_marketing_email,
    send_admin_notification_email
)

__all__ = [
    'send_order_confirmation_email',
    'send_marketing_email', 
    'send_admin_notification_email',
]
