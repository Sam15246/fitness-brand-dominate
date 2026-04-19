from flask import Flask, request
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_mail import Mail
from config import get_config
from app.models import db, User

# Initialize Flask-Mail (configured in create_app)
mail = Mail()


def create_app(config=None):
    """Application factory."""
    app = Flask(__name__, instance_relative_config=True)
    
    # Load configuration
    if config is None:
        config = get_config()
    
    # Instantiate config to trigger validation (for ProductionConfig)
    if isinstance(config, type):
        config = config()
    
    app.config.from_object(config)
    
    # ============= EMAIL CONFIGURATION =============
    # Load email config from environment variables
    try:
        from app.config import get_email_config, validate_email_config
        
        # Validate email configuration
        is_valid, error_msg = validate_email_config()
        if not is_valid:
            app.logger.warning(f"Email configuration incomplete: {error_msg}")
            app.logger.warning("Password reset emails will fail until configured.")
        
        # Load email config
        email_config = get_email_config()
        app.config['MAIL_SERVER'] = email_config['mail_server']
        app.config['MAIL_PORT'] = email_config['mail_port']
        app.config['MAIL_USE_TLS'] = email_config['mail_use_tls']
        app.config['MAIL_USE_SSL'] = email_config['mail_use_ssl']
        app.config['MAIL_USERNAME'] = email_config['mail_username']
        app.config['MAIL_PASSWORD'] = email_config['mail_password']
        app.config['MAIL_DEFAULT_SENDER'] = email_config['mail_default_sender']
        
        app.logger.info(f"Email backend configured: {email_config['mail_server']}")
        
    except Exception as e:
        app.logger.error(f"Email configuration failed: {str(e)}")
        app.logger.warning("App will start but email features will be disabled.")
    
    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)
    mail.init_app(app)  # Initialize Flask-Mail
    
    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    


    # Register blueprints
    from app.routes.main import main_bp
    from app.routes.auth import auth_bp
    from app.routes.admin import admin_bp
    from app.routes.admin_coupons import admin_coupons_bp
    from app.routes.api_v1 import api_v1_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(admin_coupons_bp)
    app.register_blueprint(api_v1_bp, url_prefix='/api/v1')

    @app.context_processor
    def inject_brand_links():
        from app.utils.image_urls import resolve_image_url, resolve_image_thumbnail_url
        whatsapp_number = app.config.get('WHATSAPP_NUMBER')
        whatsapp_url = f"https://wa.me/{whatsapp_number}" if whatsapp_number else None

        return {
            'instagram_url': app.config.get('INSTAGRAM_URL'),
            'whatsapp_url': whatsapp_url,
            'image_url': resolve_image_url,
            'image_thumb_url': resolve_image_thumbnail_url,
        }
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Context processor - make cart count available in all templates
    @app.context_processor
    def inject_cart_count():
        from flask import session
        cart = session.get('cart', {})
        cart_count = sum(cart.values()) if cart else 0
        return dict(cart_count=cart_count)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        from flask import render_template
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(403)
    def forbidden(e):
        from flask import render_template
        return render_template('errors/403.html'), 403
    
    @app.errorhandler(500)
    def internal_error(e):
        from flask import render_template
        db.session.rollback()
        return render_template('errors/500.html'), 500

    @app.after_request
    def set_security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

        # Enable HSTS only when request is served over HTTPS.
        is_https = request.is_secure or request.headers.get('X-Forwarded-Proto', '').lower() == 'https'
        if is_https:
            response.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

        return response
    
    return app
