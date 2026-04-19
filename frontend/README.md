# DOMINATE Frontend (Next.js SPA)

This folder contains the decoupled frontend application for DOMINATE.

## Stack

- Next.js App Router
- React
- TypeScript (strict)
- Tailwind CSS

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Ensure the Flask backend is running.
3. Run:

```bash
npm run dev
```

Frontend URL: http://localhost:3000

## Environment

Set frontend API base and backend proxy target in `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_BASE_URL=http://localhost:5000
```

This setup uses Next.js rewrites to proxy `/api/v1/*` requests to Flask. It keeps browser requests same-origin (http://localhost:3000), which avoids local CORS and cookie credential issues.

## Implemented foundation

- Brand design tokens in `src/app/globals.css`
- Brand typography wired in `src/app/layout.tsx`
- Typed API client in `src/lib/api.ts`
- Landing module in `src/app/page.tsx`
- Auth pages and reusable auth form components under `src/app/auth/*` and `src/components/auth/*`

## Backend endpoints currently integrated

- GET /api/v1/health
- GET /api/v1/auth/me
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/register
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password

## Next sprint targets

- Auth flows for login, logout, and registration
- Products list and product detail views
- Cart and checkout client flows
