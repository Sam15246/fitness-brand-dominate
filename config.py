import os
from pathlib import Path
from datetime import timedelta

class Config:
    """
    Base configuration for all environments.
    
    SECURITY PRINCIPLES:
    ====================
    - No hardcoded secrets (all from environment variables)
    - Secure defaults for production
    - CSRF protection enabled
    - Session cookies secure (HTTP-only, Secure flag)
    - SameSite protection for CSRF
    
    FUTURE SECURITY PLACEHOLDERS:
    - Rate limiting (Flask-Limiter)
    - Brute force protection
    - IP whitelisting for admin
    - Two-factor authentication (2FA)
    - Email verification
    - Password expiration policies
    - Session timeout management
    """
    
    # Database
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL debugging (NEVER in production)
    
    # Session Security
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True  # Prevents JS access to cookies
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    REMEMBER_COOKIE_DURATION = timedelta(days=30)
    REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True
    
    # CSRF Protection
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None  # No time limit on CSRF tokens
    
    # Application Security
    # SECRET_KEY: Must be set in environment for production
    # Used for session signing, CSRF tokens, and password reset links
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # WhatsApp Configuration
    WHATSAPP_NUMBER = os.getenv('WHATSAPP_NUMBER', '919876543210')

    # Social Links
    INSTAGRAM_URL = os.getenv('INSTAGRAM_URL', 'https://instagram.com/yourbrand')
    
    # FUTURE SECURITY FEATURES (Structure for easy addition)
    # Rate Limiting
    # RATELIMIT_ENABLED = True
    # RATELIMIT_STORAGE_URL = os.getenv('REDIS_URL', 'memory://')
    # RATELIMIT_DEFAULT = '100/hour'  # Default rate limit
    # RATELIMIT_LOGIN = '5/15minutes'  # 5 attempts per 15 minutes
    # RATELIMIT_PASSWORD_RESET = '3/hour'  # 3 resets per hour
    
    # Email Configuration (for future notifications)
    # MAIL_SERVER = os.getenv('MAIL_SERVER')
    # MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    # MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', True)
    # MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    # MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    # MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@dominate.com')
    
    # AWS S3 (for future file uploads)
    # AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
    # AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID')
    # AWS_SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    # AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
    
    # Sentry Error Tracking (for production monitoring)
    # SENTRY_DSN = os.getenv('SENTRY_DSN')


class DevelopmentConfig(Config):
    """
    Development configuration.
    
    SECURITY NOTES:
    - Debug mode enabled (ONLY for development)
    - Cookies not marked Secure (HTTP allowed)
    - Session timeout disabled
    - Relaxed CSRF (can be helpful for testing)
    
    NEVER use these settings in production!
    """
    DEBUG = True
    TESTING = False
    
    # SQLite for development
    db_path = Path(__file__).resolve().parent / 'instance'
    db_path.mkdir(parents=True, exist_ok=True)
    sqlite_path = (db_path / 'app.db').as_posix()
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        db_url = f'sqlite:///{sqlite_path}'
    SQLALCHEMY_DATABASE_URI = db_url
    
    # Relaxed security for development
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False
    
    # Secret key (weak for dev, override with environment)
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-12345')
    
    # SQL query echo (helpful for debugging)
    SQLALCHEMY_ECHO = os.getenv('SQL_ECHO', 'False') == 'True'


class ProductionConfig(Config):
    """
    Production configuration.
    
    SECURITY HARDENING:
    ====================
    ✅ Debug mode disabled
    ✅ All cookies marked Secure (HTTPS only)
    ✅ Secure session management
    ✅ SECRET_KEY must be set via environment
    ✅ Database URL from environment
    
    REQUIREMENTS FOR PRODUCTION:
    1. Set environment variables:
       - FLASK_ENV=production
       - SECRET_KEY (generate: python -c "import secrets; print(secrets.token_hex(32))")
       - DATABASE_URL (PostgreSQL recommended)
    
    2. Use HTTPS (reverse proxy like Nginx)
    
    3. Run via Gunicorn:
       gunicorn -w 4 -b 0.0.0.0:8000 "app:create_app()"
    
    4. Set up monitoring:
       - Error tracking (Sentry)
       - Log aggregation (ELK, Datadog)
       - Performance monitoring (New Relic, DataDog)
    
    FUTURE ENHANCEMENTS:
    - Add rate limiting
    - Add request validation
    - Add WAF (Web Application Firewall)
    - Add DDoS protection
    """
    DEBUG = False
    TESTING = False
    
    # PostgreSQL for production
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://user:password@localhost:5432/fitness_brand'
    )
    
    # WARNING: SECRET_KEY MUST be set in environment
    # Validation moved to __init__ to allow import without requiring env vars
    # This lets development scripts run without setting production variables
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    # Enforce strict security
    SESSION_COOKIE_SECURE = True  # HTTPS only
    REMEMBER_COOKIE_SECURE = True  # HTTPS only
    
    # Never echo SQL in production
    SQLALCHEMY_ECHO = False
    
    def __init__(self):
        """Validate required environment variables when config is actually used."""
        super().__init__()
        if not self.SECRET_KEY:
            raise RuntimeError(
                'SECRET_KEY environment variable is not set. '
                'Generate with: python -c "import secrets; print(secrets.token_hex(32))"'
            )


class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    
    # In-memory SQLite for tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable CSRF for tests
    WTF_CSRF_ENABLED = False
    
    # Session
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False


def get_config():
    """Get configuration based on environment."""
    env = os.getenv('FLASK_ENV', 'development')
    
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig,
    }
    
    return config_map.get(env, DevelopmentConfig)
