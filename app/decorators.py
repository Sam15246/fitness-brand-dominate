from functools import wraps
from flask import redirect, url_for, flash, abort, request
from flask_login import current_user


def admin_required(f):
    """
    Decorator to require admin or superadmin role.
    
    USAGE:
    @admin_required
    def admin_action():
        # Only admin and superadmin can access
        pass
    
    SECURITY CHECKS:
    - Validates user is authenticated
    - Validates user has admin OR superadmin role
    - Redirects unauthenticated users to login
    - Returns 403 Forbidden for unauthorized access
    
    FUTURE ENHANCEMENTS:
    - Log failed access attempts
    - Rate limit failed attempts
    - Alert on suspicious patterns
    - Check 2FA status (if enabled)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
        
        if not current_user.is_admin():
            flash('You do not have permission to access this page.', 'danger')
            abort(403)
        
        return f(*args, **kwargs)
    
    return decorated_function


def superadmin_required(f):
    """
    Decorator to require superadmin role only.
    
    USAGE:
    @superadmin_required
    def superadmin_only():
        # Only superadmin can access
        pass
    
    SECURITY CHECKS:
    - Validates user is authenticated
    - Validates user has superadmin role
    - Admins are rejected (even though they have higher permissions)
    - Redirects unauthenticated users to login
    - Returns 403 Forbidden for non-superadmin users
    
    WHY STRICT:
    - Critical actions (user management, role changes)
    - Need highest level of authorization
    - Prevents admin-level abuse
    - Enforces least privilege principle
    
    FUTURE ENHANCEMENTS:
    - Require 2FA verification for superadmin actions
    - Log all superadmin actions to separate audit table
    - Alert on all superadmin activity
    - Implement IP whitelisting
    - Require confirmation for destructive actions
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
        
        if not current_user.is_superadmin():
            flash('You do not have permission to access this page.', 'danger')
            abort(403)
        
        return f(*args, **kwargs)
    
    return decorated_function


def login_required_custom(f):
    """
    Custom login required decorator with better UX.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in first.', 'info')
            return redirect(url_for('auth.login'))
        
        return f(*args, **kwargs)
    
    return decorated_function
