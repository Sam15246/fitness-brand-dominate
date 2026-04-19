import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import TestingConfig
from app import create_app
from app.models import CartItem, Product, ProductVariant, User, UserRole, db


class ApiV1CartTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            owner = self._create_user(email="owner@example.com", role=UserRole.ADMIN.value)
            self.owner_id = owner

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

    def _create_product(self, name="Pull-Up Bar", slug="pull-up-bar", stock=10, price=49900):
        product = Product(
            name=name,
            slug=slug,
            description="Solid wooden bar",
            price=price,
            stock_quantity=stock,
            weight_grams=3000,
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
        return product.id

    def test_guest_cart_add_update_remove_flow(self):
        with self.app.app_context():
            product_id = self._create_product()

        add_response = self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 2},
        )
        self.assertEqual(add_response.status_code, 200)
        self.assertEqual(add_response.get_json()["data"]["cart"]["count"], 2)

        update_response = self.client.put(
            f"/api/v1/cart/items/{product_id}",
            json={"quantity": 4},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["data"]["cart"]["count"], 4)

        remove_response = self.client.delete(f"/api/v1/cart/items/{product_id}")
        self.assertEqual(remove_response.status_code, 200)
        self.assertEqual(remove_response.get_json()["data"]["cart"]["count"], 0)

    def test_login_merges_guest_cart_into_database_cart(self):
        with self.app.app_context():
            product_id = self._create_product()
            user_id = self._create_user(email="shopper@example.com")

        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 3},
        )

        login_response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "shopper@example.com", "password": "pass123"},
        )
        self.assertEqual(login_response.status_code, 200)

        cart_response = self.client.get("/api/v1/cart")
        self.assertEqual(cart_response.status_code, 200)
        self.assertEqual(cart_response.get_json()["data"]["cart"]["count"], 3)

        with self.app.app_context():
            db_item = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
            self.assertIsNotNone(db_item)
            self.assertEqual(db_item.quantity, 3)

    def test_clear_cart_for_authenticated_user(self):
        with self.app.app_context():
            product_id = self._create_product()
            user_id = self._create_user(email="buyer@example.com")

        self.client.post(
            "/api/v1/auth/login",
            json={"email": "buyer@example.com", "password": "pass123"},
        )
        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 2},
        )

        clear_response = self.client.post("/api/v1/cart/clear")
        self.assertEqual(clear_response.status_code, 200)
        self.assertEqual(clear_response.get_json()["data"]["cart"]["count"], 0)

        with self.app.app_context():
            self.assertEqual(CartItem.query.filter_by(user_id=user_id).count(), 0)


if __name__ == "__main__":
    unittest.main()
