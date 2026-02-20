"""
Initialize default policy pages in the database.

This script creates the default policy pages (Shipping, Returns, Terms, Privacy)
with placeholder content that admins can customize.

Run this once after creating the database to populate default policies.

Usage:
    python -c "from app.scripts.init_policies import init_policies; init_policies()"
"""

from app import create_app
from app.models import db, PolicyPage, User, UserRole
from datetime import datetime


def init_policies():
    """Initialize default policy pages with sample content."""
    
    app = create_app()
    with app.app_context():
        # Get or create system admin user
        admin = User.query.filter_by(role=UserRole.SUPERADMIN.value).first()
        
        if not admin:
            print("⚠️  No superadmin user found. Creating placeholder admin user...")
            admin = User(
                name="System Admin",
                email="admin@dominate.local",
                role=UserRole.SUPERADMIN.value,
                is_active=True
            )
            admin.set_password("temp_password_123")
            db.session.add(admin)
            db.session.commit()
        
        # Default policies configuration
        default_policies = [
            {
                "slug": "shipping",
                "title": "Shipping Policy",
                "content": """
                <h3>Shipping Policy</h3>
                
                <p><strong>Delivery Timeframe:</strong><br>
                We dispatch orders within 2-3 business days of receiving payment. Delivery typically takes 5-7 business days across India via standard courier.</p>
                
                <ul>
                    <li><strong>Express Delivery:</strong> 2-3 business days (available for major cities)</li>
                    <li><strong>Standard Delivery:</strong> 5-7 business days (all-India coverage)</li>
                    <li><strong>Remote Areas:</strong> 10-14 business days</li>
                </ul>
                
                <p><strong>Shipping Charges:</strong><br>
                Shipping costs are calculated based on destination pincode and product weight. We offer free shipping on orders above ₹2,500.</p>
                
                <p><strong>Delivery Partner:</strong><br>
                We work with trusted courier partners like Delhivery, BlueDart, and Shiprocket to ensure safe and timely delivery of your orders.</p>
                
                <p><strong>Tracking:</strong><br>
                You will receive a tracking number via SMS and email once your order is dispatched. You can track your order on your preferred courier's website.</p>
                
                <p><em>For any shipping-related queries, please contact us at support@dominate.local</em></p>
                """
            },
            {
                "slug": "returns",
                "title": "Returns & Refund Policy",
                "content": """
                <h3>Returns & Refund Policy</h3>
                
                <p><strong>30-Day Return Window:</strong><br>
                We offer a hassle-free 30-day return policy from the date of delivery. If you're not satisfied with your purchase, you can initiate a return request.</p>
                
                <p><strong>Return Conditions:</strong><br>
                Products must be:</p>
                <ul>
                    <li>Unused and in original packaging</li>
                    <li>Accompanied by the original invoice/receipt</li>
                    <li>Free from damage or wear</li>
                    <li>Returned within 30 days of delivery</li>
                </ul>
                
                <p><strong>Refund Process:</strong></p>
                <ol>
                    <li>Contact our support team to initiate a return</li>
                    <li>Receive a return shipping label</li>
                    <li>Ship the product back to us using the provided label</li>
                    <li>We inspect and verify the return</li>
                    <li>Refund is processed within 5-7 business days</li>
                </ol>
                
                <p><strong>Non-Returnable Items:</strong><br>
                Custom-made products and items outside the 30-day window cannot be returned.</p>
                
                <p><em>For returns and refund inquiries, please email support@dominate.local or WhatsApp us.</em></p>
                """
            },
            {
                "slug": "terms",
                "title": "Terms & Conditions",
                "content": """
                <h3>Terms & Conditions</h3>
                
                <p><strong>1. Agreement to Terms:</strong><br>
                By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
                
                <p><strong>2. Use License:</strong><br>
                Permission is granted to temporarily download one copy of the materials (information or software) on DOMINATE's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                <ul>
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for any commercial purpose or for any public display</li>
                    <li>Attempt to decompile or reverse engineer any software contained on the website</li>
                    <li>Remove any copyright or other proprietary notations from the materials</li>
                    <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                </ul>
                
                <p><strong>3. Disclaimer:</strong><br>
                The materials on DOMINATE's website are provided on an 'as is' basis. DOMINATE makes no warranties, expressed or implied, and hereby disclaims all warranties including, without limitation, implied warranties of merchantability or fitness for a particular purpose.</p>
                
                <p><strong>4. Limitations:</strong><br>
                In no event shall DOMINATE or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on DOMINATE's website.</p>
                
                <p><strong>5. Accuracy of Materials:</strong><br>
                The materials appearing on DOMINATE's website could include technical, typographical, or photographic errors. DOMINATE does not warrant that any of the materials on its website are accurate, complete, or current.</p>
                
                <p><em>Last updated: """ + datetime.now().strftime("%d %B %Y") + """</em></p>
                """
            },
            {
                "slug": "privacy",
                "title": "Privacy Policy",
                "content": """
                <h3>Privacy Policy</h3>
                
                <p><strong>Information Collection:</strong><br>
                We collect information to provide better services to all our customers. This includes:</p>
                <ul>
                    <li>Order information (name, phone, address, email)</li>
                    <li>Payment information (processed securely)</li>
                    <li>Communication preferences</li>
                    <li>Usage data (analytics, cookies)</li>
                </ul>
                
                <p><strong>Use of Information:</strong><br>
                Your information helps us to:</p>
                <ul>
                    <li>Process and fulfill your orders</li>
                    <li>Send order confirmations and updates</li>
                    <li>Respond to customer inquiries</li>
                    <li>Improve our products and services</li>
                    <li>Send promotional content (with your consent)</li>
                </ul>
                
                <p><strong>Data Protection:</strong><br>
                We take data protection seriously and implement industry-standard security measures. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.</p>
                
                <p><strong>Third-Party Sharing:</strong><br>
                We do not sell or share your personal information with third parties without your explicit consent, except as required by law or for order fulfillment (courier partners, payment gateways).</p>
                
                <p><strong>Cookies:</strong><br>
                Our website uses cookies to enhance your experience. You can choose to disable cookies through your browser settings, though this may affect website functionality.</p>
                
                <p><strong>Consumer Rights:</strong><br>
                You have the right to access, correction, or deletion of your personal data. Please contact support@dominate.local to exercise these rights.</p>
                
                <p><strong>Changes to Policy:</strong><br>
                We may update this privacy policy periodically. Continued use of our website signifies acceptance of any updates.</p>
                
                <p><em>Last updated: """ + datetime.now().strftime("%d %B %Y") + """</em></p>
                """
            }
        ]
        
        # Create or update policies
        created_count = 0
        updated_count = 0
        
        for policy_data in default_policies:
            existing_policy = PolicyPage.query.filter_by(slug=policy_data['slug']).first()
            
            if existing_policy:
                print(f"✓ Policy '{policy_data['slug']}' already exists, skipping...")
                updated_count += 1
            else:
                policy = PolicyPage(
                    slug=policy_data['slug'],
                    title=policy_data['title'],
                    content=policy_data['content'],
                    updated_by=admin.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(policy)
                print(f"✓ Created policy: {policy_data['slug']}")
                created_count += 1
        
        db.session.commit()
        
        print(f"\n✅ Policy initialization complete!")
        print(f"   Created: {created_count} new policies")
        print(f"   Skipped: {updated_count} existing policies")
        print(f"\n📝 Policies are now editable from the admin dashboard:")
        print(f"   /admin/policies")


if __name__ == '__main__':
    init_policies()

