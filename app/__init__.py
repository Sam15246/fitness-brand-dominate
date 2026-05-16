from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_mail import Mail
from config import get_config
from app.models import db

# Initialize Flask-Mail (configured in create_app)
mail = Mail()
limiter = Limiter(key_func=get_remote_address)


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
        
        # Validate email configuration (skip strict checks in tests).
        if not app.config.get('TESTING', False):
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
        
        if not app.config.get('TESTING', False):
            app.logger.info(f"Email backend configured: {email_config['mail_server']}")
        
    except Exception as e:
        app.logger.error(f"Email configuration failed: {str(e)}")
        app.logger.warning("App will start but email features will be disabled.")
    
    # Import models and initialize extensions (deferred to avoid import-time DB use)
    from app.models import db, User

    db.init_app(app)
    Migrate(app, db)
    mail.init_app(app)  # Initialize Flask-Mail

    # Initialize CORS
    CORS(app,
         origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
         supports_credentials=True,
         allow_headers=['Content-Type', 'Accept'],
         expose_headers=['Content-Type'])

    # Initialize rate limiter
    limiter.init_app(app)

    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = None

    @login_manager.unauthorized_handler
    def unauthorized_handler():
        return jsonify({
            'success': False,
            'error': 'Authentication required',
            'code': 'unauthorized',
        }), 401
    
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))
    


    # Register blueprints
    from app.routes.api_v1 import api_v1_bp

    app.register_blueprint(api_v1_bp, url_prefix='/api/v1')
    
    # Create tables automatically only for local SQLite development.
    # Production should use Flask-Migrate instead of implicit schema creation.
    database_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if database_uri.startswith('sqlite'):
        with app.app_context():
            # In testing, ensure schema matches models by recreating tables
            if app.config.get('TESTING'):
                db.drop_all()
            db.create_all()
    
    def _frontend_base_url() -> str:
        return (app.config.get('FRONTEND_BASE_URL') or 'http://localhost:3000').rstrip('/')

    def _api_error_strategy() -> str:
        return (app.config.get('API_ERROR_STRATEGY') or 'hybrid').strip().lower()

    def _is_api_request() -> bool:
        return request.path.startswith('/api/')

    def _frontend_redirect(path: str | None = None):
        target_path = path or request.path
        query = request.query_string.decode('utf-8')
        target = f"{_frontend_base_url()}{target_path}"
        if query and path is None:
            target = f"{target}?{query}"
        return redirect(target, code=302)

    @app.before_request
    def redirect_non_api_requests():
        """Route all non-API browser traffic to Next.js after API-only cutover."""
        if _is_api_request() or request.path.startswith('/static/'):
            return None

        if request.method in {'GET', 'HEAD'}:
            return _frontend_redirect()

        return jsonify({
            'success': False,
            'error': 'Not found',
            'code': 'not_found',
        }), 404

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        if _api_error_strategy() in {'frontend_redirect', 'hybrid'} and not _is_api_request():
            return _frontend_redirect('/404')
        return jsonify({'success': False, 'error': 'Not found', 'code': 'not_found'}), 404
    
    @app.errorhandler(403)
    def forbidden(e):
        if _api_error_strategy() in {'frontend_redirect', 'hybrid'} and not _is_api_request():
            return _frontend_redirect('/403')
        return jsonify({'success': False, 'error': 'Forbidden', 'code': 'forbidden'}), 403
    
    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        if _api_error_strategy() in {'frontend_redirect', 'hybrid'} and not _is_api_request():
            return _frontend_redirect('/500')
        return jsonify({'success': False, 'error': 'Internal server error', 'code': 'server_error'}), 500

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


def __getattr__(name: str):
    if name == 'db':
        return db
    if name == 'mail':
        return mail
    if name == 'limiter':
        return limiter
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __getattr__(name: str):
    """Lazily expose commonly-imported package attributes without importing
    database models at module import time.

    This allows `from app import db` to work in scripts/tests without
    triggering `app.models` during package import (which may run DB
    queries at import time).
    """
    if name == 'db':
        from app.models import db as _db

        return _db
    if name == 'mail':
        return mail
    if name == 'limiter':
        return limiter
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
