import unittest
import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import TestingConfig
from app import create_app
from app.models import User, UserRole, db


class ApiV1AuthTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _create_user(self, email="user@example.com", password="pass123", name="Test User"):
        with self.app.app_context():
            user = User(
                name=name,
                email=email,
                role=UserRole.USER.value,
                is_active=True,
                auth_provider="local",
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            return user

    def test_health_endpoint(self):
        response = self.client.get("/api/v1/health")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["version"], "v1")

    def test_register_login_me_logout_flow(self):
        register_response = self.client.post(
            "/api/v1/auth/register",
            json={
                "name": "New User",
                "email": "new@example.com",
                "password": "pass123",
            },
        )
        self.assertEqual(register_response.status_code, 201)

        me_after_register = self.client.get("/api/v1/auth/me")
        self.assertEqual(me_after_register.status_code, 200)

        logout_response = self.client.post("/api/v1/auth/logout")
        self.assertEqual(logout_response.status_code, 200)

        me_after_logout = self.client.get("/api/v1/auth/me")
        self.assertEqual(me_after_logout.status_code, 401)

        login_response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "new@example.com",
                "password": "pass123",
            },
        )
        self.assertEqual(login_response.status_code, 200)

        me_after_login = self.client.get("/api/v1/auth/me")
        self.assertEqual(me_after_login.status_code, 200)
        self.assertEqual(me_after_login.get_json()["data"]["user"]["email"], "new@example.com")

    def test_forgot_password_non_enumeration(self):
        self._create_user(email="exists@example.com")

        existing_response = self.client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "exists@example.com"},
        )
        missing_response = self.client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "missing@example.com"},
        )

        self.assertEqual(existing_response.status_code, 200)
        self.assertEqual(missing_response.status_code, 200)

        existing_message = existing_response.get_json()["data"]["message"]
        missing_message = missing_response.get_json()["data"]["message"]
        self.assertEqual(existing_message, missing_message)

    def test_reset_password_with_valid_token(self):
        with self.app.app_context():
            user = User(
                name="Reset User",
                email="reset@example.com",
                role=UserRole.USER.value,
                is_active=True,
                auth_provider="local",
            )
            user.set_password("oldpass1")
            db.session.add(user)
            db.session.commit()
            token = user.generate_reset_token()

        reset_response = self.client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "password": "newpass1",
                "confirm_password": "newpass1",
            },
        )
        self.assertEqual(reset_response.status_code, 200)

        login_old = self.client.post(
            "/api/v1/auth/login",
            json={"email": "reset@example.com", "password": "oldpass1"},
        )
        self.assertEqual(login_old.status_code, 401)

        login_new = self.client.post(
            "/api/v1/auth/login",
            json={"email": "reset@example.com", "password": "newpass1"},
        )
        self.assertEqual(login_new.status_code, 200)

    @patch("app.routes.api_v1_auth.id_token.verify_oauth2_token")
    def test_google_sign_in_links_existing_user(self, mock_verify):
        self._create_user(email="google@example.com", password="pass123", name="Google Local")
        self.app.config["GOOGLE_CLIENT_ID"] = "test-google-client-id"

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email_verified": True,
            "email": "google@example.com",
            "sub": "google-user-123",
            "name": "Google User",
            "picture": "https://example.com/avatar.png",
        }

        response = self.client.post(
            "/api/v1/auth/google",
            json={"credential": "fake-google-credential"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()["data"]["user"]
        self.assertEqual(payload["email"], "google@example.com")
        self.assertEqual(payload["auth_provider"], "google")

        me_response = self.client.get("/api/v1/auth/me")
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.get_json()["data"]["user"]["email"], "google@example.com")


if __name__ == "__main__":
    unittest.main()
