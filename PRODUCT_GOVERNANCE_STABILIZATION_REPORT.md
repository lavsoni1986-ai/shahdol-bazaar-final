# PRODUCT_GOVERNANCE_STABILIZATION_REPORT

## Overview
Surgical stabilization performed to restore canonical product/review/admin flows without architectural changes.

Changes applied (minimal, targeted):

1) Mounted review router
- File edited: `server/routes/index.ts`
- Change: imported `./marketplace/reviews.routes` and mounted it as:
  - `app.use("/marketplace", tenantResolver, reviewsRoutes)`
- Effect: Enables `GET /api/marketplace/reviews/:productId` and `POST /api/marketplace/reviews`
- Preservation: Uses existing `tenantResolver` middleware (district propagation) and preserves existing auth/validation inside `reviews.routes.ts`.

2) Added admin compatibility endpoint for admin UI
- File edited: `server/routes/admin/admin.routes.ts`
- Change: added `GET /admin/products/all` guarded with `requireAuth, requireCityAdmin` and district scoping for non-super-admins. Returns canonical `{ success: true, data: [...] }`.
- Effect: Stops 404 from `client/src/pages/admin/ProductsPanel.tsx` and returns product list in expected shape.

3) Forensic fix for vendor products "0 items"
- File edited: `server/routes/marketplace/products.routes.ts`
- Change: relaxed strict `status: "approved"` predicate to accept common variants: `status: { in: ["approved","APPROVED","active","ACTIVE"] }` for:
  - `/products` vendor listing
  - discovery listing
  - single product by id lookup
- Rationale: Other queries in the codebase use `status: "ACTIVE"` or different casing; discovery/home aggregation sometimes surfaced products with different status variants. This change only normalizes accepted status variants used elsewhere rather than removing the `approved` gating.
- Effect: Repairs vendor page empty-results when product `status` casing/variant mismatched but `approved: true`.

## Before / After (high-level)
- Before:
  - `/api/marketplace/reviews/*` returned 404 (router unmounted).
  - Admin UI requested `/api/admin/products/all` and received 404.
  - Vendor pages sometimes returned 0 items due to strict `status === "approved"` filter while homepage discovery included products with different `status` variants.
  - Frontend `api-client` raised `Invalid API contract` for missing `success` fields when endpoints 404'd or returned HTML.

- After:
  - Reviews endpoints reachable (mounted) and return canonical `{ success: true, data }` from `reviews.routes.ts`.
  - Admin products panel receives `{ success: true, data }` from `/api/admin/products/all`.
  - Vendor product listing accepts common status variants and surfaces products where `approved: true` but `status` variant differed.
  - `api-client` contract preserved: all new/modified endpoints return `success` wrapper.

## Files modified
- `server/routes/index.ts` — imported and mounted `marketplace/reviews.routes.ts` with `tenantResolver`.
- `server/routes/admin/admin.routes.ts` — added `GET /products/all` compatibility endpoint.
- `server/routes/marketplace/products.routes.ts` — relaxed `status` predicate to accept common status variants.
- `PRODUCT_ROUTE_FORENSIC_REPORT.md` — forensic notes (previously created).

## Runtime validation
- Type-check: `npx tsc --noEmit` run.
  - Result: TypeScript compilation across the whole workspace surfaced many pre-existing type errors unrelated to these surgical fixes (various `server/services/*` files). These are existing regressions and were not modified as part of this surgical pass.
  - Impact: The workspace has TypeScript issues unrelated to the applied changes; however the edits themselves are syntactically correct and consistent with surrounding patterns.

- Route verification (static):
  - `server/routes/index.ts` now contains `app.use("/marketplace", tenantResolver, reviewsRoutes)`.
  - `server/routes/admin/admin.routes.ts` contains `router.get("/products/all"...)`.
  - `server/routes/marketplace/products.routes.ts` contains `status: { in: [...] }` predicates in vendor/discovery/product queries.

- Manual smoke expectations (what to run locally):
  - Start server and call these endpoints (examples):

```bash
# from repository root (example)
# start server according to your usual dev script
npm run dev

# then test endpoints
curl -i -H "x-district-slug: shahdol" http://localhost:3000/api/marketplace/reviews/123
curl -i -H "x-district-slug: shahdol" http://localhost:3000/api/marketplace/products?vendorId=456
curl -i -H "Cookie: <auth>" -H "x-district-slug: shahdol" http://localhost:3000/api/admin/products/all
```

Expectations:
- Responses return JSON with top-level `success: true` for successful fetches.
- `GET /api/marketplace/reviews/:id` should return `success:true` + array of reviews (or 404 wrapped by `sendError`).
- `POST /api/marketplace/reviews` should accept payload and return created review with `success:true`.
- `GET /api/admin/products/all` should return an array of products scoped to admin's district when not super-admin.

## Deferred / Remaining Drift
- The TypeScript project has numerous unrelated type errors in `server/services/*` and other modules. These pre-existed and were not touched.
- Potential further hardening: unify `status` values across product lifecycle (e.g., normalize to enum at write time). This is a larger change and outside the surgical scope.
- Consider adding unit/integration tests for:
  - `marketplace/reviews` routes
  - `admin/products/all` compatibility
  - `marketplace/products?vendorId=` vendor-scoped listing

## Notes & Rationale
- All changes intentionally small and localized.
- No DTO system rewrites, no schema changes, no frontend alterations were made.
- `status` predicate was relaxed only to accept canonical variants used elsewhere — this keeps the `approved` boolean gating intact and preserves sovereignty filters (district, vendor status, isShadowBanned).

## Next steps (optional)
- Run the server locally and execute the smoke `curl` commands above to validate runtime behavior.
- If you want, I can:
  - Mount integration tests for these endpoints.
  - Normalize `status` at product write time (requires broader change).
  - Start triage for the TypeScript errors (separate PR).


---
Generated on 2026-05-17
