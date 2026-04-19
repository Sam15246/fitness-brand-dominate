# Migration And Restructure Plan

## Goal
Complete migration with zero behavior regression, then remove legacy files and harden backend structure.

## Launch Scope Note
- Initial operating market is India only.
- Persist order currency as INR for now; keep `exchange_rates` as future-readiness foundation.
- Current stage is pre-traffic; prioritize correctness and maintainability over early infra complexity.
- Startup implementation tracker lives in `STARTUP_IMPLEMENTATION_CHECKLIST.md`.

## Completed Milestones (Current)
- Feature-based frontend folders created and used by live routes.
- Parallel/intercepting product modal route implemented.
- Cloudflare-aware image loader and CLS-safe image sizing implemented on storefront core pages.
- Runtime API response validation added for product APIs.
- Server-side route protection implemented for admin/account/affiliate layouts.
- Duplicate frontend route trees removed from app root in favor of grouped routes.
- Backend auth/users routes extracted into dedicated modules with unchanged `/api/v1/*` endpoints.
- Backend products/reviews routes extracted into dedicated module with unchanged `/api/v1/products*` endpoints.
- Backend checkout/orders routes extracted into dedicated module with unchanged `/api/v1/checkout*` and `/api/v1/orders*` endpoints.
- Backend cart routes extracted into dedicated module with unchanged `/api/v1/cart*` endpoints.
- Backend admin routes extracted into dedicated module with unchanged `/api/v1/admin/*` endpoints.
- Backend affiliate/content routes extracted into dedicated module with unchanged `/api/v1/affiliate/*` and `/api/v1/content/*` endpoints.
- API compatibility helper audit completed in `app/routes/api_v1.py`; no unsafe helper deletions pending.
- Media optimization phase 2 completed: remaining raw `img` usage replaced in admin image management.
- Data model roadmap kickoff started: drafted non-breaking schema foundation for `orders.currency_code` and `exchange_rates`; `products.hsn_code` already present (migration 024).

## Frontend Cleanup Policy
1. Keep migrated Next routes as source of truth.
2. Delete legacy frontend artifacts only after parity checks pass for that feature.
3. Use a two-step delete process:
- Step A: Mark files as deprecated and verify no imports/references.
- Step B: Delete in a dedicated cleanup commit.

## Frontend Deletion Criteria (Per Feature)
- UI parity confirmed against legacy flow.
- API parity confirmed for create/update/delete/action paths.
- Lint and smoke checks pass.
- No remaining route links to legacy files.

## Legacy Templates And Static Cleanup Rule
- API-only cutover is complete and `app/templates` has been removed.
- Continue to verify any `app/static` asset before deletion by checking active backend/frontend references.
- Keep cleanup in small batches with parity sign-off and regression checks.

## Backend Folder Restructure Policy
1. Do not do a big-bang move.
2. Refactor by domain and keep endpoints stable:
- auth
- users
- products
- orders
- reviews
- coupons
- affiliates
- admin
3. Keep `app/routes/api_v1.py` as compatibility layer during transition, then split into blueprints.

## Backend Target Structure
- app/routes/api_v1/
- app/services/
- app/repositories/
- app/schemas/
- app/tasks/

## Suggested Sequencing
1. Split auth + users routes first.
2. Split products + reviews routes next.
3. Split orders + checkout with eager-loading and perf review.
4. Split admin domain and coupon/affiliate operations.
5. Introduce Celery tasks for non-critical paths.

## Immediate Next Steps
1. Backend extraction phase 1 complete:
- Keep `app/routes/api_v1.py` as compatibility delegator and route registrar.
- Continue helper deletion only when a full module extraction makes a helper unreachable.
2. Frontend colocation phase 2:
- Move account forms/state logic into feature-local hooks/services.
- Keep page.tsx files as thin route wrappers.
3. Data model roadmap kickoff:
- Apply and verify migration for orders.currency_code and exchange_rates.
- Keep checkout/order creation pinned to INR during India-only launch.
- Keep products.hsn_code as existing baseline from migration 024; add only validations/indexes if required.
- Keep integer money as the only persisted monetary type.

## Safety Rails
- No destructive deletes in same commit as behavior changes.
- Run compile/lint/tests after each domain split.
- Keep migration checklist updated with file-level ownership.
