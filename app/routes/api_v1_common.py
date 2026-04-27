from datetime import datetime

from flask import jsonify


def api_success(data=None, meta=None, status=200):
    """Return a standardized success envelope for SPA/API clients."""
    payload = {
        'success': True,
        'data': data if data is not None else {},
        'error': None,
        'meta': {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
    }
    if meta:
        payload['meta'].update(meta)
    return jsonify(payload), status


def api_error(message, status=400, code=None, meta=None):
    """Return a standardized error envelope for SPA/API clients."""
    payload = {
        'success': False,
        'data': {},
        'error': {
            'message': message,
            'code': code or 'bad_request',
        },
        'meta': {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
    }
    if meta:
        payload['meta'].update(meta)
    return jsonify(payload), status


def serialize_current_user(user):
    from app.models import AffiliateProfile
    affiliate = AffiliateProfile.query.filter_by(user_id=user.id, is_active=True).first()
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'role': user.role,
        'is_active': bool(user.is_active),
        'auth_provider': user.auth_provider,
        'avatar_url': user.avatar_url,
        'full_name': user.full_name,
        'is_affiliate': affiliate is not None,
        'created_at': user.created_at.isoformat() + 'Z' if user.created_at else None,
        'updated_at': user.updated_at.isoformat() + 'Z' if user.updated_at else None,
    }
