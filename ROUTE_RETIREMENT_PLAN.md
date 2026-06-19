# ROUTE RETIREMENT PLAN

This plan maps duplicate and dead endpoints to recommended actions (KEEP, REDIRECT, DEPRECATE, REMOVE) along with a risk assessment for transition planning.

---

## 1. Duplicate & Alias Route Retirement

### A. Mirrored `/api/user/*` Auth Endpoints
- **Current Behavior:** Identical to `/api/auth/*`.
- **Recommendation:** **REDIRECT / DEPRECATE**
  - Add an Express redirect or middleware rewrite mapping `/api/user/(.*)` to `/api/auth/$1`.
  - Log deprecation warnings for any calls to `/api/user/*` to trace legacy frontend callers.
- **Risk Level:** **LOW** (Redirect ensures 100% backward compatibility).

### B. Legacy `/api/products` (Root Mount) Endpoints
- **Current Behavior:** Replicates `/api/marketplace/products` because `products.routes.ts` is mounted at root `""` and `/marketplace`.
- **Recommendation:** **REDIRECT**
  - Change the mount in `server/routes/index.ts` from `""` to `/marketplace` only.
  - Add specific redirect rules mapping `/api/products/*` to `/api/marketplace/products/*`.
- **Risk Level:** **LOW** (Redirect prevents breakage for clients using old URLs).

### C. Accidental `/api/marketplace/merchant/products` Endpoints
- **Current Behavior:** Mounts merchant dashboard logic under the marketplace prefix because `products.routes.ts` is mounted under `/marketplace`.
- **Recommendation:** **REMOVE / BLOCKED**
  - Do not allow merchant CRUD endpoints to be accessible via public `/api/marketplace/...` paths.
  - De-mounting `/marketplace` from the merchant routes is done by splitting `products.routes.ts` into `products.public.routes.ts` and `merchant.routes.ts`.
- **Risk Level:** **MEDIUM** (Ensure the merchant dashboard frontend calls only `/api/merchant/products`).

---

## 2. Dead Route File Cleanup

These files are completely dead and never loaded at startup.

| File Path | Recommendation | Risk Level | Reason |
| :--- | :--- | :--- | :--- |
| `server/routes/vendor.routes.ts` | **REMOVE** | **LOW** | Code is never imported. AI auto-catalog logic is dead. |
| `server/routes/marketplace/vendor-reviews.routes.ts` | **REMOVE** | **LOW** | Redundant file. Product reviews use `reviews.routes.ts` instead. |
| `server/routes/marketplace/vendors.routes.ts` | **REMOVE** | **LOW** | Redundant file. Active vendor lookup is in `stores.routes.ts`. |
