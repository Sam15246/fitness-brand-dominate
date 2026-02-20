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
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/register.html')
