"""
Create superadmin account if it doesn't exist.
Designed to be called during deployment.
"""
import os
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
            print(f'ℹ️  Superadmin user exists: {email}')
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
        
        print(f'✅ Superadmin created successfully: {email}')


if __name__ == '__main__':
    create_superadmin()
