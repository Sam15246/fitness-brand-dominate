from flask import current_app, request
from flask_login import current_user
from sqlalchemy.orm import selectinload

from app.models import Product, ProductImage, Review, db
from app.routes.api_v1_common import api_error, api_success


def register_api_v1_product_routes(
    api_v1_bp,
    parse_int,
    serialize_product_card,
    serialize_product_image,
    serialize_product_variant,
    serialize_review,
    get_review_eligible_order_items,
    serialize_review_eligible_order_item,
):
    @api_v1_bp.get('/products')
    def products_list():
        page = max(parse_int(request.args.get('page', 1), 1), 1)
        per_page = min(max(parse_int(request.args.get('per_page', 12), 12), 1), 48)
        q = (request.args.get('q') or '').strip()

        query = Product.query.filter_by(is_active=True)
        if q:
            query = query.filter(Product.name.ilike(f'%{q}%'))

        pagination = query.order_by(Product.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )

        products = [serialize_product_card(product) for product in pagination.items]
        return api_success(
            data={'items': products},
            meta={
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev,
                }
            },
        )

    @api_v1_bp.get('/products/<string:slug>')
    def product_detail(slug):
        product = (
            Product.query
            .options(selectinload(Product.variants), selectinload(Product.reviews))
            .filter_by(slug=slug, is_active=True)
            .first()
        )
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        images = ProductImage.get_product_images(product.id)
        approved_reviews = Review.query.filter_by(product_id=product.id, is_approved=True).order_by(Review.created_at.desc()).all()

        payload = serialize_product_card(product)
        payload['images'] = [serialize_product_image(image) for image in images]
        payload['variants'] = [serialize_product_variant(variant) for variant in product.variants if variant.is_active]
        payload['reviews'] = [serialize_review(review) for review in approved_reviews]

        return api_success(data={'product': payload})

    @api_v1_bp.get('/products/id/<int:product_id>')
    def product_detail_by_id(product_id):
        product = (
            Product.query
            .options(selectinload(Product.variants), selectinload(Product.reviews))
            .filter_by(id=product_id, is_active=True)
            .first()
        )
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        images = ProductImage.get_product_images(product.id)
        approved_reviews = Review.query.filter_by(product_id=product.id, is_approved=True).order_by(Review.created_at.desc()).all()

        payload = serialize_product_card(product)
        payload['images'] = [serialize_product_image(image) for image in images]
        payload['variants'] = [serialize_product_variant(variant) for variant in product.variants if variant.is_active]
        payload['reviews'] = [serialize_review(review) for review in approved_reviews]

        return api_success(data={'product': payload})

    @api_v1_bp.get('/products/<string:slug>/review-eligibility')
    def product_review_eligibility(slug):
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        product = Product.query.filter_by(slug=slug, is_active=True).first()
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        delivered_items = get_review_eligible_order_items(current_user.id, product.id, include_reviewed=True)
        eligible_items = get_review_eligible_order_items(current_user.id, product.id, include_reviewed=False)
        submitted_reviews = (
            Review.query
            .filter_by(user_id=current_user.id, product_id=product.id)
            .order_by(Review.created_at.desc())
            .all()
        )

        return api_success(
            data={
                'eligibility': {
                    'has_delivered_purchase': bool(delivered_items),
                    'can_submit_review': bool(eligible_items),
                    'has_pending_review': any(not review.is_approved for review in submitted_reviews),
                    'has_approved_review': any(review.is_approved for review in submitted_reviews),
                    'eligible_order_items': [serialize_review_eligible_order_item(item) for item in eligible_items],
                }
            }
        )

    @api_v1_bp.post('/products/<string:slug>/reviews')
    def submit_product_review(slug):
        if not current_user.is_authenticated:
            return api_error('Authentication required', status=401, code='unauthorized')

        product = Product.query.filter_by(slug=slug, is_active=True).first()
        if not product:
            return api_error('Product not found', status=404, code='not_found')

        eligible_items = get_review_eligible_order_items(current_user.id, product.id, include_reviewed=False)
        if not eligible_items:
            return api_error(
                'Only customers with a delivered order can submit a review for this product.',
                status=403,
                code='forbidden',
            )

        payload = request.get_json(silent=True) or {}
        selected_order_item_id = parse_int(payload.get('order_item_id'), 0)
        rating = parse_int(payload.get('rating'), 0)
        title = (payload.get('title') or '').strip()
        comment = (payload.get('comment') or '').strip()

        eligible_by_id = {item.id: item for item in eligible_items}
        if selected_order_item_id <= 0 and len(eligible_items) == 1:
            selected_order_item_id = eligible_items[0].id

        selected_order_item = eligible_by_id.get(selected_order_item_id)
        if not selected_order_item:
            return api_error('Select a valid delivered purchase before submitting your review.', status=400, code='validation_error')

        if rating < 1 or rating > 5:
            return api_error('Please select a rating between 1 and 5 stars.', status=400, code='validation_error')

        if title and len(title) < 3:
            return api_error('Review title must be at least 3 characters long.', status=400, code='validation_error')

        if len(comment) < 10:
            return api_error('Review comment must be at least 10 characters long.', status=400, code='validation_error')

        if Review.query.filter_by(order_item_id=selected_order_item.id).first():
            return api_error('A review has already been submitted for this delivered purchase.', status=409, code='duplicate_review')

        try:
            review = Review(
                product_id=product.id,
                user_id=current_user.id,
                order_item_id=selected_order_item.id,
                name=current_user.name,
                role='Verified Buyer',
                rating=rating,
                title=title or None,
                comment=comment,
                is_approved=False,
            )
            db.session.add(review)
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            current_app.logger.error('Review submission error for product %s: %s', product.id, str(exc))
            return api_error('We could not submit your review right now. Please try again.', status=500, code='server_error')

        return api_success(data={'message': 'Your review has been submitted. It will appear after approval.'}, status=201)
