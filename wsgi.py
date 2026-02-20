"""
WSGI entry point for production deployment with Gunicorn.

Gunicorn command:
  gunicorn --workers 4 --worker-class sync --timeout 60 wsgi:app

This file is used by:
- Render.com deployment
- Traditional VPS hosting
- Docker containers

Environment Variables Required:
- FLASK_ENV: Set to 'production'
- SECRET_KEY: Strong random key (use: python -c 'import secrets; print(secrets.token_hex(32))')
- DATABASE_URL: PostgreSQL connection string
- DEBUG: False (for production)
"""

import os
import logging
from app import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set production environment
os.environ.setdefault('FLASK_ENV', 'production')

# Create Flask application
app = create_app()

# Log startup
if __name__  != '__main__':
    app.logger.info('DOMINATE Ecommerce Application Started')
    app.logger.info(f'Environment: {os.environ.get("FLASK_ENV", "development")}')
    app.logger.info(f'Debug Mode: {app.debug}')

if __name__ == '__main__':
    # This won't be called with Gunicorn, but allows direct execution for testing
    app.run(host='0.0.0.0', port=5000, debug=False)
