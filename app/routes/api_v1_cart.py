from datetime import datetime

from flask import request, session
from flask_login import current_user

from app.models import CartItem, Product, db
from app.routes.api_v1_common import api_error, api_success


def register_api_v1_cart_routes(
    api_v1_bp,
    parse_int,
    get_or_create_default_variant,
    build_cart_payload,
    get_session_cart,
):
    @api_v1_bp.get('/cart')
    def cart_get():
        return api_success(data={'cart': build_cart_payload()})

    @api_v1_bp.post('/cart/add')
    def cart_add():
        payload = request.get_json(silent=True) or {}
        product_id = parse_int(payload.get('product_id'), 0)
        quantity = max(parse_int(payload.get('quantity', 1), 1), 1)
        variant_id = parse_int(payload.get('variant_id'), 0)

        if product_id <= 0:
            return api_error('Valid product_id is required', status=400, code='validation_error')

        product = db.session.get(Product, product_id)
        if not product or not product.is_active:
            return api_error('Product not found', status=404, code='not_found')

        if variant_id > 0:
            from app.models import ProductVariant
            variant = ProductVariant.query.filter_by(
                id=variant_id, product_id=product.id, is_active=True
            ).first()
            if not variant:
                return api_error('Variant not found or inactive', status=404, code='variant_not_found')
        else:
            variant = get_or_create_default_variant(product)
        available_stock = variant.stock_quantity if variant else product.stock_quantity
        if available_stock < 1:
            return api_error('Product is out of stock', status=409, code='out_of_stock')

        if current_user.is_authenticated:
            cart_item = CartItem.query.filter_by(
                user_id=current_user.id,
                product_id=product.id,
                variant_id=variant.id if variant else None,
            ).first()

            next_qty = min(quantity if not cart_item else cart_item.quantity + quantity, available_stock)
            if cart_item:
                cart_item.quantity = next_qty
                cart_item.updated_at = datetime.utcnow()
            else:
                db.session.add(
                    CartItem(
                        user_id=current_user.id,
                        product_id=product.id,
                        variant_id=variant.id if variant else None,
                        quantity=next_qty,
                    )
                )
            db.session.commit()
        else:
            cart = get_session_cart()
            cart_key = f"{product.id}:{variant.id}" if variant else str(product.id)
            current_qty = max(parse_int(cart.get(cart_key, 0), 0), 0)
            cart[cart_key] = min(current_qty + quantity, available_stock)
            session['cart'] = cart
            session.modified = True

        return api_success(data={'cart': build_cart_payload()})

    @api_v1_bp.put('/cart/items/<int:product_id>')
    def cart_update(product_id):
        payload = request.get_json(silent=True) or {}
        quantity = parse_int(payload.get('quantity'), -1)

        if quantity < 0:
            return api_error('Quantity must be zero or greater', status=400, code='validation_error')

        product = db.session.get(Product, product_id)
        if not product or not product.is_active:
            return api_error('Product not found', status=404, code='not_found')

        variant = get_or_create_default_variant(product)
        available_stock = variant.stock_quantity if variant else product.stock_quantity

        if quantity == 0:
            if current_user.is_authenticated:
                CartItem.query.filter_by(user_id=current_user.id, product_id=product_id).delete()
                db.session.commit()
            else:
                cart = get_session_cart()
                cart.pop(str(product_id), None)
                session['cart'] = cart
                session.modified = True
            return api_success(data={'cart': build_cart_payload()})

        next_qty = min(quantity, max(available_stock, 0))
        if next_qty < 1:
            return api_error('Product is out of stock', status=409, code='out_of_stock')

        if current_user.is_authenticated:
            cart_item = CartItem.query.filter_by(
                user_id=current_user.id,
                product_id=product.id,
                variant_id=variant.id if variant else None,
            ).first()

            if cart_item:
                cart_item.quantity = next_qty
                cart_item.updated_at = datetime.utcnow()
            else:
                db.session.add(
                    CartItem(
                        user_id=current_user.id,
                        product_id=product.id,
                        variant_id=variant.id if variant else None,
                        quantity=next_qty,
                    )
                )
            db.session.commit()
        else:
            cart = get_session_cart()
            cart[str(product.id)] = next_qty
            session['cart'] = cart
            session.modified = True

        return api_success(data={'cart': build_cart_payload()})

    @api_v1_bp.delete('/cart/items/<int:product_id>')
    def cart_remove(product_id):
        if current_user.is_authenticated:
            CartItem.query.filter_by(user_id=current_user.id, product_id=product_id).delete()
            db.session.commit()
        else:
            cart = get_session_cart()
            cart.pop(str(product_id), None)
            session['cart'] = cart
            session.modified = True

        return api_success(data={'cart': build_cart_payload()})

    @api_v1_bp.post('/cart/clear')
    def cart_clear():
        if current_user.is_authenticated:
            CartItem.query.filter_by(user_id=current_user.id).delete()
            db.session.commit()
        else:
            session['cart'] = {}
            session.modified = True

        return api_success(data={'cart': build_cart_payload()})
