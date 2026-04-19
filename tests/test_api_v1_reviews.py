import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import TestingConfig
from app import create_app
from app.models import Order, OrderItem, OrderStatus, Product, ProductVariant, ShippingStatus, User, UserRole, db


class ApiV1ReviewTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            self.owner_id = self._create_user(email="owner@example.com", role=UserRole.ADMIN.value)

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

    def _create_product_with_variant(self, slug="rings", price=34900, stock=20):
        product = Product(
            name="Rings",
            slug=slug,
            description="Wooden rings",
            price=price,
            stock_quantity=stock,
            weight_grams=1200,
            is_active=True,
            created_by=self.owner_id,
        )
        db.session.add(product)
        db.session.flush()

        variant = ProductVariant(
            product_id=product.id,
            sku=f"{slug.upper()}-DEFAULT",
            option_values={},
            price_override=price,
            stock_quantity=stock,
            is_active=True,
        )
        db.session.add(variant)
        db.session.commit()
        return product.id, variant.id, product.slug

    def _create_delivered_order_item(self, user_id, product_id, variant_id, unit_price=34900):
        order = Order(
            order_number="ORD-20260418000000-AAAAAA",
            user_id=user_id,
            guest_name="Buyer",
            guest_phone="9876543210",
            guest_email="buyer@example.com",
            city="Pune",
            state="Maharashtra",
            pincode="411001",
            address="123 Strength Street",
            status=OrderStatus.CONFIRMED.value,
            shipping_status=ShippingStatus.DELIVERED.value,
            delivered_at=db.func.now(),
        )
        db.session.add(order)
        db.session.flush()

        order_item = OrderItem(
            order_id=order.id,
            product_id=product_id,
            variant_id=variant_id,
            variant_snapshot={},
            quantity=1,
            unit_price=unit_price,
        )
        db.session.add(order_item)
        db.session.commit()
        return order_item.id

    def test_review_eligibility_requires_authentication(self):
        with self.app.app_context():
            _, _, slug = self._create_product_with_variant(slug="bar")

        response = self.client.get(f"/api/v1/products/{slug}/review-eligibility")
        self.assertEqual(response.status_code, 401)

    def test_submit_review_for_delivered_purchase_success(self):
        with self.app.app_context():
            product_id, variant_id, slug = self._create_product_with_variant(slug="rings-1")
            user_id = self._create_user(email="reviewer@example.com")
            order_item_id = self._create_delivered_order_item(user_id, product_id, variant_id)

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "reviewer@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        eligibility = self.client.get(f"/api/v1/products/{slug}/review-eligibility")
        self.assertEqual(eligibility.status_code, 200)
        self.assertTrue(eligibility.get_json()["data"]["eligibility"]["can_submit_review"])

        submit = self.client.post(
            f"/api/v1/products/{slug}/reviews",
            json={
                "order_item_id": order_item_id,
                "rating": 5,
                "title": "Excellent",
                "comment": "Solid build quality and perfect grip for training.",
            },
        )
        self.assertEqual(submit.status_code, 201)

        eligibility_after = self.client.get(f"/api/v1/products/{slug}/review-eligibility")
        self.assertEqual(eligibility_after.status_code, 200)
        self.assertFalse(eligibility_after.get_json()["data"]["eligibility"]["can_submit_review"])

    def test_submit_review_without_delivered_order_forbidden(self):
        with self.app.app_context():
            _, _, slug = self._create_product_with_variant(slug="rings-2")
            self._create_user(email="nodelivery@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "nodelivery@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        submit = self.client.post(
            f"/api/v1/products/{slug}/reviews",
            json={
                "rating": 4,
                "title": "Good",
                "comment": "Good product but this should fail due to eligibility.",
            },
        )
        self.assertEqual(submit.status_code, 403)


if __name__ == "__main__":
    unittest.main()
