import os
from dotenv import load_dotenv
from app import create_app, db
from app.models import User, Product, Order, UserRole

# Load environment variables
load_dotenv()

# Create app
app = create_app()


@app.shell_context_processor
def make_shell_context():
    """Make shell context for Flask CLI."""
    return {
        'db': db,
        'User': User,
        'Product': Product,
        'Order': Order,
        'UserRole': UserRole,
    }


@app.cli.command()
def init_db():
    """Initialize database with sample data."""
    print('Initializing database...')
    db.create_all()
    print('Database initialized!')


@app.cli.command()
def seed_db():
    """Seed database with sample data for testing."""
    print('Seeding database...')
    
    # Check if superadmin exists
    superadmin = User.query.filter_by(email='superadmin@fitness.local').first()
    if superadmin is None:
        superadmin = User(
            name='Super Admin',
            email='superadmin@fitness.local',
            role=UserRole.SUPERADMIN.value,
            is_active=True
        )
        superadmin.set_password('admin123')
        db.session.add(superadmin)
        print('✓ Superadmin created (email: superadmin@fitness.local, password: admin123)')
    
    # Create sample admins
    admin1 = User.query.filter_by(email='admin1@fitness.local').first()
    if admin1 is None:
        admin1 = User(
            name='Admin One',
            email='admin1@fitness.local',
            role=UserRole.ADMIN.value,
            is_active=True
        )
        admin1.set_password('admin123')
        db.session.add(admin1)
        print('✓ Admin 1 created (email: admin1@fitness.local, password: admin123)')
    
    # Create sample products
    if Product.query.count() == 0:
        parallettes = Product(
            name='Premium Parallettes - DOMINATE',
            slug='premium-parallettes-dominate',
            description='High-quality wooden parallettes designed for calisthenics training. Perfect for L-sits, muscle-ups, and bodyweight training. Handmade with premium materials. Features the DOMINATE branding for serious athletes.',
            price=49900,  # ₹499
            stock_quantity=15,
            weight_grams=1200,
            image_url='/static/images/dominate-parallettes.jpg',
            is_active=True,
            created_by=superadmin.id
        )
        
        pull_up_bar = Product(
            name='Portable Pull-up Bar',
            slug='portable-pull-up-bar',
            description='Compact and durable pull-up bar for home training. Fits standard doorframes. Great for pull-ups, chin-ups, and hanging exercises.',
            price=39900,  # ₹399
            stock_quantity=20,
            weight_grams=3500,
            image_url='/static/images/pullupbar.jpg',
            is_active=True,
            created_by=superadmin.id
        )
        
        db.session.add(parallettes)
        db.session.add(pull_up_bar)
        print('✓ Sample products created')
    
    try:
        db.session.commit()
        print('\n✓ Database seeded successfully!')
        print('\nTest credentials:')
        print('  Superadmin: superadmin@fitness.local / admin123')
        print('  Admin: admin1@fitness.local / admin123')
    except Exception as e:
        db.session.rollback()
        print(f'✗ Error seeding database: {str(e)}')


if __name__ == '__main__':
    app.run(debug=True)
