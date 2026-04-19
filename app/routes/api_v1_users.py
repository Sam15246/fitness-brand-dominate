from flask import current_app, request
from flask_login import current_user

from app.models import UserAddress, db
from app.routes.api_v1_common import api_error, api_success


def _serialize_user_profile(user):
    """Serialize user profile data for API response."""
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'full_name': user.full_name,
        'avatar_url': user.avatar_url,
        'email_marketing_opt_in': bool(user.email_marketing_opt_in),
        'created_at': user.created_at.isoformat() + 'Z' if user.created_at else None,
    }


def _serialize_user_address(address):
    """Serialize user address for API response."""
    return {
        'id': address.id,
        'label': address.label,
        'full_name': address.full_name,
        'phone': address.phone,
        'street_line1': address.street_line1,
        'street_line2': address.street_line2,
        'landmark': address.landmark,
        'city': address.city,
        'state': address.state,
        'pincode': address.pincode,
        'is_default': bool(address.is_default),
        'created_at': address.created_at.isoformat() + 'Z' if address.created_at else None,
    }


def register_api_v1_user_routes(api_v1_bp):
    @api_v1_bp.get('/users/profile')
    def get_user_profile():
        """Get authenticated user's profile."""
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        return api_success(data={'user': _serialize_user_profile(current_user)})

    @api_v1_bp.put('/users/profile')
    def update_user_profile():
        """Update authenticated user's profile."""
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        payload = request.get_json(silent=True) or {}

        try:
            # Validate and update name
            if 'name' in payload:
                name = (payload.get('name') or '').strip()
                if not name or len(name) < 2:
                    return api_error('Name must be at least 2 characters', status=400, code='validation_error')
                current_user.name = name

            # Validate and update phone
            if 'phone' in payload:
                phone = (payload.get('phone') or '').strip()
                if phone and not phone.isdigit():
                    return api_error('Phone must contain only digits', status=400, code='validation_error')
                if phone and len(phone) < 6:
                    return api_error('Phone must be at least 6 digits', status=400, code='validation_error')
                current_user.phone = phone if phone else None

            # Update full_name
            if 'full_name' in payload:
                full_name = (payload.get('full_name') or '').strip()
                current_user.full_name = full_name if full_name else None

            # Update email_marketing_opt_in
            if 'email_marketing_opt_in' in payload:
                current_user.email_marketing_opt_in = bool(payload.get('email_marketing_opt_in'))

            db.session.commit()

            return api_success(data={'user': _serialize_user_profile(current_user)})

        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Profile update error: %s', str(exc))
            return api_error('Failed to update profile', status=500, code='server_error')

    @api_v1_bp.get('/users/addresses')
    def get_user_addresses():
        """Get all saved addresses for authenticated user."""
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        addresses = UserAddress.query.filter_by(user_id=current_user.id).order_by(
            UserAddress.is_default.desc(),
            UserAddress.created_at.desc()
        ).all()

        return api_success(data={'addresses': [_serialize_user_address(addr) for addr in addresses]})

    @api_v1_bp.post('/users/addresses')
    def create_user_address():
        """Create a new saved address for authenticated user."""
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        payload = request.get_json(silent=True) or {}

        try:
            # Validate required fields
            full_name = (payload.get('full_name') or '').strip()
            phone = (payload.get('phone') or '').strip()
            street_line1 = (payload.get('street_line1') or '').strip()
            city = (payload.get('city') or '').strip()
            state = (payload.get('state') or '').strip()
            pincode = (payload.get('pincode') or '').strip()
            label = (payload.get('label') or 'Address').strip()

            if not full_name or len(full_name) < 2:
                return api_error('Full name must be at least 2 characters', status=400, code='validation_error')
            if not phone or len(phone) < 6 or not phone.replace(' ', '').isdigit():
                return api_error('Invalid phone number', status=400, code='validation_error')
            if not street_line1 or len(street_line1) < 5:
                return api_error('Street address must be at least 5 characters', status=400, code='validation_error')
            if not city or len(city) < 2:
                return api_error('City must be at least 2 characters', status=400, code='validation_error')
            if not state or len(state) < 2:
                return api_error('State must be at least 2 characters', status=400, code='validation_error')
            if not pincode or len(pincode) != 6 or not pincode.isdigit():
                return api_error('Pincode must be exactly 6 digits', status=400, code='validation_error')

            address = UserAddress(
                user_id=current_user.id,
                label=label,
                full_name=full_name,
                phone=phone,
                street_line1=street_line1,
                street_line2=payload.get('street_line2', '').strip() or None,
                landmark=payload.get('landmark', '').strip() or None,
                city=city,
                state=state,
                pincode=pincode,
                is_default=False,
            )

            # If this is the first address, make it default
            existing_count = UserAddress.query.filter_by(user_id=current_user.id).count()
            if existing_count == 0:
                address.is_default = True

            db.session.add(address)
            db.session.commit()

            return api_success(data={'address': _serialize_user_address(address)}, status=201)

        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Address creation error: %s', str(exc))
            return api_error('Failed to create address', status=500, code='server_error')

    @api_v1_bp.put('/users/addresses/<int:address_id>')
    def update_user_address(address_id):
        """Update a saved address."""
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        address = UserAddress.query.filter_by(id=address_id, user_id=current_user.id).first()
        if not address:
            return api_error('Address not found', status=404, code='not_found')

        payload = request.get_json(silent=True) or {}

        try:
            # Validate and update full_name
            if 'full_name' in payload:
                full_name = (payload.get('full_name') or '').strip()
                if not full_name or len(full_name) < 2:
                    return api_error('Full name must be at least 2 characters', status=400, code='validation_error')
                address.full_name = full_name

            # Validate and update phone
            if 'phone' in payload:
                phone = (payload.get('phone') or '').strip()
                if not phone or len(phone) < 6 or not phone.replace(' ', '').isdigit():
                    return api_error('Invalid phone number', status=400, code='validation_error')
                address.phone = phone

            # Validate and update street_line1
            if 'street_line1' in payload:
                street_line1 = (payload.get('street_line1') or '').strip()
                if not street_line1 or len(street_line1) < 5:
                    return api_error('Street address must be at least 5 characters', status=400, code='validation_error')
                address.street_line1 = street_line1

            # Update optional fields
            if 'street_line2' in payload:
                address.street_line2 = (payload.get('street_line2') or '').strip() or None
            if 'landmark' in payload:
                address.landmark = (payload.get('landmark') or '').strip() or None
            if 'label' in payload:
                label = (payload.get('label') or '').strip()
                if label:
                    address.label = label

            # Validate and update city
            if 'city' in payload:
                city = (payload.get('city') or '').strip()
                if not city or len(city) < 2:
                    return api_error('City must be at least 2 characters', status=400, code='validation_error')
                address.city = city

            # Validate and update state
            if 'state' in payload:
                state = (payload.get('state') or '').strip()
                if not state or len(state) < 2:
                    return api_error('State must be at least 2 characters', status=400, code='validation_error')
                address.state = state

            # Validate and update pincode
            if 'pincode' in payload:
                pincode = (payload.get('pincode') or '').strip()
                if not pincode or len(pincode) != 6 or not pincode.isdigit():
                    return api_error('Pincode must be exactly 6 digits', status=400, code='validation_error')
                address.pincode = pincode

            db.session.commit()

            return api_success(data={'address': _serialize_user_address(address)})

        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Address update error: %s', str(exc))
            return api_error('Failed to update address', status=500, code='server_error')

    @api_v1_bp.delete('/users/addresses/<int:address_id>')
    def delete_user_address(address_id):
        """Delete a saved address."""
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        address = UserAddress.query.filter_by(id=address_id, user_id=current_user.id).first()
        if not address:
            return api_error('Address not found', status=404, code='not_found')

        try:
            was_default = address.is_default
            db.session.delete(address)
            db.session.commit()

            # If deleted address was default, make the first remaining address default
            if was_default:
                remaining = UserAddress.query.filter_by(user_id=current_user.id).first()
                if remaining:
                    remaining.is_default = True
                    db.session.commit()

            return api_success(data={'success': True}, status=200)

        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Address deletion error: %s', str(exc))
            return api_error('Failed to delete address', status=500, code='server_error')

    @api_v1_bp.put('/users/addresses/<int:address_id>/default')
    def set_default_address(address_id):
        """Set an address as the default."""
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        address = UserAddress.query.filter_by(id=address_id, user_id=current_user.id).first()
        if not address:
            return api_error('Address not found', status=404, code='not_found')

        try:
            # Remove default from all other addresses
            UserAddress.query.filter(
                UserAddress.user_id == current_user.id,
                UserAddress.id != address.id
            ).update({'is_default': False}, synchronize_session=False)

            # Set this as default
            address.is_default = True
            db.session.commit()

            return api_success(data={'address': _serialize_user_address(address)})

        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Set default address error: %s', str(exc))
            return api_error('Failed to set default address', status=500, code='server_error')
