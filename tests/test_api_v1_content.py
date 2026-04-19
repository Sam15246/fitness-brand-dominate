import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import TestingConfig
from app import create_app
from app.models import PolicyPage, User, UserRole, db


class ApiV1ContentTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            self.admin_id = self._create_user(email="admin@example.com", role=UserRole.ADMIN.value)
            self._seed_policies()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _create_user(self, email="user@example.com", password="pass123", role=UserRole.USER.value):
        user = User(
            name="Test User",
            email=email,
            role=role,
            is_active=True,
            auth_provider="local",
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user.id

    def _seed_policies(self):
        policies = [
            ("shipping", "Shipping Policy"),
            ("returns", "Return Policy"),
            ("terms", "Terms & Conditions"),
            ("privacy", "Privacy Policy"),
        ]
        for slug, title in policies:
            db.session.add(
                PolicyPage(
                    slug=slug,
                    title=title,
                    content=f"<p>{title} content</p>",
                    updated_by=self.admin_id,
                )
            )
        db.session.commit()

    def test_contact_content_endpoint(self):
        response = self.client.get("/api/v1/content/contact")
        self.assertEqual(response.status_code, 200)

        payload = response.get_json()
        self.assertTrue(payload["success"])
        self.assertIn("whatsapp_number", payload["data"])
        self.assertIn("brand_name", payload["data"])

    def test_shipping_policy_endpoint(self):
        response = self.client.get("/api/v1/content/policies/shipping")
        self.assertEqual(response.status_code, 200)

        payload = response.get_json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["policy"]["slug"], "shipping")
        self.assertEqual(payload["data"]["policy"]["title"], "Shipping Policy")

    def test_invalid_policy_slug_returns_not_found(self):
        response = self.client.get("/api/v1/content/policies/unknown")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["error"]["code"], "not_found")

    def test_inactive_policy_returns_not_found(self):
        with self.app.app_context():
            PolicyPage.query.filter_by(slug="terms").delete()
            db.session.commit()

        response = self.client.get("/api/v1/content/policies/terms")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["error"]["code"], "not_found")


if __name__ == "__main__":
    unittest.main()
