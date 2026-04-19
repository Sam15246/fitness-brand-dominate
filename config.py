import os
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
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
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

    # Social Links
    INSTAGRAM_URL = os.getenv('INSTAGRAM_URL', 'https://www.instagram.com/dominate.cali')
    
    # ============= IMAGE STORAGE CONFIGURATION =============
    # Pluggable storage system for product images
    # 
    # STORAGE_BACKEND options:
    # - 'local': Save to /app/static/uploads/ (default, immediate launch)
    # - 'r2': Save to Cloudflare R2 (scale, future migration)
    #
    # NO CODE CHANGES when switching backends.
    # Just change environment variable and restart.
    #
    # LOCAL STORAGE (default):
    # - Files saved at: /app/static/uploads/products/{original,thumbnails}/
    # - URLs: /static/uploads/products/original/uuid.webp
    # - Best for: Immediate launch, single server, development
    # - Zero configuration needed
    #
    # R2 STORAGE (future):
    # - Files saved in: Cloudflare R2 bucket
    # - URLs: https://cdn.example.com/products/original/uuid.webp
    # - Best for: Scale, high-traffic, backup, multi-region
    # - Setup required: R2 bucket + API credentials in env vars
    #
    # SWITCHING TO R2 (when ready):
    # 1. Create Cloudflare R2 bucket (e.g., 'fitness-brand-images')
    # 2. Generate R2 API token
    # 3. Set these environment variables:
    #    - STORAGE_BACKEND=r2
    #    - R2_ACCESS_KEY=your_key
    #    - R2_SECRET_KEY=your_secret
    #    - R2_BUCKET_NAME=fitness-brand-images
    #    - R2_ENDPOINT_URL=https://xxx.r2.cloudflarestorage.com
    #    - R2_PUBLIC_URL=https://images.example.com
    # 4. Restart app
    # 5. New uploads automatically go to R2
    # 6. Old local images still accessible (batch migrate later)
    #
    STORAGE_BACKEND = os.getenv('STORAGE_BACKEND', 'local').lower()
    
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
    ✅ SSL enabled for database connections
    
    REQUIREMENTS FOR PRODUCTION:
    1. Set environment variables:
       - FLASK_ENV=production
       - SECRET_KEY (generate: python -c "import secrets; print(secrets.token_hex(32))")
       - DATABASE_URL (PostgreSQL recommended, will auto-add ?sslmode=require)
    
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
    
    # PostgreSQL for production with SSL enabled for external databases
    _db_url = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/fitness_brand')
    # Auto-add sslmode=require even when the URL already has query parameters
    if _db_url:
        parsed = urlparse(_db_url)
        query = parse_qs(parsed.query)
        if 'sslmode' not in query:
            query['sslmode'] = ['require']
            SQLALCHEMY_DATABASE_URI = urlunparse(
                parsed._replace(query=urlencode(query, doseq=True))
            )
        else:
            SQLALCHEMY_DATABASE_URI = _db_url
    
    # WARNING: SECRET_KEY MUST be set in environment
    # Validation moved to __init__ to allow import without requiring env vars
    # This lets development scripts run without setting production variables
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    # Enforce strict security
    SESSION_COOKIE_SECURE = True  # HTTPS only
    REMEMBER_COOKIE_SECURE = True  # HTTPS only
    
    # Never echo SQL in production
    SQLALCHEMY_ECHO = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv('SQLALCHEMY_POOL_SIZE', '15')),
        "max_overflow": int(os.getenv('SQLALCHEMY_MAX_OVERFLOW', '20')),
        "pool_timeout": int(os.getenv('SQLALCHEMY_POOL_TIMEOUT', '30')),
        "pool_recycle": int(os.getenv('SQLALCHEMY_POOL_RECYCLE', '3600')),
    }
    
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
