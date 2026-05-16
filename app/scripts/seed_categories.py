"""
Seed initial product categories for DOMINATE fitness brand.

Run this script to populate default categories:
    python -m app.scripts.seed_categories

Categories structure:
    BARS & STANDS
    ├─ Pull-Up Bars
    ├─ Dip Stations
    └─ Parallelettes
    
    RINGS & ACCESSORIES
    ├─ Gymnastics Rings
    └─ Ring Stands
    
    TRAINING BUNDLES
"""

from app import create_app
from app.models import db, ProductCategory
from datetime import datetime


def seed_categories(silent=False):
    """Create initial category structure.
    
    Args:
        silent (bool): If True, suppress output messages (for production deploys)
    """
    app = create_app()
    
    with app.app_context():
        if not silent:
            print("🌱 Seeding product categories...")
        
        # Check if categories already exist
        if ProductCategory.query.count() > 0:
            if not silent:
                print("⚠️  Categories already exist. Skipping seed.")
                print(f"   Found {ProductCategory.query.count()} categories")
            return
        
        categories_data = [
            # Level 1: BARS & STANDS
            {
                'name': 'Bars & Stands',
                'slug': 'bars-stands',
                'description': 'Pull-up bars, dip stations, and parallelettes for calisthenics training',
                'icon': '🏋️',
                'display_order': 1,
                'parent_id': None,
                'children': [
                    {
                        'name': 'Pull-Up Bars',
                        'slug': 'pull-up-bars',
                        'description': 'Wall-mounted, doorway, and standalone pull-up bars',
                        'icon': '💪',
                        'display_order': 1
                    },
                    {
                        'name': 'Dip Stations',
                        'slug': 'dip-stations',
                        'description': 'Parallel bars for dips and support training',
                        'icon': '🤸',
                        'display_order': 2
                    },
                    {
                        'name': 'Parallelettes',
                        'slug': 'parallelettes',
                        'description': 'Compact parallel bars for floor exercises',
                        'icon': '🔥',
                        'display_order': 3
                    }
                ]
            },
            
            # Level 1: RINGS & ACCESSORIES
            {
                'name': 'Rings & Accessories',
                'slug': 'rings-accessories',
                'description': 'Gymnastics rings and mounting solutions',
                'icon': '⭕',
                'display_order': 2,
                'parent_id': None,
                'children': [
                    {
                        'name': 'Gymnastics Rings',
                        'slug': 'gymnastics-rings',
                        'description': 'Wooden and plastic rings for advanced training',
                        'icon': '🎯',
                        'display_order': 1
                    },
                    {
                        'name': 'Ring Stands',
                        'slug': 'ring-stands',
                        'description': 'Portable stands for ring training anywhere',
                        'icon': '📏',
                        'display_order': 2
                    }
                ]
            },
            
            # Level 1: TRAINING BUNDLES
            {
                'name': 'Training Bundles',
                'slug': 'training-bundles',
                'description': 'Complete training setups at discounted prices',
                'icon': '📦',
                'display_order': 3,
                'parent_id': None,
                'children': [
                    {
                        'name': 'Beginner Bundle',
                        'slug': 'beginner-bundle',
                        'description': 'Essential equipment for starting calisthenics',
                        'icon': '🌱',
                        'display_order': 1
                    },
                    {
                        'name': 'Complete Setup',
                        'slug': 'complete-setup',
                        'description': 'Full home gym with all equipment',
                        'icon': '⚡',
                        'display_order': 2
                    }
                ]
            }
        ]
        
        # Create categories
        created_count = 0
        
        for parent_data in categories_data:
            children_data = parent_data.pop('children', [])
            
            # Create parent category
            parent = ProductCategory(
                name=parent_data['name'],
                slug=parent_data['slug'],
                description=parent_data['description'],
                icon=parent_data.get('icon'),
                display_order=parent_data['display_order'],
                parent_id=None,
                is_active=True
            )
            db.session.add(parent)
            db.session.flush()  # Get parent.id
            
            if not silent:
                print(f"✓ Created: {parent.name} (id={parent.id})")
            created_count += 1
            
            # Create child categories
            for child_data in children_data:
                child = ProductCategory(
                    name=child_data['name'],
                    slug=child_data['slug'],
                    description=child_data['description'],
                    icon=child_data.get('icon'),
                    display_order=child_data['display_order'],
                    parent_id=parent.id,
                    is_active=True
                )
                db.session.add(child)
                if not silent:
                    print(f"  ├─ Created: {child.name}")
                created_count += 1
        
        db.session.commit()
        
        if not silent:
            print(f"\n✅ Successfully created {created_count} categories!")
            print("\n📋 Category Structure:")
            print_category_tree()


def print_category_tree():
    """Display category tree structure."""
    app = create_app()
    
    with app.app_context():
        root_categories = ProductCategory.get_root_categories().all()
        
        for root in root_categories:
            print(f"\n{root.icon} {root.name}")
            for child in root.children:
                print(f"  ├─ {child.icon} {child.name}")


def list_categories():
    """List all categories with details."""
    app = create_app()
    
    with app.app_context():
        categories = ProductCategory.query.order_by(
            ProductCategory.parent_id.asc(),
            ProductCategory.display_order.asc()
        ).all()
        
        print(f"\n📋 Total Categories: {len(categories)}\n")
        
        for cat in categories:
            level = "  " * cat.get_depth_level()
            parent = f" (parent: {cat.parent.name})" if cat.parent else " (ROOT)"
            print(f"{level}• {cat.name} → /{cat.slug}{parent}")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'list':
        list_categories()
    else:
        seed_categories()
