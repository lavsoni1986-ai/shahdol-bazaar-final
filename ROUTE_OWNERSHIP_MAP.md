# Route Ownership Map — BharatOS API

This document lists every registered route in the system, its authoritative ownership, and its status in production.

---

## 1. Authentication & Identity Routes (`/api/auth` / `/api/user`)
* **Router File:** [auth.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/auth.routes.ts)
* **Controller File:** [auth.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/auth.routes.ts) *(Inlined Callbacks)*
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/auth` and `/user`
* **Base Middleware Chain:** `compression` -> `cors` -> `helmet` -> Security Headers -> `cookieParser` -> `apiCacheMiddleware` -> Request Tracking (`tenantContext`) -> `tenantResolver` -> Route Flag Injection -> Router-level Middlewares

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `POST /api/auth/login` | `loginLimiter` | `user.repo.ts` | `User` | **YES** |
| `POST /api/auth/register` | `registerLimiter` | `district.repo.ts`, `user.repo.ts` | `User`, `District`, `Vendor` (auto-provision) | **YES** |
| `GET /api/auth/verify` | `optionalAuth` | `user.repo.ts` | `User` | **YES** |
| `GET /api/auth/csrf-token` | `requireAuth` | `user.repo.ts` | `User` | **YES** |
| `POST /api/auth/logout` | None | `user.repo.ts` | `User` | **YES** |
| `POST /api/auth/refresh` | None | `user.repo.ts` | `User` | **YES** |
| `GET /api/auth/balance` | `requireAuth` | `user.repo.ts` | `User` | **YES** |
| Mirrored at `/api/user/*` | *(Same as above)* | *(Same as above)* | *(Same as above)* | **YES** |

---

## 2. Order Management Routes (`/api/orders`)
* **Router File:** [orders.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/orders.routes.ts)
* **Controller File:** [orders.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/orders.routes.ts) *(Inlined Callbacks)*
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/orders`
* **Base Middleware Chain:** Same as base + `requireCSRF`

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `POST /api/orders/` | `requireAuth`, `validate` | `product.repo.ts`, `order.repo.ts` | `Order`, `Product`, `Vendor`, `User` | **YES** |
| `GET /api/orders/` | `requireAuth` | `order.repo.ts` | `Order`, `Product`, `Vendor`, `User` | **YES** |

---

## 3. Product Catalog & Inventory Routes (`/api/marketplace/products` & `/api/products`)
* **Router File:** [products.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/products.routes.ts)
* **Controller File:** [products.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/products.routes.ts) *(Inlined Callbacks)*
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/marketplace` (wrapped in `tenantResolver`) and `""` (as `merchantRoutes`)
* **Base Middleware Chain:** Same as base

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `GET /api/marketplace/products` | `tenantResolver` (duplicated) | `product.repo.ts` | `Product`, `Vendor`, `Category` | **YES** |
| `GET /api/marketplace/products/slug/:slug` | `tenantResolver` (duplicated) | `product.repo.ts` | `Product`, `Vendor` | **YES** |
| `GET /api/marketplace/products/:entityKey` | `tenantResolver` (duplicated) | None (uses direct services) | `Product`, `Vendor` | **YES** |
| `GET /api/merchant/products` | `requireAuth`, `requireMerchant` | `product.repo.ts`, `vendor.repo.ts` | `Product`, `Vendor`, `ProductImage` | **YES** |
| `POST /api/merchant/products` | `requireAuth`, `requireMerchant` | `product.repo.ts`, `vendor.repo.ts` | `Product`, `Vendor`, `Category`, `ProductImage` | **YES** |
| `PUT /api/merchant/products/:id` | `requireAuth`, `requireMerchant` | `product.repo.ts`, `vendor.repo.ts` | `Product`, `Vendor` | **YES** |
| `DELETE /api/merchant/products/:id` | `requireAuth`, `requireMerchant` | `product.repo.ts`, `vendor.repo.ts` | `Product`, `Vendor` | **YES** |
| `GET /api/products` (Root Mount) | None (runs global only) | `product.repo.ts` | `Product`, `Vendor`, `Category` | **YES** |
| `GET /api/products/slug/:slug` (Root) | None (runs global only) | `product.repo.ts` | `Product`, `Vendor` | **YES** |

---

## 4. Store Discovery Routes (`/api/marketplace/stores`)
* **Router File:** [stores.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/stores.routes.ts)
* **Controller File:** [stores.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/stores.routes.ts) *(Inlined Callbacks)*
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/marketplace` (wrapped in `tenantResolver`)
* **Base Middleware Chain:** Same as base

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `GET /api/marketplace/home-snapshot` | `tenantResolver` (duplicated) | None (uses discovery service) | `Vendor`, `Product`, `District` | **YES** |
| `GET /api/marketplace/stores` | `tenantResolver` (duplicated), `validateQuery` | `vendor.repo.ts` | `Vendor` | **YES** |
| `GET /api/marketplace/stores/:slug` | `tenantResolver` (duplicated) | None (uses discovery service) | `Vendor`, `Product` | **YES** |
| `GET /api/marketplace/vendors/id/:id` | `tenantResolver` (duplicated) | None (uses discovery service) | `Vendor` | **YES** |

---

## 5. Review & Rating Routes (`/api/marketplace/reviews`)
* **Router File:** [reviews.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/reviews.routes.ts)
* **Controller File:** [reviews.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/reviews.routes.ts) *(Inlined Callbacks)*
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/marketplace/reviews` (wrapped in `tenantResolver`)
* **Base Middleware Chain:** Same as base

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `GET /api/marketplace/reviews` | `tenantResolver` (duplicated) | None | `Review`, `Product` | **YES** |
| `POST /api/marketplace/reviews` | `tenantResolver` (duplicated), `requireAuth` | None | `Review`, `Product`, `Order` | **YES** |

---

## 6. AI & Discovery Intelligence Routes (`/api/ai`)
* **Router File:** [concierge.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/ai/concierge.routes.ts) & [dssl.engine.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/ai/dssl.engine.ts)
* **Controller File:** [concierge.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/ai/concierge.routes.ts) / [dssl.engine.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/ai/dssl.engine.ts)
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/ai`
* **Base Middleware Chain:** Same as base

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `POST /api/ai/onboard-vision` | `requireAuth` | None (Groq API + storage helper) | `District` | **YES** |
| `POST /api/ai/concierge` | None | None | `District` | **YES** |
| `POST /api/ai/click-learn` | None | None | None (軽量 rank Bumps) | **YES** |
| `POST /api/ai/voice-search` | None | None | `District` | **YES** |
| `GET /api/ai/market-insights` | `requireAuth` | None | `Vendor`, `Product`, `District` | **YES** |
| `POST /api/ai/action-learn` | None | None | None (telemetry update) | **YES** |
| `GET /api/ai/admin/trace/:queryHash` | `requireAuth` | None | None | **YES** |

---

## 7. Command Center / Admin Routes (`/api/admin`)
* **Router File:** [admin.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/admin/admin.routes.ts), [ai-command.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/admin/ai-command.routes.ts), [vendor.control.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/admin/vendor.control.ts) etc.
* **Controller File:** Individual control files.
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/admin`
* **Base Middleware Chain:** Same as base

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `GET /api/admin/system-health` | `requireAuth`, `requireSuperAdmin` | None | `User`, `Product` | **YES** |
| `GET /api/admin/fraud-summary` | `requireAuth`, `requireSuperAdmin` | None | `FraudHistory` | **YES** |
| `GET /api/admin/user-intelligence-summary` | `requireAuth`, `requireSuperAdmin` | None | `User`, `Vendor` | **YES** |
| `GET /api/admin/activity-feed` | `requireAuth`, `requireSuperAdmin` | None | `Order`, `Vendor` | **YES** |
| `GET /api/admin/vendors` | `requireAuth`, `requireCityAdmin` | None | `Vendor` | **YES** |
| `PATCH /api/admin/vendors/:id/status` | `requireAuth`, `requireCityAdmin` | None | `Vendor`, `AdminActionLog` | **YES** |
| `PATCH /api/admin/vendors/:id/ban` | `requireAuth`, `requireCityAdmin`, `adminActionLimiter` | None | `Vendor`, `AdminActionLog` | **YES** |
| `PATCH /api/admin/vendors/:id/approve` | `requireAuth`, `requireCityAdmin`, `adminActionLimiter` | None | `Vendor`, `AdminActionLog` | **YES** |
| `GET /api/admin/audit-logs` | `requireAuth`, `requireCityAdmin` | None | `AuditLog` | **YES** |
| `GET /api/admin/users` | `requireAuth`, `requireSuperAdmin` | None | `User` | **YES** |
| `PUT /api/admin/users/:id/role` | `requireAuth`, `requireSuperAdmin` | None | `User` | **YES** |
| `PATCH /api/admin/users/:id/quarantine` | `requireAuth`, `requireSuperAdmin` | None | `User`, `AdminActionLog` | **YES** |
| `POST /api/admin/kill-switch` | `requireAuth`, `requireSuperAdmin` | None | `AdminActionLog` | **YES** |
| `POST /api/admin/vendors/:id/feature` | `requireAuth`, `requireSuperAdmin` | None | `Vendor`, `AdminActionLog` | **YES** |
| `GET /api/admin/revenue/metrics` | `requireAuth`, `requireSuperAdmin` | None | None | **YES** |
| `POST /api/admin/system-lockdown` | `requireAuth`, `requireSuperAdmin` | None | None | **YES** |
| `GET /api/admin/reviews/pending` | `requireAuth`, `requireCityAdmin` | None | `Review`, `Product`, `Vendor` | **YES** |
| `DELETE /api/admin/reviews/:id` | `requireAuth`, `requireCityAdmin`, `adminActionLimiter` | None | `Review`, `Product`, `Vendor`, `AdminActionLog` | **YES** |
| `GET /api/admin/products/pending` | `requireAuth`, `requireCityAdmin` | None | `Product` | **YES** |
| `POST /api/admin/vendors` | `requireAuth`, `requireCityAdmin` | None | `Vendor` | **YES** |
| `GET /api/admin/vendors/:id` | `requireAuth`, `requireCityAdmin` | None | `Vendor` | **YES** |
| `PUT /api/admin/vendors/:id` | `requireAuth`, `requireCityAdmin` | None | `Vendor` | **YES** |
| `DELETE /api/admin/vendors/:id` | `requireAuth`, `requireCityAdmin` | None | `Vendor` | **YES** |

---

## 8. Financial Payments & Integration (`/api/payments`)
* **Router File:** [payments.cashfree.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/payments.cashfree.routes.ts)
* **Controller File:** [payments.cashfree.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/payments.cashfree.routes.ts) *(Inlined Callbacks)*
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts) at `/payments`
* **Base Middleware Chain:** Same as base

| Route Pattern | Router-level Middleware | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|
| `POST /api/payments/create` | `requireAuth` | None | `Order`, `Payment` | **YES** |
| `POST /api/payments/verify` | `requireAuth` | None | `Order`, `Payment`, `User` | **YES** |
| `POST /api/payments/webhook/cashfree` | Raw body parser (bypasses express.json) | None | None (logging & timing check only) | **YES** |

---

## 9. Core Public Information & Shared Timetables
* **Mounted From:** [index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts)
* **Base Middleware Chain:** Same as base

| Route Pattern | Router File | Controller File | Repository Used | Database Tables | Production Active |
|---|---|---|---|---|---|
| `GET /api/districts` | `server/routes/index.ts` | Inlined | None | `District` | **YES** |
| `GET /api/districts/:slug` | `server/routes/index.ts` | Inlined | None | `District` | **YES** |
| `GET /api/offers` | `server/routes/index.ts` | Inlined | `offer.repo.ts` | `Offer` | **YES** |
| `DELETE /api/offers/:id` | `server/routes/index.ts` | Inlined (`requireSuperAdmin`) | `offer.repo.ts` | `Offer` | **YES** |
| `GET /api/categories` | `server/routes/index.ts` | Inlined | `category.repo.ts` | `Category` | **YES** |
| `DELETE /api/categories/:id` | `server/routes/index.ts` | Inlined (`requireSuperAdmin`) | `category.repo.ts` | `Category` | **YES** |
| `GET /api/banners` | `server/routes/index.ts` | Inlined | None | `Banner` | **YES** |
| `GET /api/marketplace/vendors/:slug` | `server/routes/index.ts` | Inlined | None (entity resolution service) | `Vendor` | **YES** |
| `GET /api/marketplace/orders/:slug` | `server/routes/index.ts` | Inlined (`requireAuth`) | None | `Order`, `Vendor` | **YES** |
| `POST /api/upload` | `server/routes/upload.routes.ts` | Inlined | None (Multer Cloudinary Storage) | None | **YES** |
| `POST /api/appointments/create` | `server/routes/appointments.routes.ts` | Inlined | None | `Appointment` | **YES** |
| `GET /api/transit/bus-timetable` | `server/routes/transit.routes.ts` | Inlined | None | None (reads JSON file) | **YES** |
| `GET /api/local/schools` | `server/routes/public/local.routes.ts` | Inlined | None | `School` | **YES** |
| `GET /api/local/pulse` | `server/routes/public/local.routes.ts` | Inlined | None | None (Uptime pulse) | **YES** |
