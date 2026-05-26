import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import TestingConfig
from app import create_app
from app.models import AffiliateProfile, CartItem, CouponCode, Order, OrderItem, Product, ProductVariant, User, UserRole, db


class ApiV1CheckoutTests(unittest.TestCase):
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

    def _create_product(self, name="Rings", slug="rings", stock=10, price=34900):
        product = Product(
            name=name,
            slug=slug,
            description="Wooden rings",
            price=price,
            stock_quantity=stock,
            weight_grams=2000,
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

    def test_checkout_preview_requires_non_empty_cart(self):
        response = self.client.get("/api/v1/checkout/preview")
        self.assertEqual(response.status_code, 400)

    def test_guest_checkout_place_order_success(self):
        with self.app.app_context():
            product_id = self._create_product()

        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 2},
        )

        preview = self.client.get("/api/v1/checkout/preview")
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.get_json()["data"]["cart"]["count"], 2)

        place = self.client.post(
            "/api/v1/checkout/place",
            json={
                "customer_name": "Guest Buyer",
                "phone_number": "9876543210",
                "email": "guest@example.com",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
                "address": "123, Fitness Street, Near Arena",
            },
        )
        self.assertEqual(place.status_code, 201)

        payload = place.get_json()["data"]
        self.assertIn("order_number", payload["order"])
        self.assertIn("https://wa.me/", payload["redirect_url"])

        cart_after = self.client.get("/api/v1/cart")
        self.assertEqual(cart_after.status_code, 200)
        self.assertEqual(cart_after.get_json()["data"]["cart"]["count"], 0)

        with self.app.app_context():
            self.assertEqual(Order.query.count(), 1)
            self.assertEqual(OrderItem.query.count(), 1)

    def test_authenticated_checkout_clears_db_cart(self):
        with self.app.app_context():
            product_id = self._create_product()
            user_id = self._create_user(email="buyer@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "buyer@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 1},
        )

        place = self.client.post(
            "/api/v1/checkout/place",
            json={
                "customer_name": "Buyer User",
                "phone_number": "9876501234",
                "email": "buyer@example.com",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411038",
                "address": "22, Workout Lane, Baner",
            },
        )
        self.assertEqual(place.status_code, 201)

        with self.app.app_context():
            self.assertEqual(CartItem.query.filter_by(user_id=user_id).count(), 0)

    def test_order_lookup_by_order_number_and_email(self):
        with self.app.app_context():
            product_id = self._create_product()

        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 1},
        )

        place = self.client.post(
            "/api/v1/checkout/place",
            json={
                "customer_name": "Lookup User",
                "phone_number": "9876509999",
                "email": "lookup@example.com",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411057",
                "address": "11, Status Street, Wakad",
            },
        )
        self.assertEqual(place.status_code, 201)
        order_number = place.get_json()["data"]["order"]["order_number"]

        ok_lookup = self.client.post(
            "/api/v1/orders/lookup",
            json={"order_number": order_number, "email": "lookup@example.com"},
        )
        self.assertEqual(ok_lookup.status_code, 200)
        self.assertEqual(ok_lookup.get_json()["data"]["order"]["order_number"], order_number)

        bad_lookup = self.client.post(
            "/api/v1/orders/lookup",
            json={"order_number": order_number, "email": "wrong@example.com"},
        )
        self.assertEqual(bad_lookup.status_code, 403)

    def test_checkout_applies_coupon_and_carries_affiliate_to_order_lookup(self):
        with self.app.app_context():
            product_id = self._create_product(name="Liquid Chalk", slug="liquid-chalk", stock=20, price=100000)
            affiliate_user_id = self._create_user(email="affiliate@example.com")
            db.session.add(AffiliateProfile(user_id=affiliate_user_id, affiliate_code="AFF123", is_active=True))
            db.session.add(
                CouponCode(
                    code="AFFDISC",
                    discount_amount_fixed=5000,
                    coupon_type="affiliate",
                    affiliate_id=affiliate_user_id,
                    is_active=True,
                )
            )
            db.session.commit()

        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 1},
        )

        place = self.client.post(
            "/api/v1/checkout/place",
            json={
                "customer_name": "Coupon User",
                "phone_number": "9876543210",
                "email": "coupon@example.com",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
                "address": "123, Fitness Street, Near Arena",
                "coupon_code": "AFFDISC",
            },
        )
        self.assertEqual(place.status_code, 201)
        order_number = place.get_json()["data"]["order"]["order_number"]

        lookup = self.client.post(
            "/api/v1/orders/lookup",
            json={"order_number": order_number, "email": "coupon@example.com"},
        )
        self.assertEqual(lookup.status_code, 200)

        order_payload = lookup.get_json()["data"]["order"]
        self.assertEqual(order_payload["coupon_code"], "AFFDISC")
        self.assertEqual(order_payload["affiliate_id"], affiliate_user_id)
        self.assertEqual(order_payload["discount_amount"], 5000)
        self.assertEqual(order_payload["subtotal_price"], 100000)
        self.assertEqual(order_payload["total_price"], 95000)

    def test_product_detail_by_id(self):
        with self.app.app_context():
            product_id = self._create_product(name="Battle Rope", slug="battle-rope")

        response = self.client.get(f"/api/v1/products/id/{product_id}")
        self.assertEqual(response.status_code, 200)

        product = response.get_json()["data"]["product"]
        self.assertEqual(product["id"], product_id)
        self.assertEqual(product["slug"], "battle-rope")

    def test_list_orders_requires_authentication(self):
        response = self.client.get("/api/v1/orders?page=1&per_page=10")
        self.assertEqual(response.status_code, 401)

    def test_list_orders_paginated_for_authenticated_user(self):
        with self.app.app_context():
            product_id = self._create_product()
            user_id = self._create_user(email="list@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "list@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 1},
        )

        place1 = self.client.post(
            "/api/v1/checkout/place",
            json={
                "customer_name": "List User",
                "phone_number": "9876508888",
                "email": "list@example.com",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
                "address": "Order 1 Address",
            },
        )
        self.assertEqual(place1.status_code, 201)

        self.client.post(
            "/api/v1/cart/add",
            json={"product_id": product_id, "quantity": 2},
        )

        place2 = self.client.post(
            "/api/v1/checkout/place",
            json={
                "customer_name": "List User",
                "phone_number": "9876508888",
                "email": "list@example.com",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
                "address": "Order 2 Address",
            },
        )
        self.assertEqual(place2.status_code, 201)

        list_response = self.client.get("/api/v1/orders?page=1&per_page=10")
        self.assertEqual(list_response.status_code, 200)

        payload = list_response.get_json()
        self.assertTrue(payload["success"])
        self.assertEqual(len(payload["data"]["orders"]), 2)
        self.assertIn("reviewable_order_item_ids", payload["data"])
        self.assertIn("reviewed_order_item_ids", payload["data"])
        self.assertEqual(payload["data"]["reviewable_order_item_ids"], [])
        self.assertEqual(payload["data"]["reviewed_order_item_ids"], [])
        self.assertIn("product_slug", payload["data"]["orders"][0]["items"][0])
        self.assertEqual(payload["meta"]["pagination"]["total_items"], 2)
        self.assertEqual(payload["meta"]["pagination"]["total_pages"], 1)
        self.assertEqual(payload["meta"]["pagination"]["current_page"], 1)


if __name__ == "__main__":
    unittest.main()
