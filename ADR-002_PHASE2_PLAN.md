# ADR-002 PHASE 2 PLAN: ROUTE OWNERSHIP CONSOLIDATION

This plan outlines the execution phases for consolidating route ownership, deprecating alias paths, and cleaning up dead code.

---

## Phase 2A: Canonical Routes (Router Splitting)

### Objective
Resolve the double-mounting of `products.routes.ts` (currently mounted at root `""` and `/marketplace`) by splitting it into two distinct routers.

### Task Checklist
1. **Split `products.routes.ts`**:
   - Extract public discovery endpoints (`/products`, `/products/slug/:slug`, `/products/:entityKey`) into a new file: `server/routes/marketplace/products.public.routes.ts`.
   - Extract private merchant endpoints (`/merchant/products`, `/merchant/products/:id/images`, etc.) into a new file: `server/routes/merchant.routes.ts`.
2. **Re-mount in `server/routes/index.ts`**:
   - Mount `products.public.routes.ts` at `/marketplace` prefix.
   - Mount `merchant.routes.ts` at `""` prefix (since it defines paths starting with `/merchant`).
   - Remove the duplicate mounts of the old `products.routes.ts` file.

---

## Phase 2B: Alias Retirement (Backward Compatibility)

### Objective
Deprecate the mirror routes `/api/user/*` and legacy root `/api/products/*` by introducing explicit redirect and rewrite rules.

### Task Checklist
1. **Add Auth Redirect Middleware**:
   - In `server/routes/index.ts`, add a redirect handler for all incoming requests to `/api/user/*`:
     ```typescript
     router.all("/user/*", (req, res) => {
       const target = req.originalUrl.replace("/api/user/", "/api/auth/");
       console.log(`[DEPRECATED] Alias call received: ${req.originalUrl} -> Redirecting to: ${target}`);
       return res.redirect(301, target);
     });
     ```
2. **Add Products Redirect Middleware**:
   - In `server/routes/index.ts`, add a redirect handler for legacy root-level products requests:
     ```typescript
     router.all("/products/*", (req, res) => {
       const target = req.originalUrl.replace("/api/products/", "/api/marketplace/products/");
       console.log(`[DEPRECATED] Alias call received: ${req.originalUrl} -> Redirecting to: ${target}`);
       return res.redirect(301, target);
     });
     ```

---

## Phase 2C: Dead Route Cleanup (File Deletion)

### Objective
Clean up the filesystem by removing legacy route files that are not imported by the Express application.

### Files to Delete
1. `server/routes/vendor.routes.ts`
2. `server/routes/marketplace/vendor-reviews.routes.ts`
3. `server/routes/marketplace/vendors.routes.ts`
4. Unused editor backup files (e.g. `products.routes.ts.new`, `stores.routes.ts.new`).
