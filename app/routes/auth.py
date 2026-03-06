from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, current_user
from app.models import db, User, UserRole

auth_bp = Blueprint('auth', __name__)


@auth_bp.before_request
def check_logged_in():
    """Redirect logged-in users away from auth pages."""
    if current_user.is_authenticated:
        if request.endpoint in ['auth.login', 'auth.register']:
            return redirect(url_for('main.index'))


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    Single login page for all users (guests, regular users, admins).
    
    GOVERNANCE PRINCIPLE - UNIFIED LOGIN:
    =====================================
    There is ONE login page for all user types.
    After login, role-based redirect:
    - Admin/Superadmin → /admin/dashboard (admin panel)
    - Regular User → / (homepage)
    - Guest users skip login entirely (frictionless checkout)
    
    This unified approach ensures:
    - No special admin-only login page (simplicity)
    - Clear role-based routing logic (no confusion)
    - Consistent authentication flow (easier to audit)
    - Single password/session management (fewer security vectors)
    
    POST flow:
    1. Validate email + password
    2. Check if user is active
    3. Login user
    4. Redirect based on role
    
    FUTURE SCALABILITY:
    - Social login (Google, GitHub, WhatsApp Auth)
    - Two-factor authentication (2FA)
    - One-time password (OTP) via SMS
    - Magic links via email
    - Remember-me functionality
    - Session timeout management
    - Failed login attempt tracking
    """
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        remember = request.form.get('remember', False)
        
        # Validation
        if not email or not password:
            flash('Please provide both email and password.', 'danger')
            return render_template('admin/login.html')
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if user is None or not user.check_password(password):
            flash('Invalid email or password.', 'danger')
            return render_template('admin/login.html')
        
        if not user.is_active:
            flash('Your account has been deactivated.', 'warning')
            return render_template('admin/login.html')
        
        # Login user
        login_user(user, remember=remember)
        
        # Redirect to next page or dashboard
        next_page = request.args.get('next')
        if next_page and next_page.startswith('/'):
            return redirect(next_page)
        
        if user.is_admin():
            flash(f'Welcome back, {user.name}!', 'success')
            return redirect(url_for('admin.dashboard'))
        
        flash(f'Welcome, {user.name}!', 'success')
        return redirect(url_for('main.index'))
    
    return render_template('admin/login.html')


@auth_bp.route('/logout')
def logout():
    """User logout."""
    if current_user.is_authenticated:
        logout_user()
        flash('You have been logged out.', 'info')
    
    return redirect(url_for('main.index'))


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """User registration."""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        errors = []
        
        if not name or len(name) < 3:
            errors.append('Name must be at least 3 characters long')
        
        if not email or '@' not in email:
            errors.append('Please provide a valid email')
        
        if not password or len(password) < 6:
            errors.append('Password must be at least 6 characters long')
        
        if password != confirm_password:
            errors.append('Passwords do not match')
        
        # Check if email already exists
        if User.query.filter_by(email=email).first():
            errors.append('Email already registered')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('auth/register.html')
        
        # Create user
        from datetime import datetime
        user = User(
            name=name,
            email=email,
            role=UserRole.USER.value,
            is_active=True,
            created_at=datetime.utcnow()
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Auto-login after successful registration
        login_user(user)
        
        flash(f'Welcome to DOMINATE, {user.name}! Your account has been created successfully.', 'success')
        return redirect(url_for('main.index'))
    
    return render_template('auth/register.html')


@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """
    Forgot password request page.
    
    SECURITY DESIGN:
    ================
    - No user enumeration: Same message for valid/invalid emails
    - Rate limiting recommended (FUTURE: Flask-Limiter)
    - Token sent via email (secure channel)
    - Token expires in 24 hours
    - Single-use token
    
    WORKFLOW:
    1. User enters email
    2. System looks up user (silently fails if not found)
    3. Generate reset token
    4. Send email with reset link
    5. Show generic success message (don't reveal if email exists)
    
    GET: Show forgot password form
    POST: Process email and send reset link
    """
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        
        if not email or '@' not in email:
            flash('Please provide a valid email address.', 'danger')
            return render_template('auth/forgot_password.html')
        
        # Look up user (SECURITY: Don't reveal if user exists)
        user = User.query.filter_by(email=email).first()
        
        if user and user.is_active:
            # Generate reset token
            try:
                token = user.generate_reset_token()
                from flask import current_app

                # Development fallback: expose link in logs/flash for local testing.
                if current_app.debug:
                    reset_url = url_for('auth.reset_password_form', token=token, _external=True)
                    current_app.logger.info(f"DEV password reset link for {email}: {reset_url}")
                    flash(f"DEV MODE: Password reset link: {reset_url}", 'warning')
                
                # Send password reset email
                from app.utils.email import send_password_reset_email
                result = send_password_reset_email(user.email, token)
                
                if result['success']:
                    # Log success
                    current_app.logger.info(f"Password reset requested for {email}")
                else:
                    # Log failure (but don't show to user)
                    current_app.logger.error(f"Failed to send reset email to {email}: {result['message']}")
                    
            except Exception as e:
                # Log error but don't reveal to user (security)
                from flask import current_app
                current_app.logger.error(f"Password reset error for {email}: {str(e)}")
        
        # SECURITY: Always show same message (prevent email enumeration)
        flash(
            'If an account exists with that email, you will receive a password reset link shortly.',
            'info'
        )
        return redirect(url_for('auth.login'))
    
    return render_template('auth/forgot_password.html')


@auth_bp.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password_form(token):
    """
    Password reset form (with token verification).
    
    SECURITY CHECKS:
    ================
    - Token signature validation (tamper detection)
    - Token expiration check (24 hours max)
    - Database lookup (token must be active)
    - User must be active
    - Token is single-use (cleared after reset)
    
    WORKFLOW:
    1. User clicks link from email (contains token)
    2. Verify token is valid
    3. Show password reset form (GET)
    4. User submits new password (POST)
    5. Update password
    6. Clear reset token
    7. Redirect to login
    
    GET: Verify token and show reset form
    POST: Process new password and reset
    """
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    
    # Verify token
    user = User.verify_reset_token(token)
    
    if not user:
        flash('Invalid or expired password reset link. Please request a new one.', 'danger')
        return redirect(url_for('auth.forgot_password'))
    
    if request.method == 'POST':
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        errors = []
        
        if not password or len(password) < 6:
            errors.append('Password must be at least 6 characters long')
        
        if password != confirm_password:
            errors.append('Passwords do not match')
        
        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('auth/reset_password.html', token=token)
        
        # Update password
        try:
            user.set_password(password)
            user.clear_reset_token()
            db.session.commit()
            
            flash('Password reset successful! You can now log in with your new password.', 'success')
            return redirect(url_for('auth.login'))
            
        except ValueError as e:
            flash(str(e), 'danger')
            return render_template('auth/reset_password.html', token=token)
        except Exception as e:
            db.session.rollback()
            flash('An error occurred. Please try again.', 'danger')
            from flask import current_app
            current_app.logger.error(f"Password reset error for user {user.email}: {str(e)}")
            return render_template('auth/reset_password.html', token=token)
    
    return render_template('auth/reset_password.html', token=token, user=user)
