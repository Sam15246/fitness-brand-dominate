"""
One-time script to fix Standard Parallettes: set image path and mark as coming soon.
Run: python -m app.scripts.fix_parallettes_image
"""

def fix_parallettes():
    from app import create_app
    from app.models import Product, ProductImage, db

    app = create_app()
    with app.app_context():
        product = Product.query.filter_by(slug='standard-parallettes').first()
        if not product:
            print("Product 'standard-parallettes' not found.")
            return

        # Mark as coming soon
        product.is_coming_soon = True
        product.stock_quantity = 0
        print(f"Marked '{product.name}' as coming soon.")

        # Fix image — use public path (served by Next.js from frontend/public/)
        existing = ProductImage.query.filter_by(product_id=product.id).first()
        target_path = '/dominate-parallettes-standard.png'

        if existing:
            if existing.image_path != target_path:
                existing.image_path = target_path
                print(f"Updated image path to: {target_path}")
            else:
                print(f"Image path already correct: {target_path}")
        else:
            image = ProductImage(
                product_id=product.id,
                image_path=target_path,
                is_primary=True,
                display_order=0,
            )
            db.session.add(image)
            print(f"Created image record with path: {target_path}")

        db.session.commit()
        print("Done.")


if __name__ == '__main__':
    fix_parallettes()
