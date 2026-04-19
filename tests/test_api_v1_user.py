import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import TestingConfig
from app import create_app
from app.models import User, UserRole, UserAddress, db


class ApiV1UserTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

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

    def test_get_profile_requires_authentication(self):
        response = self.client.get("/api/v1/users/profile")
        self.assertEqual(response.status_code, 401)

    def test_get_authenticated_user_profile(self):
        with self.app.app_context():
            user_id = self._create_user(email="profile@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "profile@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        profile = self.client.get("/api/v1/users/profile")
        self.assertEqual(profile.status_code, 200)

        data = profile.get_json()["data"]["user"]
        self.assertEqual(data["email"], "profile@example.com")
        self.assertEqual(data["name"], "Test User")
        self.assertIn("id", data)
        self.assertIn("created_at", data)

    def test_update_user_profile(self):
        with self.app.app_context():
            user_id = self._create_user(email="update@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "update@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        update = self.client.put(
            "/api/v1/users/profile",
            json={
                "name": "Updated Name",
                "phone": "9876543210",
                "full_name": "Updated Full Name",
                "email_marketing_opt_in": True,
            },
        )
        self.assertEqual(update.status_code, 200)

        data = update.get_json()["data"]["user"]
        self.assertEqual(data["name"], "Updated Name")
        self.assertEqual(data["phone"], "9876543210")
        self.assertEqual(data["full_name"], "Updated Full Name")
        self.assertTrue(data["email_marketing_opt_in"])

    def test_update_profile_validates_name(self):
        with self.app.app_context():
            user_id = self._create_user(email="validate@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "validate@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        update = self.client.put(
            "/api/v1/users/profile",
            json={"name": "A"},
        )
        self.assertEqual(update.status_code, 400)
        self.assertIn("validation_error", update.get_json()["error"]["code"])

    def test_get_user_addresses_requires_authentication(self):
        response = self.client.get("/api/v1/users/addresses")
        self.assertEqual(response.status_code, 401)

    def test_create_user_address(self):
        with self.app.app_context():
            user_id = self._create_user(email="address@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "address@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        create = self.client.post(
            "/api/v1/users/addresses",
            json={
                "label": "Home",
                "full_name": "John Doe",
                "phone": "9876543210",
                "street_line1": "123 Main Street",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
            },
        )
        self.assertEqual(create.status_code, 201)

        data = create.get_json()["data"]["address"]
        self.assertEqual(data["label"], "Home")
        self.assertEqual(data["full_name"], "John Doe")
        self.assertTrue(data["is_default"])  # First address is default

    def test_first_address_is_default(self):
        with self.app.app_context():
            user_id = self._create_user(email="first@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "first@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        create = self.client.post(
            "/api/v1/users/addresses",
            json={
                "label": "Office",
                "full_name": "Jane Doe",
                "phone": "9876543211",
                "street_line1": "456 Office Ave",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
            },
        )
        self.assertEqual(create.status_code, 201)

        list_addrs = self.client.get("/api/v1/users/addresses")
        self.assertEqual(list_addrs.status_code, 200)

        addresses = list_addrs.get_json()["data"]["addresses"]
        self.assertEqual(len(addresses), 1)
        self.assertTrue(addresses[0]["is_default"])

    def test_get_user_addresses_list(self):
        with self.app.app_context():
            user_id = self._create_user(email="list@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "list@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        # Create 2 addresses
        for i in range(2):
            self.client.post(
                "/api/v1/users/addresses",
                json={
                    "label": "Home" if i == 0 else "Office",
                    "full_name": f"User {i}",
                    "phone": f"987654321{i}",
                    "street_line1": f"Street {i}",
                    "city": "Pune",
                    "state": "Maharashtra",
                    "pincode": "411001",
                },
            )

        list_addrs = self.client.get("/api/v1/users/addresses")
        self.assertEqual(list_addrs.status_code, 200)

        addresses = list_addrs.get_json()["data"]["addresses"]
        self.assertEqual(len(addresses), 2)

    def test_update_user_address(self):
        with self.app.app_context():
            user_id = self._create_user(email="update_addr@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "update_addr@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        create = self.client.post(
            "/api/v1/users/addresses",
            json={
                "label": "Home",
                "full_name": "John",
                "phone": "9876543210",
                "street_line1": "Old Street",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
            },
        )
        self.assertEqual(create.status_code, 201)
        addr_id = create.get_json()["data"]["address"]["id"]

        update = self.client.put(
            f"/api/v1/users/addresses/{addr_id}",
            json={
                "full_name": "Jane",
                "street_line1": "New Street",
            },
        )
        self.assertEqual(update.status_code, 200)

        data = update.get_json()["data"]["address"]
        self.assertEqual(data["full_name"], "Jane")
        self.assertEqual(data["street_line1"], "New Street")

    def test_delete_user_address(self):
        with self.app.app_context():
            user_id = self._create_user(email="delete@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "delete@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        create = self.client.post(
            "/api/v1/users/addresses",
            json={
                "label": "Home",
                "full_name": "John",
                "phone": "9876543210",
                "street_line1": "Street",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411001",
            },
        )
        self.assertEqual(create.status_code, 201)
        addr_id = create.get_json()["data"]["address"]["id"]

        delete = self.client.delete(f"/api/v1/users/addresses/{addr_id}")
        self.assertEqual(delete.status_code, 200)

        list_addrs = self.client.get("/api/v1/users/addresses")
        addresses = list_addrs.get_json()["data"]["addresses"]
        self.assertEqual(len(addresses), 0)

    def test_set_default_address(self):
        with self.app.app_context():
            user_id = self._create_user(email="default@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "default@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        # Create 2 addresses
        addr_ids = []
        for i in range(2):
            create = self.client.post(
                "/api/v1/users/addresses",
                json={
                    "label": "Home" if i == 0 else "Office",
                    "full_name": f"User {i}",
                    "phone": f"987654321{i}",
                    "street_line1": f"Street {i}",
                    "city": "Pune",
                    "state": "Maharashtra",
                    "pincode": "411001",
                },
            )
            addr_ids.append(create.get_json()["data"]["address"]["id"])

        # First address is default
        list_addrs = self.client.get("/api/v1/users/addresses")
        addresses = list_addrs.get_json()["data"]["addresses"]
        self.assertTrue(addresses[0]["is_default"])

        # Set second as default
        set_default = self.client.put(f"/api/v1/users/addresses/{addr_ids[1]}/default", json={})
        self.assertEqual(set_default.status_code, 200)

        # Verify second is default
        list_addrs = self.client.get("/api/v1/users/addresses")
        addresses = list_addrs.get_json()["data"]["addresses"]
        default_addr = next((a for a in addresses if a["is_default"]), None)
        self.assertIsNotNone(default_addr)
        self.assertEqual(default_addr["id"], addr_ids[1])

    def test_address_validation_pincode(self):
        with self.app.app_context():
            user_id = self._create_user(email="valid@example.com")

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "valid@example.com", "password": "pass123"},
        )
        self.assertEqual(login.status_code, 200)

        # Invalid pincode (not 6 digits)
        create = self.client.post(
            "/api/v1/users/addresses",
            json={
                "label": "Home",
                "full_name": "John",
                "phone": "9876543210",
                "street_line1": "Street",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "41100",
            },
        )
        self.assertEqual(create.status_code, 400)
        self.assertIn("validation_error", create.get_json()["error"]["code"])


if __name__ == "__main__":
    unittest.main()
