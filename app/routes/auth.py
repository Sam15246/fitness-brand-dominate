from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app
from flask_login import login_user, logout_user, current_user
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from app.models import db, User, UserRole

auth_bp = Blueprint('auth', __name__)


def _safe_next_url(next_page):
    """Allow only local redirects."""
    if next_page and isinstance(next_page, str) and next_page.startswith('/'):
        return next_page
    return None


def _post_login_redirect(user, next_page=None):
    """Resolve role-aware post-login redirect URL."""
    safe_next = _safe_next_url(next_page)
    if safe_next:
        return safe_next
    if user.is_admin():
        return url_for('admin.dashboard')
    return url_for('main.index')


def _render_login_template():
    """Render login page with social-auth config context."""
    return render_template(
        'admin/login.html',
        google_client_id=current_app.config.get('GOOGLE_CLIENT_ID', ''),
        next_url=request.args.get('next', ''),
    )


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
            return _render_login_template()
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if user is None:
            flash('Invalid email or password.', 'danger')
            return _render_login_template()

        if not user.can_login_with_password():
            flash('This account uses social sign-in. Continue with Google/Apple login.', 'warning')
            return _render_login_template()

        if not user.check_password(password):
            flash('Invalid email or password.', 'danger')
            return _render_login_template()
        
        if not user.is_active:
            flash('Your account has been deactivated.', 'warning')
            return _render_login_template()
        
        # Login user
        login_user(user, remember=remember)
        
        # Redirect to next page or dashboard
        next_page = request.args.get('next')
        if user.is_admin():
            flash(f'Welcome back, {user.name}!', 'success')
            return redirect(_post_login_redirect(user, next_page=next_page))

        flash(f'Welcome, {user.name}!', 'success')
        return redirect(_post_login_redirect(user, next_page=next_page))
    
    return _render_login_template()


@auth_bp.route('/google', methods=['POST'])
def google_sign_in():
    """Authenticate with Google ID token and log in/link/create local user."""
    payload = request.get_json(silent=True) or {}
    credential = (payload.get('credential') or '').strip()
    next_page = payload.get('next') or request.args.get('next', '')

    if not credential:
        return jsonify({'success': False, 'message': 'Missing Google credential.'}), 400

    google_client_id = (current_app.config.get('GOOGLE_CLIENT_ID') or '').strip()
    if not google_client_id:
        return jsonify({'success': False, 'message': 'Google sign-in is not configured yet.'}), 503

    try:
        token_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id,
        )
    except Exception:
        return jsonify({'success': False, 'message': 'Google token verification failed.'}), 401

    issuer = token_info.get('iss')
    if issuer not in ('accounts.google.com', 'https://accounts.google.com'):
        return jsonify({'success': False, 'message': 'Invalid Google token issuer.'}), 401

    if not token_info.get('email_verified', False):
        return jsonify({'success': False, 'message': 'Google email is not verified.'}), 401

    email = (token_info.get('email') or '').strip().lower()
    provider_id = (token_info.get('sub') or '').strip()
    full_name = (token_info.get('name') or '').strip()
    avatar_url = (token_info.get('picture') or '').strip() or None

    if not email or not provider_id:
        return jsonify({'success': False, 'message': 'Google profile data is incomplete.'}), 400

    user = User.query.filter_by(auth_provider='google', auth_provider_id=provider_id).first()

    if not user:
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            if existing_user.auth_provider not in ('local', 'google'):
                return jsonify({
                    'success': False,
                    'message': 'This email is linked to another sign-in method. Please use that provider.',
                }), 409

            if existing_user.auth_provider == 'google' and existing_user.auth_provider_id and existing_user.auth_provider_id != provider_id:
                return jsonify({
                    'success': False,
                    'message': 'This Google account is already linked differently. Please contact support.',
                }), 409

            existing_user.auth_provider = 'google'
            existing_user.auth_provider_id = provider_id
            existing_user.full_name = full_name or existing_user.full_name
            existing_user.avatar_url = avatar_url or existing_user.avatar_url
            if full_name and not existing_user.name:
                existing_user.name = full_name
            user = existing_user
        else:
            display_name = full_name or email.split('@')[0]
            user = User(
                name=display_name,
                full_name=full_name or display_name,
                email=email,
                password_hash=None,
                role=UserRole.USER.value,
                is_active=True,
                auth_provider='google',
                auth_provider_id=provider_id,
                avatar_url=avatar_url,
                created_at=datetime.utcnow(),
            )
            db.session.add(user)

    if not user.is_active:
        return jsonify({'success': False, 'message': 'Your account has been deactivated.'}), 403

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception('Google sign-in DB commit failed')
        return jsonify({'success': False, 'message': 'Could not complete sign-in. Please try again.'}), 500

    login_user(user, remember=True)

    return jsonify({
        'success': True,
        'redirect_url': _post_login_redirect(user, next_page=next_page),
    })


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
        user = User(
            name=name,
            email=email,
            role=UserRole.USER.value,
            is_active=True,
            auth_provider='local',
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
