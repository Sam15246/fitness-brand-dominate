from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate
from config import get_config
from app.models import db, User


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
    
    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)
    
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
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')

    @app.context_processor
    def inject_brand_links():
        return {
            'instagram_url': app.config.get('INSTAGRAM_URL')
        }
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
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
    
    return app
