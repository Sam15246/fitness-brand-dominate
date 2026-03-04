"""
Add sample products to the database with images.
"""

from datetime import datetime
from pathlib import Path
import sys
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app import create_app, db
from app.models import Product, ProductImage, User
from sqlalchemy import func

def add_sample_products(silent=False):
    """Add Standard Parallettes and Liquid Chalk products.
    
    Args:
        silent (bool): If True, suppress console output during production builds.
    """
    
    app = create_app()
    
    with app.app_context():
        # Get or create default admin user
        admin = User.query.filter_by(email='admin@dominate.com').first()
        if not admin:
            if not silent:
                print("ℹ️  Creating admin user...")
            from werkzeug.security import generate_password_hash
            admin = User(
                name='Admin',
                email='admin@dominate.com',
                password_hash=generate_password_hash('admin123'),
                role='superadmin',
                is_active=True
            )
            db.session.add(admin)
            db.session.commit()
            if not silent:
                print("✅ Admin user created")
        
        existing_products = Product.query.filter(
            func.lower(Product.name).in_([
                'standard parallettes',
                'liquid chalk'
            ])
        ).all()
        
        if existing_products:
            if not silent:
                print(f"⚠️  {len(existing_products)} products already exist. Skipping...")
            return True
        
        try:
            # Product 1: Standard Parallettes
            product1 = Product(
                name='Standard Parallettes',
                slug='standard-parallettes',
                description='Premium wooden parallettes for calisthenics training. Handcrafted with precision using high-quality wood. Perfect for dips, L-sits, and other calisthenic movements. Includes excellent grip and stability.',
                price=100000,  # ₹1000 in paise
                price_original=100000,
                price_discounted=100000,
                is_discount_active=False,
                stock_quantity=15,
                weight_grams=1200,
                dimensions='30x15x12 cm',
                is_active=True,
                created_by=admin.id
            )
            db.session.add(product1)
            db.session.flush()  # Get the product ID
            
            # Add image for Standard Parallettes
            parallettes_image = ProductImage(
                product_id=product1.id,
                image_path='static/images/dominate-parallettes-standard.png',
                is_primary=True
            )
            db.session.add(parallettes_image)
            
            # Product 2: Liquid Chalk
            product2 = Product(
                name='Liquid Chalk',
                slug='liquid-chalk',
                description='Dominate Liquid Chalk - Strong Grip, Zero Slip. Premium liquid chalk for calisthenics, weightlifting, and gymnastics. 200ml bottle provides excellent grip control while maintaining minimal slip. Perfect for bars, rings, and high-intensity training.',
                price=30000,  # ₹300 in paise
                price_original=30000,
                price_discounted=30000,
                is_discount_active=False,
                stock_quantity=50,
                weight_grams=250,
                dimensions='6x6x15 cm',
                is_active=True,
                created_by=admin.id
            )
            db.session.add(product2)
            db.session.flush()  # Get the product ID
            
            # Add image for Liquid Chalk
            chalk_image = ProductImage(
                product_id=product2.id,
                image_path='static/images/liquid-chalk-dominate200ml.png',
                is_primary=True
            )
            db.session.add(chalk_image)
            
            db.session.commit()
            
            if not silent:
                print("✅ Sample products added successfully!")
                print(f"   1. Standard Parallettes - ₹1000")
                print(f"   2. Liquid Chalk - ₹300")
            return True
            
        except Exception as e:
            db.session.rollback()
            if not silent:
                print(f"❌ Error adding sample products: {str(e)}")
                import traceback
                traceback.print_exc()
            return False

if __name__ == '__main__':
    success = add_sample_products()
    sys.exit(0 if success else 1)
