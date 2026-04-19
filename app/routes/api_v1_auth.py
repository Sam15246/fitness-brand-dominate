from datetime import datetime
from urllib.parse import urlencode

from flask import current_app, request, url_for
from flask_login import current_user, login_user, logout_user
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.models import User, UserRole, db
from app.routes.api_v1_common import api_error, api_success, serialize_current_user


def register_api_v1_auth_routes(api_v1_bp, merge_session_cart_into_db):
    @api_v1_bp.get('/auth/me')
    def auth_me():
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')
        return api_success(data={'user': serialize_current_user(current_user)})

    @api_v1_bp.post('/auth/login')
    def auth_login():
        payload = request.get_json(silent=True) or {}
        email = (payload.get('email') or '').strip().lower()
        password = payload.get('password') or ''
        remember = bool(payload.get('remember', False))

        if not email or not password:
            return api_error('Email and password are required', status=400, code='validation_error')

        user = User.query.filter_by(email=email).first()
        if user is None or not user.can_login_with_password() or not user.check_password(password):
            return api_error('Invalid email or password', status=401, code='invalid_credentials')

        if not user.is_active:
            return api_error('Your account has been deactivated', status=403, code='account_inactive')

        login_user(user, remember=remember)
        merge_session_cart_into_db(user)
        return api_success(data={'user': serialize_current_user(user)})

    @api_v1_bp.post('/auth/google')
    def auth_google_login():
        payload = request.get_json(silent=True) or {}
        credential = (payload.get('credential') or '').strip()

        if not credential:
            return api_error('Missing Google credential', status=400, code='validation_error')

        google_client_id = (current_app.config.get('GOOGLE_CLIENT_ID') or '').strip()
        if not google_client_id:
            return api_error('Google sign-in is not configured yet', status=503, code='service_unavailable')

        try:
            token_info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                google_client_id,
            )
        except Exception:
            return api_error('Google token verification failed', status=401, code='invalid_credentials')

        issuer = token_info.get('iss')
        if issuer not in ('accounts.google.com', 'https://accounts.google.com'):
            return api_error('Invalid Google token issuer', status=401, code='invalid_credentials')

        if not token_info.get('email_verified', False):
            return api_error('Google email is not verified', status=401, code='invalid_credentials')

        email = (token_info.get('email') or '').strip().lower()
        provider_id = (token_info.get('sub') or '').strip()
        full_name = (token_info.get('name') or '').strip()
        avatar_url = (token_info.get('picture') or '').strip() or None

        if not email or not provider_id:
            return api_error('Google profile data is incomplete', status=400, code='validation_error')

        user = User.query.filter_by(auth_provider='google', auth_provider_id=provider_id).first()

        if not user:
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                if existing_user.auth_provider not in ('local', 'google'):
                    return api_error(
                        'This email is linked to another sign-in method. Please use that provider.',
                        status=409,
                        code='provider_conflict',
                    )

                if (
                    existing_user.auth_provider == 'google'
                    and existing_user.auth_provider_id
                    and existing_user.auth_provider_id != provider_id
                ):
                    return api_error(
                        'This Google account is already linked differently. Please contact support.',
                        status=409,
                        code='provider_conflict',
                    )

                existing_user.auth_provider = 'google'
                existing_user.auth_provider_id = provider_id
                existing_user.full_name = full_name or existing_user.full_name
                existing_user.avatar_url = avatar_url or existing_user.avatar_url
                if full_name and not existing_user.name:
                    existing_user.name = full_name
                user = existing_user
            else:
                display_name = full_name or email.split('@')[0]
                user = User(
                    name=display_name,
                    full_name=full_name or display_name,
                    email=email,
                    password_hash=None,
                    role=UserRole.USER.value,
                    is_active=True,
                    auth_provider='google',
                    auth_provider_id=provider_id,
                    avatar_url=avatar_url,
                    created_at=datetime.utcnow(),
                )
                db.session.add(user)

        if not user.is_active:
            return api_error('Your account has been deactivated', status=403, code='account_inactive')

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            current_app.logger.exception('Google sign-in DB commit failed')
            return api_error('Could not complete sign-in. Please try again.', status=500, code='server_error')

        login_user(user, remember=True)
        merge_session_cart_into_db(user)
        return api_success(data={'user': serialize_current_user(user)})

    @api_v1_bp.post('/auth/logout')
    def auth_logout():
        if current_user.is_authenticated:
            logout_user()
        return api_success(data={'logged_out': True})

    @api_v1_bp.post('/auth/register')
    def auth_register():
        payload = request.get_json(silent=True) or {}
        name = (payload.get('name') or '').strip()
        email = (payload.get('email') or '').strip().lower()
        password = payload.get('password') or ''

        if len(name) < 3:
            return api_error('Name must be at least 3 characters long', status=400, code='validation_error')

        if '@' not in email or len(email) < 5:
            return api_error('Please provide a valid email', status=400, code='validation_error')

        if len(password) < 6:
            return api_error('Password must be at least 6 characters long', status=400, code='validation_error')

        if User.query.filter_by(email=email).first():
            return api_error('Email is already registered', status=409, code='email_exists')

        user = User(
            name=name,
            email=email,
            role=UserRole.USER.value,
            is_active=True,
            auth_provider='local',
        )

        try:
            user.set_password(password)
        except ValueError as exc:
            return api_error(str(exc), status=400, code='validation_error')

        db.session.add(user)
        db.session.commit()
        login_user(user)
        merge_session_cart_into_db(user)

        return api_success(data={'user': serialize_current_user(user)}, status=201)

    @api_v1_bp.post('/auth/forgot-password')
    def auth_forgot_password():
        payload = request.get_json(silent=True) or {}
        email = (payload.get('email') or '').strip().lower()

        if not email or '@' not in email:
            return api_error('Please provide a valid email address', status=400, code='validation_error')

        user = User.query.filter_by(email=email).first()

        # Do not reveal whether the email exists (prevents user enumeration).
        if user and user.is_active and user.can_login_with_password():
            try:
                token = user.generate_reset_token()
                from app.utils.email import send_password_reset_email

                send_result = send_password_reset_email(user.email, token)
                if not send_result.get('success'):
                    current_app.logger.error(
                        'Password reset email send failed for %s: %s',
                        user.email,
                        send_result.get('message', 'unknown error'),
                    )

                # Helpful in development to unblock local testing.
                if current_app.debug:
                    frontend_base_url = (current_app.config.get('FRONTEND_BASE_URL') or '').rstrip('/')
                    if frontend_base_url:
                        reset_url = f"{frontend_base_url}/auth/reset-password/{token}"
                    else:
                        query = urlencode({'token': token})
                        reset_url = url_for('api_v1.auth_reset_password', _external=True) + f"?{query}"
                    if not current_app.config.get('TESTING', False):
                        current_app.logger.info('DEV password reset URL for %s: %s', user.email, reset_url)

            except Exception as exc:
                current_app.logger.error('Password reset request failed for %s: %s', email, str(exc))

        return api_success(
            data={
                'message': 'If an account exists with that email, a reset link will be sent shortly.'
            }
        )

    @api_v1_bp.post('/auth/reset-password')
    def auth_reset_password():
        payload = request.get_json(silent=True) or {}
        token = (payload.get('token') or '').strip()
        password = payload.get('password') or ''
        confirm_password = payload.get('confirm_password') or ''

        if not token:
            return api_error('Reset token is required', status=400, code='validation_error')

        if len(password) < 6:
            return api_error('Password must be at least 6 characters long', status=400, code='validation_error')

        if password != confirm_password:
            return api_error('Passwords do not match', status=400, code='validation_error')

        user = User.verify_reset_token(token)
        if not user:
            return api_error('Invalid or expired password reset token', status=400, code='invalid_token')

        if not user.can_login_with_password():
            return api_error('This account uses social sign-in. Use your provider to sign in.', status=409, code='social_account')

        try:
            user.set_password(password)
            user.clear_reset_token()
        except ValueError as exc:
            return api_error(str(exc), status=400, code='validation_error')
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Password reset commit failed for user %s: %s', user.email, str(exc))
            return api_error('Could not reset password. Please try again.', status=500, code='server_error')

        return api_success(data={'message': 'Password reset successful. You can now log in.'})
