# Critical & Warning Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and warning issues identified in the full-stack audit — backend security/resilience and frontend UX/reliability.

**Architecture:** Backend fixes are independent Flask changes (CORS, rate limiting, order state machine, query optimization, validation hardening). Frontend fixes add variant selection with card UI, dual-mode checkout (backend-first with WhatsApp fallback), error boundaries, loading states, request timeouts, and accessibility. The cart/checkout flow changes span both stacks — the backend cart endpoint must accept an optional `variant_id`, and the frontend must send it.

**Tech Stack:** Flask 2.3, Flask-CORS, Flask-Limiter, SQLAlchemy (eager loading), Next.js 16, React 19, TypeScript, Tailwind CSS

---

## File Map

### Backend — new/modified files
| File | Responsibility |
|------|---------------|
| `requirements.txt` | Add flask-cors, flask-limiter |
| `app/__init__.py` | CORS init, Limiter init, attach to app |
| `config.py` | Add CORS_ORIGINS, RATELIMIT settings, statement timeout |
| `app/security.py` | Password max-length validation |
| `app/routes/api_v1_auth.py` | Rate-limit decorators on login/register/forgot-password |
| `app/routes/api_v1_admin.py:119-138` | Order status transition validation |
| `app/routes/api_v1_cart.py` | Accept optional `variant_id` in cart/add |
| `app/routes/api_v1.py` | Update `_get_or_create_default_variant` call sites, build_cart_payload for variant_id |
| `app/models.py` | `confirm_order()` race condition fix, coupon discount cap |
| `app/business_logic.py:136-159` | Log actual exceptions instead of swallowing |

### Frontend — new/modified files
| File | Responsibility |
|------|---------------|
| `frontend/.env.local` | Add `NEXT_PUBLIC_WHATSAPP_NUMBER` |
| `frontend/src/lib/api.ts` | Add request timeout, improve Zod error context, add `variant_id` to `addToCart` |
| `frontend/src/lib/whatsapp.ts` | **New** — client-side WhatsApp message builder |
| `frontend/src/components/cart/AddToCartButton.tsx` | Accept `variants` prop, render card-style selector, send `variant_id` |
| `frontend/src/app/(storefront)/products/[slug]/page.tsx` | Pass variants to AddToCartButton, remove old read-only variant list |
| `frontend/src/app/(storefront)/checkout/CheckoutClient.tsx` | Dual-mode checkout: try API, fallback to WhatsApp-only |
| `frontend/src/app/admin/error.tsx` | **New** — error boundary |
| `frontend/src/app/account/error.tsx` | **New** — error boundary |
| `frontend/src/app/affiliate/error.tsx` | **New** — error boundary |
| `frontend/src/app/(storefront)/order/error.tsx` | **New** — error boundary |
| `frontend/src/app/admin/loading.tsx` | **New** — loading skeleton |
| `frontend/src/app/account/loading.tsx` | **New** — loading skeleton |
| `frontend/src/app/affiliate/loading.tsx` | **New** — loading skeleton |
| `frontend/src/components/auth/GoogleSignInButton.tsx` | Fix script cleanup memory leak |
| `frontend/src/components/ui/Modal.tsx` | Add role="dialog", aria-labelledby |
| `frontend/src/app/about/page.tsx` | Add metadata export |
| `frontend/src/app/contact/page.tsx` | Add metadata export |

---

## Task 1: Backend — Add CORS and Rate Limiting Dependencies

**Files:**
- Modify: `requirements.txt`
- Modify: `config.py`

- [ ] **Step 1: Add dependencies to requirements.txt**

```
Flask-Cors==4.0.0
Flask-Limiter==3.5.0
```

Append these two lines after the existing `requests==2.32.3` line in `requirements.txt`.

- [ ] **Step 2: Add config values to Config class in config.py**

In `config.py`, inside the `Config` class, after line 63 (`INSTAGRAM_URL = ...`), add:

```python
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

    # Rate Limiting
    RATELIMIT_STORAGE_URI = os.getenv('RATELIMIT_STORAGE_URI', 'memory://')
    RATELIMIT_DEFAULT = '200/hour'
```

- [ ] **Step 3: Add statement timeout to ProductionConfig engine options**

In `config.py`, inside `ProductionConfig.SQLALCHEMY_ENGINE_OPTIONS` (line 227-233), add the `connect_args` key:

```python
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv('SQLALCHEMY_POOL_SIZE', '15')),
        "max_overflow": int(os.getenv('SQLALCHEMY_MAX_OVERFLOW', '20')),
        "pool_timeout": int(os.getenv('SQLALCHEMY_POOL_TIMEOUT', '30')),
        "pool_recycle": int(os.getenv('SQLALCHEMY_POOL_RECYCLE', '3600')),
        "connect_args": {"options": "-c statement_timeout=10000"},
    }
```

This sets a 10-second statement timeout on PostgreSQL queries.

- [ ] **Step 4: Install dependencies**

Run: `pip install flask-cors==4.0.0 flask-limiter==3.5.0`

- [ ] **Step 5: Commit**

```bash
git add requirements.txt config.py
git commit -m "chore: add flask-cors, flask-limiter deps and config values"
```

---

## Task 2: Backend — Wire CORS and Rate Limiter into App Factory

**Files:**
- Modify: `app/__init__.py`

- [ ] **Step 1: Add CORS and Limiter imports and initialization**

At the top of `app/__init__.py`, change the imports to:

```python
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_mail import Mail
from config import get_config
from app.models import db, User
```

- [ ] **Step 2: Initialize CORS and Limiter in create_app**

After `mail.init_app(app)` (line 58), add:

```python
    # Initialize CORS
    CORS(app,
         origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
         supports_credentials=True,
         allow_headers=['Content-Type', 'Accept'],
         expose_headers=['Content-Type'])

    # Initialize rate limiter
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        storage_uri=app.config.get('RATELIMIT_STORAGE_URI', 'memory://'),
        default_limits=[app.config.get('RATELIMIT_DEFAULT', '200/hour')],
    )
    app.limiter = limiter
```

- [ ] **Step 3: Verify app starts**

Run: `cd "c:/Dev/fitness brand" && python -c "from app import create_app; app = create_app(); print('OK')"`

Expected: `OK` — no import errors.

- [ ] **Step 4: Commit**

```bash
git add app/__init__.py
git commit -m "feat: wire CORS and rate limiter into app factory"
```

---

## Task 3: Backend — Rate-Limit Auth Endpoints

**Files:**
- Modify: `app/routes/api_v1_auth.py`
- Modify: `app/routes/api_v1.py` (pass limiter to register function)

- [ ] **Step 1: Update auth route registration to accept limiter**

In `app/routes/api_v1_auth.py`, change the function signature from:

```python
def register_api_v1_auth_routes(api_v1_bp, merge_session_cart):
```

to:

```python
def register_api_v1_auth_routes(api_v1_bp, merge_session_cart, limiter=None):
```

- [ ] **Step 2: Add rate-limit decorators to login, register, and forgot-password**

Inside `register_api_v1_auth_routes`, add the rate-limit decorator to each sensitive endpoint. For each of these three route functions, add the decorator right after `@api_v1_bp.post(...)`:

For login:
```python
    @api_v1_bp.post('/auth/login')
    @limiter.limit('10 per 15 minutes') if limiter else lambda f: f
    def auth_login():
```

Since conditional decorators are awkward, use a helper instead. At the top of the function body of `register_api_v1_auth_routes`, add:

```python
    def rate_limit(limit_string):
        """Apply rate limit if limiter is available."""
        if limiter:
            return limiter.limit(limit_string)
        return lambda f: f
```

Then decorate:
- `auth_login` with `@rate_limit('10 per 15 minutes')`
- `auth_register` with `@rate_limit('5 per hour')`
- `auth_forgot_password` with `@rate_limit('3 per hour')`

Example for login:
```python
    @api_v1_bp.post('/auth/login')
    @rate_limit('10 per 15 minutes')
    def auth_login():
        ...
```

- [ ] **Step 3: Pass limiter from api_v1.py**

In `app/routes/api_v1.py`, at line 545 where `register_api_v1_auth_routes` is called:

```python
register_api_v1_auth_routes(api_v1_bp, _merge_session_cart_into_db, current_app.limiter if hasattr(current_app, 'limiter') else None)
```

Wait — this runs at import/blueprint-registration time, not inside a request context. We need to store the limiter differently.

Instead, in `app/routes/api_v1.py`, after the blueprint is created, retrieve the limiter from the app when it's available. The simplest approach: pass it from `__init__.py`.

In `app/__init__.py`, after creating the limiter, change the blueprint import/register block:

```python
    from app.routes.api_v1 import create_api_v1_bp
    api_v1_bp = create_api_v1_bp(limiter)
    app.register_blueprint(api_v1_bp, url_prefix='/api/v1')
```

Then in `app/routes/api_v1.py`, wrap the entire module in a factory function:

Actually, this requires significant refactoring. Simpler approach — use `current_app` extension pattern:

In `app/__init__.py`, store limiter in app extensions:
```python
    app.extensions['limiter'] = limiter
```

In `app/routes/api_v1_auth.py`, retrieve it inside each route handler:

Actually, the simplest approach that avoids restructuring: Flask-Limiter decorators can be applied directly in `__init__.py` after blueprint registration. But that's messy too.

**Cleanest minimal approach:** Create the limiter as a module-level object in `app/__init__.py` and import it in auth routes.

Change `app/__init__.py`:
```python
# Module-level limiter (configured in create_app)
limiter = Limiter(key_func=get_remote_address)
```

Move this to module level (before `create_app`), alongside `mail = Mail()`. Then inside `create_app`:
```python
    limiter.init_app(app)
```

Then in `app/routes/api_v1_auth.py`:
```python
from app import limiter
```

And decorate directly:
```python
    @api_v1_bp.post('/auth/login')
    @limiter.limit('10 per 15 minutes')
    def auth_login():
```

- [ ] **Step 4: Implement the clean approach**

In `app/__init__.py`, at module level (line 9, alongside `mail = Mail()`):

```python
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

mail = Mail()
limiter = Limiter(key_func=get_remote_address)
```

Inside `create_app`, replace the CORS/Limiter block with:

```python
    # Initialize CORS
    CORS(app,
         origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
         supports_credentials=True,
         allow_headers=['Content-Type', 'Accept'],
         expose_headers=['Content-Type'])

    # Initialize rate limiter
    limiter.init_app(app)
```

In `app/routes/api_v1_auth.py`, add import at top:
```python
from app import limiter
```

Decorate the three endpoints:
```python
    @api_v1_bp.post('/auth/login')
    @limiter.limit('10 per 15 minutes')
    def auth_login():
        ...

    @api_v1_bp.post('/auth/register')
    @limiter.limit('5 per hour')
    def auth_register():
        ...

    @api_v1_bp.post('/auth/forgot-password')
    @limiter.limit('3 per hour')
    def auth_forgot_password():
        ...
```

No changes needed to `register_api_v1_auth_routes` signature.

- [ ] **Step 5: Verify app starts**

Run: `cd "c:/Dev/fitness brand" && python -c "from app import create_app; app = create_app(); print('OK')"`

- [ ] **Step 6: Commit**

```bash
git add app/__init__.py app/routes/api_v1_auth.py
git commit -m "feat: rate-limit login, register, and forgot-password endpoints"
```

---

## Task 4: Backend — Order Status Transition Validation

**Files:**
- Modify: `app/routes/api_v1_admin.py:119-138`

- [ ] **Step 1: Add valid transitions map and validation**

In `app/routes/api_v1_admin.py`, in the `admin_update_order_status` function (around line 119-138), replace the block that sets `order.status` with transition validation:

Find this code:
```python
        status_value = (payload.get('status') or '').strip().lower()
        valid_statuses = {value.value for value in OrderStatus}
        if status_value not in valid_statuses:
            return api_error('Invalid order status', status=400, code='validation_error')

        order.status = status_value
        db.session.commit()
```

Replace with:
```python
        status_value = (payload.get('status') or '').strip().lower()
        valid_statuses = {value.value for value in OrderStatus}
        if status_value not in valid_statuses:
            return api_error('Invalid order status', status=400, code='validation_error')

        VALID_TRANSITIONS = {
            'pending': {'confirmed', 'cancelled'},
            'confirmed': {'shipped', 'cancelled'},
            'shipped': {'delivered', 'cancelled'},
            'delivered': set(),
            'cancelled': set(),
        }

        allowed = VALID_TRANSITIONS.get(order.status, set())
        if status_value not in allowed:
            return api_error(
                f'Cannot transition from {order.status} to {status_value}',
                status=400,
                code='invalid_transition',
            )

        order.status = status_value
        db.session.commit()
```

- [ ] **Step 2: Commit**

```bash
git add app/routes/api_v1_admin.py
git commit -m "fix: validate order status transitions (no DELIVERED->PENDING etc.)"
```

---

## Task 5: Backend — Fix Order Confirmation Race Condition and Coupon Cap

**Files:**
- Modify: `app/models.py` — `confirm_order()` method and coupon logic

- [ ] **Step 1: Lock the order row before confirming**

In `app/models.py`, in the `confirm_order()` method (line 1464), after the status check on line 1485-1486, add order-level locking:

Replace:
```python
        if self.status == OrderStatus.CONFIRMED.value:
            return False  # Already confirmed
        
        try:
            order_item_product_ids = [item.product_id for item in self.items]
```

With:
```python
        if self.status == OrderStatus.CONFIRMED.value:
            return False  # Already confirmed
        
        try:
            # Lock this order row to prevent double-confirmation
            locked_order = db.session.execute(
                db.select(Order).where(Order.id == self.id).with_for_update()
            ).scalar_one_or_none()
            if not locked_order or locked_order.status == OrderStatus.CONFIRMED.value:
                return False

            order_item_product_ids = [item.product_id for item in self.items]
```

- [ ] **Step 2: Cap coupon discount to never exceed subtotal**

In the same method, find the discount application block (around line 1512):

```python
            if self.coupon_id and self.applied_discount > 0:
                self.discount_amount = self.applied_discount
```

Replace with:
```python
            if self.coupon_id and self.applied_discount > 0:
                self.discount_amount = min(self.applied_discount, self.subtotal_amount)
```

- [ ] **Step 3: Also cap in resolve_coupon**

In `app/routes/api_v1.py`, find `_resolve_coupon` (around line 364). After `discount = coupon.calculate_discount(cart_total)`, add the cap:

```python
    discount = coupon.calculate_discount(cart_total)
    discount = min(discount, cart_total)  # Never exceed cart total
```

- [ ] **Step 4: Commit**

```bash
git add app/models.py app/routes/api_v1.py
git commit -m "fix: lock order row on confirm, cap coupon discount to subtotal"
```

---

## Task 6: Backend — N+1 Query Fix, Silent Error Fix, Password Max Length

**Files:**
- Modify: `app/routes/api_v1_products.py` — eager loading
- Modify: `app/business_logic.py:136-159` — log exceptions
- Modify: `app/security.py` — password max length



- [ ] **Step 2: Fix silent exception swallowing in business_logic.py**

In `app/business_logic.py`, in `StockManager.adjust_stock` (around line 136-159), replace:

```python
        except Exception:
            db.session.rollback()
            return False, 'Failed to adjust stock'
```

With:

```python
        except Exception as exc:
            db.session.rollback()
            from flask import current_app
            current_app.logger.error(f'Stock adjustment failed for product {product_id}: {exc}')
            return False, f'Failed to adjust stock: {type(exc).__name__}'
```

- [ ] **Step 3: Add password max length to security.py**

In `app/security.py`, in `validate_password_strength` (line 15-53), after the min-length check (line 41-42), add:

```python
    # Maximum length (prevent DoS with huge passwords)
    if len(password) > 128:
        return False, 'Password cannot exceed 128 characters'
```

- [ ] **Step 4: Commit**

```bash
git add app/routes/api_v1_products.py app/business_logic.py app/security.py
git commit -m "fix: eager-load product relations, log stock errors, cap password length"
```

---

## Task 7: Backend — Cart Accepts variant_id

**Files:**
- Modify: `app/routes/api_v1_cart.py` — accept optional `variant_id`
- Modify: `app/routes/api_v1.py` — update session cart to store variant_id

- [ ] **Step 1: Update cart_add to accept variant_id**

In `app/routes/api_v1_cart.py`, in `cart_add()` (line 21), after parsing `product_id` and `quantity`, add:

```python
        variant_id = parse_int(payload.get('variant_id'), 0)
```

Then replace the variant resolution block:

```python
        variant = get_or_create_default_variant(product)
```

With:

```python
        if variant_id > 0:
            from app.models import ProductVariant
            variant = ProductVariant.query.filter_by(
                id=variant_id, product_id=product.id, is_active=True
            ).first()
            if not variant:
                return api_error('Variant not found or inactive', status=404, code='variant_not_found')
        else:
            variant = get_or_create_default_variant(product)
```

- [ ] **Step 2: Update session cart to include variant_id as composite key**

In `app/routes/api_v1.py`, the session cart currently stores `{product_id: quantity}`. For variant support, change the key to `"{product_id}:{variant_id}"`.

In `_build_cart_payload` (around line 270), update the session-cart branch to parse the composite key:

Replace:
```python
        cart = _get_session_cart()
        for product_id_str, quantity in cart.items():
            product_id = _parse_int(product_id_str, 0)
```

With:
```python
        cart = _get_session_cart()
        for key, quantity in cart.items():
            parts = str(key).split(':')
            product_id = _parse_int(parts[0], 0)
            variant_id_from_cart = _parse_int(parts[1] if len(parts) > 1 else '0', 0)
```

Then replace the variant resolution:
```python
            variant = _get_or_create_default_variant(product)
```
With:
```python
            if variant_id_from_cart > 0:
                variant = ProductVariant.query.filter_by(
                    id=variant_id_from_cart, product_id=product.id, is_active=True
                ).first()
                if not variant:
                    variant = _get_or_create_default_variant(product)
            else:
                variant = _get_or_create_default_variant(product)
```

In `cart_add` in `api_v1_cart.py`, update the session cart storage (the `else` branch for anonymous users, around line 61-65):

Replace:
```python
            cart = get_session_cart()
            current_qty = max(parse_int(cart.get(str(product.id), 0), 0), 0)
            cart[str(product.id)] = min(current_qty + quantity, available_stock)
```

With:
```python
            cart = get_session_cart()
            cart_key = f"{product.id}:{variant.id}" if variant else str(product.id)
            current_qty = max(parse_int(cart.get(cart_key, 0), 0), 0)
            cart[cart_key] = min(current_qty + quantity, available_stock)
```

- [ ] **Step 3: Commit**

```bash
git add app/routes/api_v1_cart.py app/routes/api_v1.py
git commit -m "feat: cart accepts variant_id, session cart uses composite key"
```

---

## Task 8: Frontend — Add Request Timeouts and Improve Zod Errors

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add timeout helper**

In `frontend/src/lib/api.ts`, after line 360 (`const API_BASE_URL = ...`), add:

```typescript
function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
```

- [ ] **Step 2: Add signal to all fetch methods**

In each of `apiGet`, `apiPost`, `apiPostForm`, `apiPut`, `apiDelete`, add the signal. For example, in `apiGet`:

```typescript
export async function apiGet<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    signal: init?.signal || withTimeout(DEFAULT_TIMEOUT),
    ...init,
  });

  return parseApiResponse<T>(response);
}
```

Apply the same `signal: init?.signal || withTimeout(DEFAULT_TIMEOUT),` pattern to `apiPost`, `apiPostForm`, `apiPut`, `apiDelete`. Place it before the `...init` spread so callers can still override.

- [ ] **Step 3: Improve Zod validation error messages**

Replace the `validateData` function:

```typescript
function validateData<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    if (process.env.NODE_ENV === "development") {
      console.warn(`[API] Validation failed for ${context}:`, issues);
    }
    throw new Error(`Invalid API response for ${context}`);
  }
  return parsed.data;
}
```

- [ ] **Step 4: Add variant_id to addToCart payload type**

Find the `addToCart` export (around line 576):

```typescript
export async function addToCart(payload: { product_id: number; quantity?: number }): Promise<CartData> {
```

Change to:

```typescript
export async function addToCart(payload: { product_id: number; variant_id?: number; quantity?: number }): Promise<CartData> {
```

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/api.ts && git commit -m "fix: add 30s request timeout, improve Zod error context, variant_id in addToCart"
```

---

## Task 9: Frontend — Variant Selector Card UI

**Files:**
- Modify: `frontend/src/components/cart/AddToCartButton.tsx`
- Modify: `frontend/src/app/(storefront)/products/[slug]/page.tsx`

- [ ] **Step 1: Update AddToCartButton to accept variants and render selector**

Replace the entire content of `frontend/src/components/cart/AddToCartButton.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addToCart, type ProductVariant } from "@/lib/api";

type AddToCartButtonProps = {
  productId: number;
  defaultQuantity?: number;
  maxQuantity?: number;
  showBuyNow?: boolean;
  variants?: ProductVariant[];
};

export default function AddToCartButton({
  productId,
  defaultQuantity = 1,
  maxQuantity = 99,
  showBuyNow = true,
  variants = [],
}: AddToCartButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(defaultQuantity);

  const activeVariants = variants.filter((v) => v.is_active && v.stock_quantity > 0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    activeVariants.length === 1 ? activeVariants[0].id : null,
  );

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;
  const effectiveMax = selectedVariant ? selectedVariant.stock_quantity : maxQuantity;
  const needsVariantSelection = activeVariants.length > 1 && !selectedVariantId;

  function formatPrice(paise: number) {
    return `\u20B9${(paise / 100).toFixed(2)}`;
  }

  function variantLabel(v: ProductVariant): string {
    const vals = Object.values(v.option_values || {});
    return vals.length > 0 ? vals.join(" / ") : v.sku;
  }

  async function addItemToCart(nextQuantity: number) {
    return addToCart({
      product_id: productId,
      variant_id: selectedVariantId ?? undefined,
      quantity: nextQuantity,
    });
  }

  async function handleAddToCart() {
    if (needsVariantSelection) {
      setError("Please select a variant first.");
      return;
    }
    setError(null);
    setIsPending(true);

    try {
      const cart = await addItemToCart(quantity);
      setAddedCount(cart.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add item to cart");
    } finally {
      setIsPending(false);
    }
  }

  async function handleBuyNow() {
    if (needsVariantSelection) {
      setError("Please select a variant first.");
      return;
    }
    setError(null);
    setIsBuyingNow(true);

    try {
      await addItemToCart(quantity);
      router.push("/checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout");
    } finally {
      setIsBuyingNow(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Variant selector cards */}
      {activeVariants.length > 1 ? (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#9a7147]">Select Option</p>
          <div className="flex flex-wrap gap-2">
            {activeVariants.map((v) => {
              const isSelected = selectedVariantId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    setError(null);
                    setAddedCount(null);
                    setQuantity(1);
                  }}
                  className={`relative rounded-xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "border-[#c89e65] bg-[#fff2dd] shadow-[0_0_0_1px_#c89e65]"
                      : "border-[#dcc9ab] bg-[#fffefb] hover:border-[#c4a87a] hover:bg-[#fef8ee]"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${isSelected ? "text-[#6f4a2c]" : "text-[#4f3825]"}`}>
                    {variantLabel(v)}
                  </span>
                  <span className={`mt-0.5 block text-xs ${isSelected ? "text-[#8b5e34]" : "text-[#6f5640]"}`}>
                    {formatPrice(v.effective_price)}
                  </span>
                  {v.stock_quantity <= 3 ? (
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-[#b87a3d]">
                      Only {v.stock_quantity} left
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Quantity selector */}
      <div>
        <label htmlFor={`qty-${productId}`} className="mb-1 block text-xs uppercase tracking-[0.14em] text-[#9a7147]">
          Quantity
        </label>
        <input
          id={`qty-${productId}`}
          type="number"
          min={1}
          max={effectiveMax}
          value={quantity}
          onChange={(event) => {
            const parsed = Number(event.target.value) || 1;
            setQuantity(Math.min(Math.max(parsed, 1), Math.max(effectiveMax, 1)));
          }}
          className="w-24 rounded-lg border border-[#dcc9ab] bg-[#fffefb] px-3 py-2 text-sm text-[#3b2513] outline-none focus:border-[#c89e65]"
        />
      </div>

      {/* Add to Cart button */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isPending}
        className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#1d150e] transition hover:bg-[#ddb684] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Adding..." : "Add to Cart"}
      </button>

      {/* Buy Now button */}
      {showBuyNow ? (
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isBuyingNow}
          className="rounded-full border border-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6f4a2c] transition hover:bg-[#c89e65] hover:text-[#1d150e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBuyingNow ? "Starting Checkout..." : "Buy Now"}
        </button>
      ) : null}

      {/* Feedback */}
      {addedCount !== null ? (
        <p className="text-xs uppercase tracking-[0.14em] text-[#8b5e34]">
          Added to cart.{" "}
          <Link href="/cart" className="text-[#c89e65] underline">
            View cart ({addedCount})
          </Link>
        </p>
      ) : null}

      {error ? <p className="text-sm text-[#a94442]">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Update product detail page to pass variants and remove old variant list**

In `frontend/src/app/(storefront)/products/[slug]/page.tsx`, change the AddToCartButton usage (line 96-98):

Replace:
```tsx
              <AddToCartButton productId={product.id} defaultQuantity={1} maxQuantity={product.stock_quantity} showBuyNow />
```

With:
```tsx
              <AddToCartButton
                productId={product.id}
                defaultQuantity={1}
                maxQuantity={product.stock_quantity}
                showBuyNow
                variants={product.variants}
              />
```

Then remove the old read-only variants section (lines 102-116):

```tsx
            <div className="mt-8 rounded-xl border border-[#dcc9ab] bg-[#fffefb] p-4">
              <h2 className="text-sm uppercase tracking-[0.16em] text-[#8f673f]">Variants</h2>
              {product.variants.length === 0 ? (
                <p className="mt-2 text-sm text-[#6f5640]">No variants configured.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-[#4f3825]">
                  {product.variants.map((variant) => (
                    <li key={variant.id} className="rounded-lg border border-[#decdb2] bg-[#fef5e8] px-3 py-2">
                      <span className="font-semibold">{variant.sku}</span>
                      <span className="ml-2 text-[#6f5640]">Stock: {variant.stock_quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
```

Delete this entire block.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/cart/AddToCartButton.tsx src/app/\(storefront\)/products/\[slug\]/page.tsx
git commit -m "feat: premium card-style variant selector on product page"
```

---

## Task 10: Frontend — WhatsApp Message Builder and Dual-Mode Checkout

**Files:**
- Create: `frontend/src/lib/whatsapp.ts`
- Modify: `frontend/src/app/(storefront)/checkout/CheckoutClient.tsx`
- Modify: `frontend/.env.local`

- [ ] **Step 1: Add NEXT_PUBLIC_WHATSAPP_NUMBER to .env.local**

Add after line 94 (`WHATSAPP_NUMBER=919876543210`):

```
NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210
```

- [ ] **Step 2: Create client-side WhatsApp message builder**

Create `frontend/src/lib/whatsapp.ts`:

```typescript
type WhatsAppOrderItem = {
  name: string;
  quantity: number;
  unit_price: number;
  variant_label?: string;
};

type WhatsAppCustomerData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

type WhatsAppPayload = {
  customer: WhatsAppCustomerData;
  items: WhatsAppOrderItem[];
  total: number;
  discount?: number;
  coupon_code?: string;
};

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

export function buildWhatsAppUrl(payload: WhatsAppPayload): string {
  const lines: string[] = [
    "Dominate -train anywhere Dominate everywhere",
    "",
    "My DETAILS:",
    `Name: ${payload.customer.name}`,
    `Phone: ${payload.customer.phone}`,
    `Email: ${payload.customer.email}`,
    "",
    "DELIVERY ADDRESS:",
    payload.customer.address,
    `${payload.customer.city}, ${payload.customer.state} ${payload.customer.pincode}`,
    "",
    "Need to order the following ITEMS:",
  ];

  payload.items.forEach((item, idx) => {
    const priceDisplay = `\u20B9${(item.unit_price / 100).toFixed(2)}`;
    const label = item.variant_label ? ` (${item.variant_label})` : "";
    lines.push(`${idx + 1}. ${item.name}${label}`);
    lines.push(`   Qty: ${item.quantity} | Price: ${priceDisplay}`);
    lines.push("");
  });

  if (payload.coupon_code && payload.discount && payload.discount > 0) {
    lines.push(`COUPON: ${payload.coupon_code}`);
    lines.push(`DISCOUNT: -\u20B9${(payload.discount / 100).toFixed(2)}`);
    lines.push("");
  }

  const payable = payload.total - (payload.discount || 0);
  lines.push("TOTAL AMOUNT:");
  lines.push(`\u20B9${(payable / 100).toFixed(2)}`);

  const message = lines.join("\n");
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 3: Update CheckoutClient with dual-mode checkout**

In `frontend/src/app/(storefront)/checkout/CheckoutClient.tsx`, add the import at the top:

```typescript
import { buildWhatsAppUrl } from "@/lib/whatsapp";
```

Then replace the `handleSubmit` function (lines 226-261) with dual-mode logic:

```typescript
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setError(null);

    if (hasFieldErrors) {
      setError("Please correct highlighted fields before placing your order.");
      return;
    }

    if (!preview || preview.cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);

    try {
      // Try backend-first
      const result = await placeOrder({
        customer_name: form.customer_name,
        phone_number: form.phone_number,
        email: form.email,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        address: form.address,
        coupon_code: form.coupon_code.trim() || undefined,
        address_id: selectedAddressId || undefined,
        save_address: isAuthenticated ? saveAddress : undefined,
        set_default_address: isAuthenticated ? setDefaultAddress : undefined,
        address_label: isAuthenticated && saveAddress ? addressLabel : undefined,
        email_opt_in: form.email_opt_in,
      });

      const confirmationUrl = `/order/confirmation?order=${encodeURIComponent(result.order.order_number)}&wa=${encodeURIComponent(result.whatsapp_url)}&email=${encodeURIComponent(form.email)}`;
      router.push(confirmationUrl);
    } catch {
      // Backend failed — fallback to direct WhatsApp
      const waUrl = buildWhatsAppUrl({
        customer: {
          name: form.customer_name,
          phone: form.phone_number,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        items: preview.cart.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        total: preview.cart.total,
        discount: preview.discount,
        coupon_code: form.coupon_code.trim() || undefined,
      });

      window.open(waUrl, "_blank");
      router.push(`/order/confirmation?wa=${encodeURIComponent(waUrl)}&email=${encodeURIComponent(form.email)}&fallback=true`);
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/lib/whatsapp.ts src/app/\(storefront\)/checkout/CheckoutClient.tsx .env.local
git commit -m "feat: dual-mode checkout — backend-first with WhatsApp fallback"
```

---

## Task 11: Frontend — Error Boundaries for Admin, Account, Affiliate, Order

**Files:**
- Create: `frontend/src/app/admin/error.tsx`
- Create: `frontend/src/app/account/error.tsx`
- Create: `frontend/src/app/affiliate/error.tsx`
- Create: `frontend/src/app/(storefront)/order/error.tsx`

- [ ] **Step 1: Create all four error boundaries**

Each file gets the same template (adapted from the existing root `error.tsx`). Create each:

`frontend/src/app/admin/error.tsx`:
```tsx
"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Error</p>
      <h1 className="mt-2 text-3xl font-bold text-[#3b2513]">Something Went Wrong</h1>
      <p className="mt-4 text-sm text-[#6f5640]">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
        >
          Try Again
        </button>
        <Link
          href="/admin/dashboard"
          className="rounded-full border border-[#dcc9ab] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f5640] hover:bg-[#fef5e8]"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
```

`frontend/src/app/account/error.tsx`:
```tsx
"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AccountErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Error</p>
      <h1 className="mt-2 text-3xl font-bold text-[#3b2513]">Something Went Wrong</h1>
      <p className="mt-4 text-sm text-[#6f5640]">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
        >
          Try Again
        </button>
        <Link
          href="/products"
          className="rounded-full border border-[#dcc9ab] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f5640] hover:bg-[#fef5e8]"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
```

`frontend/src/app/affiliate/error.tsx`:
```tsx
"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AffiliateErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Error</p>
      <h1 className="mt-2 text-3xl font-bold text-[#3b2513]">Something Went Wrong</h1>
      <p className="mt-4 text-sm text-[#6f5640]">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-full border border-[#dcc9ab] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f5640] hover:bg-[#fef5e8]"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

`frontend/src/app/(storefront)/order/error.tsx`:
```tsx
"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OrderErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147]">Error</p>
      <h1 className="mt-2 text-3xl font-bold text-[#3b2513]">Something Went Wrong</h1>
      <p className="mt-4 text-sm text-[#6f5640]">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-[#c89e65] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#1d150e] hover:bg-[#ddb684]"
        >
          Try Again
        </button>
        <Link
          href="/products"
          className="rounded-full border border-[#dcc9ab] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f5640] hover:bg-[#fef5e8]"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/app/admin/error.tsx src/app/account/error.tsx src/app/affiliate/error.tsx src/app/\(storefront\)/order/error.tsx
git commit -m "feat: add error boundaries for admin, account, affiliate, and order segments"
```

---

## Task 12: Frontend — Loading States for Admin, Account, Affiliate

**Files:**
- Create: `frontend/src/app/admin/loading.tsx`
- Create: `frontend/src/app/account/loading.tsx`
- Create: `frontend/src/app/affiliate/loading.tsx`

- [ ] **Step 1: Create all three loading components**

`frontend/src/app/admin/loading.tsx`:
```tsx
export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147] animate-pulse">Loading...</p>
    </div>
  );
}
```

`frontend/src/app/account/loading.tsx`:
```tsx
export default function AccountLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147] animate-pulse">Loading...</p>
    </div>
  );
}
```

`frontend/src/app/affiliate/loading.tsx`:
```tsx
export default function AffiliateLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[#9a7147] animate-pulse">Loading...</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/app/admin/loading.tsx src/app/account/loading.tsx src/app/affiliate/loading.tsx
git commit -m "feat: add loading states for admin, account, and affiliate sections"
```

---

## Task 13: Frontend — Fix Google Script Leak, Modal Accessibility, SEO Metadata

**Files:**
- Modify: `frontend/src/components/auth/GoogleSignInButton.tsx`
- Modify: `frontend/src/components/ui/Modal.tsx`
- Modify: `frontend/src/app/about/page.tsx`
- Modify: `frontend/src/app/contact/page.tsx`

- [ ] **Step 1: Fix Google script cleanup**

In `frontend/src/components/auth/GoogleSignInButton.tsx`, replace the cleanup return (lines 102-104):

```typescript
    return () => {
      // Keep loaded script cached across auth pages.
    };
```

With:

```typescript
    return () => {
      // Script stays in DOM (cached by browser), but we clean up
      // to avoid re-initialization on remount.
      if (buttonRef.current) {
        buttonRef.current.innerHTML = "";
      }
    };
```

- [ ] **Step 2: Fix Modal accessibility**

Replace the content of `frontend/src/components/ui/Modal.tsx`:

```tsx
import type { ReactNode } from "react";

type ModalProps = {
  title?: string;
  children: ReactNode;
};

export default function Modal({ title, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#8b6f47]/40 bg-[#14100d] text-[#f4eee4] shadow-2xl">
        {title ? <div id="modal-title" className="border-b border-[#8b6f47]/30 px-5 py-4 text-xs uppercase tracking-[0.2em] text-[#c7ac85]">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add metadata to about page**

In `frontend/src/app/about/page.tsx`, add before the default export:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | DOMINATE",
  description: "DOMINATE builds functional strength equipment for athletes who train with intent.",
};
```

- [ ] **Step 4: Add metadata to contact page**

In `frontend/src/app/contact/page.tsx`, add the metadata export:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | DOMINATE",
  description: "Get in touch with DOMINATE for questions about products, orders, or partnerships.",
};
```

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/auth/GoogleSignInButton.tsx src/components/ui/Modal.tsx src/app/about/page.tsx src/app/contact/page.tsx
git commit -m "fix: Google script cleanup, modal a11y, SEO metadata for about/contact"
```

---

## Task 14: Verify Everything Works

- [ ] **Step 1: Backend smoke test**

Run: `cd "c:/Dev/fitness brand" && python -c "from app import create_app; app = create_app(); print('Backend OK')"`

Expected: `Backend OK`

- [ ] **Step 2: Frontend build check**

Run: `cd "c:/Dev/fitness brand/frontend" && npx next build`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: If build fails, fix TypeScript errors and re-commit**

---
