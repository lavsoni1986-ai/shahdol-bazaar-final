# PRODUCT_ROUTE_FORENSIC_REPORT

## Summary

This forensic audit isolates the product/review route subsystem and identifies exact route mismatches, missing mounts, and contract drift in the current codebase.

## Findings

1. `/api/admin/products/all` is a frontend expectation with no corresponding backend route.
2. `/api/marketplace/reviews/:id` and `POST /api/marketplace/reviews` are expected by the frontend, but the review router is never mounted.
3. `vendor` product list requests (`GET /api/marketplace/products?vendorId=...`) are defined and mounted, so a "0 items" vendor result is not traceable to missing route registration.
4. The frontend canonical API client enforces a strict `success` contract, so unreachable or non-contract responses become `Invalid API contract` errors.

## Mounted route families

The main backend route registry in `server/routes/index.ts` mounts the following children:

- `app.use("/marketplace", tenantResolver, storesRoutes)` → `server/routes/marketplace/stores.routes.ts`
- `app.use("/marketplace", tenantResolver, productsRoutes)` → `server/routes/marketplace/products.routes.ts`

This means the marketplace storefront routes are reachable under `/api/marketplace/...` for:

- `/api/marketplace/stores` and `/api/marketplace/stores/:slug`
- `/api/marketplace/vendors/id/:id`
- `/api/marketplace/products`
- `/api/marketplace/products/:id`
- `/api/marketplace/products/slug/:slug`
- Merchant product CRUD endpoints under the same router

## Broken or unreachable routes

### 1. `admin/products/all`

- Frontend call: `client/src/pages/admin/ProductsPanel.tsx`
- Uses `apiRequest("GET", "admin/products/all")`
- Backend search: no `router.get("/products/all"...)` exists in `server/routes/admin/admin.routes.ts` or anywhere else under `server/routes`.
- Result: 404 / missing route causes the frontend API client to reject the response as an invalid contract.

### 2. `marketplace/reviews` routes

- Frontend calls in `client/src/pages/product-detail.tsx`:
  - `GET marketplace/reviews/${productId}`
  - `POST marketplace/reviews`
- Backend review implementation exists in `server/routes/marketplace/reviews.routes.ts`.
- Audit finding: `reviews.routes.ts` is not imported or mounted by `server/routes/index.ts` or any other route registry.
- Result: `/api/marketplace/reviews/*` is effectively unreachable.

### 3. `marketplace/products?vendorId=...`

- Frontend call from `client/src/services/vendor.service.ts` and `client/src/pages/shop-detail.tsx`.
- Backend implementation exists in `server/routes/marketplace/products.routes.ts`:
  - `router.get("/")` handles query `vendorId` and falls back to discovery feed or direct product list when `vendorId` is provided.
- Route is mounted at `/api/marketplace/products`.
- Conclusion: if vendor detail pages show `0 items`, it is not caused by the route being unmounted. The issue is more likely in one of these areas:
  - vendor product filtering / approval state in `server/repositories/product.repo.ts`
  - actual database state for that vendor
  - vendor ID resolution or query parameter formation in the frontend

## Contract drift and error behavior

`client/src/lib/api-client.ts` enforces the following contract:

- Request always prefixes `/api/`
- Request always includes `x-district-slug`
- Response must parse as JSON
- Response must include a top-level `success` field
- If `success` is absent, the error becomes `Invalid API contract`

This makes route mismatches very visible in the current frontend: any missing endpoint, fallback HTML, or non-standard error payload will be surfaced as a contract failure.

## Exact root causes

- `admin/products/all`: frontend route expectation without a backend implementation.
- `marketplace/reviews`: backend implementation exists but is unmounted.
- Vendor page `0 items`: route exists and is mounted, so the exact cause is likely data or filter semantics rather than route registration.

## Recommendations for the forensic next step

- Confirm the database state for the vendor whose page shows `0 items`.
- Verify the vendor page query parameter `vendorId` is numeric and corresponds to an approved vendor.
- Mount `server/routes/marketplace/reviews.routes.ts` under `/marketplace` to restore review fetch/create.
- Add or clarify the admin route for `/admin/products/all` if that panel should remain in the UI.
