import os
import sys
import unittest
from io import BytesIO
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import TestingConfig
from app import create_app
from app.models import (
    AffiliateProfile,
    CommissionStatus,
    Order,
    Product,
    ProductImage,
    User,
    UserRole,
    db,
)


class ApiV1AdminActionsTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            self.superadmin_id = self._create_user(
                email="superadmin@example.com",
                role=UserRole.SUPERADMIN.value,
            )
            self.owner_id = self._create_user(
                email="owner@example.com",
                role=UserRole.ADMIN.value,
            )

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _create_user(self, email, role=UserRole.USER.value, password="pass123"):
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

    def _create_product(self, name="Pull-Up Bar", slug="pull-up-bar"):
        product = Product(
            name=name,
            slug=slug,
            description="Solid wooden bar",
            price=49900,
            stock_quantity=10,
            weight_grams=2500,
            is_active=True,
            created_by=self.owner_id,
        )
        db.session.add(product)
        db.session.commit()
        return product.id

    def _login_superadmin(self):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@example.com", "password": "pass123"},
        )
        self.assertEqual(response.status_code, 200)

    def test_admin_can_update_user_role_and_active_state(self):
        with self.app.app_context():
            user_id = self._create_user(email="user-update@example.com")

        self._login_superadmin()

        role_update = self.client.put(
            f"/api/v1/admin/users/{user_id}",
            json={"role": UserRole.ADMIN.value},
        )
        self.assertEqual(role_update.status_code, 200)
        self.assertEqual(role_update.get_json()["data"]["user"]["role"], UserRole.ADMIN.value)

        active_update = self.client.put(
            f"/api/v1/admin/users/{user_id}",
            json={"is_active": False},
        )
        self.assertEqual(active_update.status_code, 200)
        self.assertFalse(active_update.get_json()["data"]["user"]["is_active"])

    def test_admin_can_approve_and_reject_commission(self):
        with self.app.app_context():
            affiliate_user_id = self._create_user(email="affiliate@example.com")
            profile = AffiliateProfile(
                user_id=affiliate_user_id,
                affiliate_code="AFF123",
                commission_percent=10.0,
                is_active=True,
            )
            db.session.add(profile)

            order = Order(
                order_number="ORD-20260419000000-AAAAAA",
                guest_name="Buyer",
                guest_phone="9876543210",
                guest_email="buyer@example.com",
                city="Pune",
                state="Maharashtra",
                pincode="411001",
                address="123 Strength Street",
                affiliate_id=affiliate_user_id,
                commission_amount=900,
                commission_status=CommissionStatus.PENDING.value,
            )
            db.session.add(order)
            db.session.commit()
            order_id = order.id

        self._login_superadmin()

        approve = self.client.put(
            f"/api/v1/admin/commissions/{order_id}",
            json={"commission_status": CommissionStatus.APPROVED.value},
        )
        self.assertEqual(approve.status_code, 200)
        self.assertEqual(
            approve.get_json()["data"]["commission"]["commission_status"],
            CommissionStatus.APPROVED.value,
        )

        reject = self.client.put(
            f"/api/v1/admin/commissions/{order_id}",
            json={"commission_status": CommissionStatus.REJECTED.value},
        )
        self.assertEqual(reject.status_code, 200)
        self.assertEqual(
            reject.get_json()["data"]["commission"]["commission_status"],
            CommissionStatus.REJECTED.value,
        )

    def test_admin_can_create_update_delete_product_images(self):
        with self.app.app_context():
            product_id = self._create_product(slug="image-admin-product")

        self._login_superadmin()

        create = self.client.post(
            f"/api/v1/admin/products/{product_id}/images",
            json={"image_path": "https://example.com/image-1.jpg", "is_primary": True, "display_order": 0},
        )
        self.assertEqual(create.status_code, 201)
        image_id = create.get_json()["data"]["image"]["id"]

        update = self.client.put(
            f"/api/v1/admin/products/{product_id}/images/{image_id}",
            json={"display_order": 2},
        )
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.get_json()["data"]["image"]["display_order"], 2)

        delete = self.client.delete(f"/api/v1/admin/products/{product_id}/images/{image_id}")
        self.assertEqual(delete.status_code, 200)

        with self.app.app_context():
            self.assertIsNone(ProductImage.query.filter_by(id=image_id, product_id=product_id).first())

    def test_admin_can_upload_product_image_via_multipart(self):
        with self.app.app_context():
            product_id = self._create_product(slug="multipart-image-admin-product")

        self._login_superadmin()

        with patch("app.routes.api_v1_admin.get_storage") as mock_get_storage:
            mock_storage = mock_get_storage.return_value
            mock_storage.upload.return_value = {
                "success": True,
                "error": None,
                "url": "https://cdn.example.com/products/original/test-image.webp",
                "storage_path": "products/original/test-image.webp",
            }

            response = self.client.post(
                f"/api/v1/admin/products/{product_id}/images",
                data={"file": (BytesIO(b"fake-image"), "test-image.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 201)
        image = response.get_json()["data"]["image"]
        self.assertEqual(image["path"], "https://cdn.example.com/products/original/test-image.webp")

        with self.app.app_context():
            record = ProductImage.query.filter_by(id=image["id"], product_id=product_id).first()
            self.assertIsNotNone(record)
            self.assertEqual(record.storage_path, "products/original/test-image.webp")


if __name__ == "__main__":
    unittest.main()
