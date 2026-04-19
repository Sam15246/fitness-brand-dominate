from flask import current_app
from flask_login import current_user

from app.models import AffiliateProfile, CommissionStatus, Order, PolicyPage
from app.routes.api_v1_common import api_error, api_success


def register_api_v1_affiliate_content_routes(
    api_v1_bp,
    serialize_order,
    serialize_admin_affiliate,
    serialize_policy_page,
):
    @api_v1_bp.get('/content/policies/<string:slug>')
    def get_policy_page(slug):
        normalized_slug = (slug or '').strip().lower()
        if normalized_slug not in {'shipping', 'returns', 'terms', 'privacy'}:
            return api_error('Policy not found', status=404, code='not_found')

        policy = PolicyPage.query.filter_by(slug=normalized_slug).first()
        if not policy:
            return api_error('Policy not found', status=404, code='not_found')

        return api_success(data={'policy': serialize_policy_page(policy)})

    @api_v1_bp.get('/content/contact')
    def get_contact_info():
        return api_success(
            data={
                'whatsapp_number': current_app.config.get('WHATSAPP_NUMBER', ''),
                'brand_name': 'DOMINATE',
                'tagline': 'Train anywhere. Dominate everywhere.',
            }
        )

    @api_v1_bp.get('/affiliate/dashboard')
    def affiliate_dashboard():
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        profile = AffiliateProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            return api_error('Affiliate profile not found', status=404, code='not_found')

        recent_orders = Order.query.filter_by(affiliate_id=current_user.id).order_by(Order.created_at.desc()).limit(10).all()
        total_orders = Order.query.filter_by(affiliate_id=current_user.id).count()
        pending_commissions = Order.query.filter_by(
            affiliate_id=current_user.id,
            commission_status=CommissionStatus.PENDING.value,
        ).count()
        approved_commissions = Order.query.filter_by(
            affiliate_id=current_user.id,
            commission_status=CommissionStatus.APPROVED.value,
        ).count()

        return api_success(
            data={
                'profile': serialize_admin_affiliate(profile),
                'stats': {
                    'total_orders': total_orders,
                    'pending_commissions': pending_commissions,
                    'approved_commissions': approved_commissions,
                    'total_redeemed': profile.total_redeemed,
                    'total_redeemed_display': profile.get_total_redeemed_display(),
                },
                'recent_orders': [serialize_order(order) for order in recent_orders],
            }
        )