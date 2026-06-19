# Router Mount Map — BharatOS Router Tree

This document visualizes the complete API mount tree as resolved at Vercel runtime in production.

---

## 1. Production Mount Tree

```
api/index.ts (Vercel catch-all Serverless entrypoint)
└── server/routes/index.ts (Sovereign Route Registry)
    ├── [Root Mounts] (mounted at /api)
    │   ├── server/routes/marketplace/vendor-dashboard.routes.ts
    │   ├── server/routes/billing.routes.ts
    │   ├── server/routes/public/home.routes.ts
    │   ├── server/routes/public/stats.routes.ts
    │   ├── server/routes/marketplace/products.routes.ts (Imported as merchantRoutes - DUPLICATE)
    │   └── server/routes/transit.routes.ts
    │
    ├── /auth (mounted at /api/auth)
    │   └── server/routes/auth.routes.ts
    │
    ├── /user (mounted at /api/user - MIRRORED DUPLICATE)
    │   └── server/routes/auth.routes.ts
    │
    ├── /ai (mounted at /api/ai)
    │   ├── server/routes/ai/concierge.routes.ts
    │   └── server/routes/ai/dssl.engine.ts
    │
    ├── /admin (mounted at /api/admin)
    │   └── server/routes/admin/index.ts (Admin Router Hub)
    │       ├── / (root of admin) -> server/routes/admin/admin.routes.ts
    │       ├── / (root of admin) -> server/routes/admin/ai-command.routes.ts
    │       ├── /vendors -> server/routes/admin/vendor.control.ts
    │       ├── /district-memory -> server/routes/admin/district-memory.routes.ts
    │       ├── /dynamic-ranking -> server/routes/admin/dynamic-ranking.routes.ts
    │       ├── /district-intelligence -> server/routes/admin/district-intelligence.routes.ts
    │       └── /migration -> server/routes/admin/migration-observability.routes.ts
    │
    ├── /admin/dssl (mounted at /api/admin/dssl)
    │   └── server/routes/admin/dssl.ts
    │
    ├── /payments (mounted at /api/payments)
    │   └── server/routes/payments.cashfree.routes.ts
    │
    ├── /local (mounted at /api/local)
    │   └── server/routes/public/local.routes.ts
    │
    ├── /upload (mounted at /api/upload)
    │   └── server/routes/upload.routes.ts
    │
    ├── /marketplace (mounted at /api/marketplace)
    │   ├── server/routes/marketplace/stores.routes.ts
    │   └── server/routes/marketplace/products.routes.ts (Imported as productsRoutes - DUPLICATE)
    │
    ├── /marketplace/reviews (mounted at /api/marketplace/reviews)
    │   └── server/routes/marketplace/reviews.routes.ts
    │
    ├── /analytics (mounted at /api/analytics)
    │   └── server/routes/analytics.routes.ts
    │
    ├── /search (mounted at /api/search)
    │   └── server/routes/search.unified.routes.ts
    │
    ├── /orders (mounted at /api/orders)
    │   └── server/routes/orders.routes.ts
    │
    └── /appointments (mounted at /api/appointments)
        └── server/routes/appointments.routes.ts
```

---

## 2. Mount Anomalies & Classifications

### A. Duplicate Mounts
* **`auth.routes.ts`:** Mounted at `/api/auth` AND mirrored at `/api/user`. They point to the exact same router instance, meaning `/api/auth/balance` and `/api/user/balance` are identical execution paths.
* **`products.routes.ts`:** Mounted at `/api` (root) under the alias `merchantRoutes` and mounted at `/api/marketplace` under `productsRoutes`. This duplicates all endpoints inside this file under both prefixes (e.g., `/api/products` vs `/api/marketplace/products`).

### B. Orphaned / Unmounted Routers (Dead Code)
These router files exist in the codebase but are **never imported, mounted, or referenced** anywhere in the active execution paths. They represent dead logic that should be cleaned up:
* `server/routes/admin/ai-dashboard.routes.ts`
* `server/routes/admin/ai-providers.routes.ts`
* `server/routes/admin/ai_stats.ts`
* `server/routes/admin/dssl.control.ts`
* `server/routes/admin/hyper.regional.control.ts`
* `server/routes/ai/synthesis.orchestrator.ts` *(Helper script)*
* `server/routes/ai/telemetry.orchestrator.ts` *(Helper script)*
* `server/routes/marketplace/vendor-reviews.routes.ts`
* `server/routes/marketplace/vendors.routes.ts`
* `server/routes/vendor.routes.ts`

### C. Dead Serverless Entrypoints
These files in the `api/` directory represent historical single-function routes that are now bypassed by the Vercel catch-all rewrite rule:
* `api/admin.ts`
* `api/ai.ts`
* `api/auth.ts`
* `api/health.ts`
* `api/marketplace.ts`
* `api/merchant.ts`
