"""
Create superadmin account if it doesn't exist.
Designed to be called during deployment.
Run with: python -m app.scripts.create_superadmin
"""
import os
import sys
from pathlib import Path

# Ensure app module can be imported
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app import create_app, db
from app.models import User, UserRole


def create_superadmin():
    """Create superadmin account from environment variables."""
    app = create_app()
    
    with app.app_context():
        email = os.environ.get('ADMIN_EMAIL')
        password = os.environ.get('ADMIN_PASSWORD')
        name = os.environ.get('ADMIN_NAME', 'Admin')
        
        if not email or not password:
            print('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping superadmin creation')
            return
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f'ℹ️  Superadmin user exists')
            return
        
        # Create superadmin user
        superadmin = User(
            name=name,
            email=email,
            role=UserRole.SUPERADMIN.value,
            is_active=True
        )
        superadmin.set_password(password)
        
        db.session.add(superadmin)
        db.session.commit()
        
        print(f'✅ Superadmin created successfully')


if __name__ == '__main__':
    create_superadmin()
