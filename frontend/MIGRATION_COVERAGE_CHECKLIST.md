# Frontend Migration Coverage Checklist

Date: 2026-04-19
Scope: Compare legacy Flask template pages with current Next.js App Router pages.

## Executive Status

- User-facing commerce pages: covered in Next.js
- Authentication pages: covered in Next.js for user auth flows
- Admin pages: route-level and core action-level migration completed, including image upload API/UI wiring
- Affiliate dashboard: route-level migration completed and API wiring implemented in Next.js
- Error pages (403/404/500): route-level migration completed in Next.js

## Source Inventory

Legacy templates analyzed:
- app/templates/public/*.html
- app/templates/auth/*.html
- app/templates/admin/*.html
- app/templates/admin/coupons/*.html
- app/templates/affiliate/*.html
- app/templates/errors/*.html

Current Next.js pages analyzed:
- frontend/src/app/**/page.tsx

---

## 1) Public / User Pages

### Covered

- Legacy public/index.html -> Next route /
  - File: frontend/src/app/page.tsx
- Legacy public/products.html -> Next route /products
  - File: frontend/src/app/products/page.tsx
- Legacy public/product.html -> Next route /products/[slug]
  - File: frontend/src/app/products/[slug]/page.tsx
- Legacy public/cart.html -> Next route /cart
  - File: frontend/src/app/cart/page.tsx
- Legacy public/checkout.html -> Next route /checkout
  - File: frontend/src/app/checkout/page.tsx
- Legacy public/order_start.html -> Next route /order/[productId]/start
  - File: frontend/src/app/order/[productId]/start/page.tsx
- Legacy public/order_form.html -> Next route /order/[productId]/form
  - File: frontend/src/app/order/[productId]/form/page.tsx
- Legacy public/confirmation.html -> Next routes /order/confirmation and /order/confirmation/[orderNumber]
  - Files:
    - frontend/src/app/order/confirmation/page.tsx
    - frontend/src/app/order/confirmation/[orderNumber]/page.tsx
- Legacy public/my_orders.html -> Next route /account/orders
  - File: frontend/src/app/account/orders/page.tsx
- Legacy public/profile.html -> Next route /account/profile
  - File: frontend/src/app/account/profile/page.tsx
- Legacy public/about.html -> Next route /about
  - File: frontend/src/app/about/page.tsx
- Legacy public/contact.html -> Next route /contact
  - File: frontend/src/app/contact/page.tsx
- Legacy public/shipping.html -> Next route /shipping
  - File: frontend/src/app/shipping/page.tsx
- Legacy public/returns.html -> Next route /returns
  - File: frontend/src/app/returns/page.tsx
- Legacy public/terms.html -> Next route /terms
  - File: frontend/src/app/terms/page.tsx
- Legacy public/privacy.html -> Next route /privacy
  - File: frontend/src/app/privacy/page.tsx

### Covered (via compatibility migration)

- Legacy public/order.html -> Next route /order (compatibility landing) plus product-specific order routes
  - File: frontend/src/app/order/page.tsx
- Legacy public/policy.html -> Next dynamic route /policy/[slug] for policy pages
  - File: frontend/src/app/policy/[slug]/page.tsx

---

## 2) Auth Pages

### Covered

- Legacy auth/register.html -> Next route /auth/register
  - File: frontend/src/app/auth/register/page.tsx
- Legacy auth/forgot_password.html -> Next route /auth/forgot-password
  - File: frontend/src/app/auth/forgot-password/page.tsx
- Legacy auth/reset_password.html -> Next route /auth/reset-password/[token]
  - File: frontend/src/app/auth/reset-password/[token]/page.tsx
- Legacy admin/login.html (used as unified login page) -> Next route /auth/login
  - File: frontend/src/app/auth/login/page.tsx

### Covered

- Role-aware post-login destination from unified login and Google login
  - Status: Complete
  - Reason: Next login now redirects admins/superadmins to admin dashboard and affiliates to affiliate dashboard by default.

---

## 3) Admin Pages (Legacy Flask Admin)

Status: Route-level migrated in Next.js; list/detail/create/edit plus key action workflows wired.

Mapped Next routes:
- /admin/dashboard
- /admin/orders
- /admin/orders/[orderId]
- /admin/products
- /admin/products/new
- /admin/products/[productId]/edit
- /admin/products/[productId]/images
- /admin/users
- /admin/affiliates
- /admin/commissions
- /admin/policies
- /admin/policies/[slug]/edit
- /admin/reviews
- /admin/reviews/new/[productId]
- /admin/reviews/[reviewId]/edit
- /admin/image-guidelines
- /admin/coupons
- /admin/coupons/new
- /admin/coupons/[couponId]/edit
- /admin/coupons/[couponId]/stats

Notes:
- Admin APIs now exist in /api/v1 for dashboard, orders, products, users, reviews, policies, affiliates, commissions, and coupons.
- Admin routes are no longer placeholder scaffolds; list/detail/create/edit pages are wired to live admin API responses.
- Product image management now supports binary file upload through storage abstraction (local or R2) and delete cleanup through storage backend.
- User role/state updates, review moderation toggles, and commission status actions are API and UI wired.
- Remaining parity work focuses on advanced UX and deeper affiliate payout history/redeem workflows.

---

## 4) Affiliate Pages

Status: Route-level migrated in Next.js; dashboard data wiring implemented.

Mapped Next routes:
- /affiliate/dashboard

---

## 5) Error Pages

Status: Route-level migrated in Next.js.

Mapped Next routes/files:
- 403 equivalent: /forbidden -> frontend/src/app/forbidden/page.tsx
- 404 equivalent: frontend/src/app/not-found.tsx
- 500 equivalent: frontend/src/app/error.tsx

---

## 6) Non-page Layout Partials

- base.html (legacy layout shell)
- admin/_nav_tabs.html (legacy admin partial)

Status: N/A for direct route parity

---

## Coverage Verdict

- User-facing storefront and account flow: migrated and operational.
- All legacy screen routes exist in Next.js.
- Core admin behavior parity is implemented, including action-level controls and image upload wiring.
- Remaining work is non-blocking enhancement parity: richer UX confirmations/bulk actions and deeper affiliate payout/redeem workflows.

## Recommended Next Migration Order

1. Add Playwright admin/affiliate smoke tests with authenticated fixture accounts in CI
2. Deepen affiliate workflow parity (wallet history, payout/redeem actions)
3. Improve admin UX polish (bulk actions, confirmation prompts, richer status feedback)
