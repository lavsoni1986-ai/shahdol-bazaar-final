# 🇮🇳 BHARAT-OS Sovereign Marketplace Backend Resurrection Report

## Executive Summary

The marketplace backend is **partially implemented** with the following status:

### ✅ What's Working
- **stores.routes.ts** (`/api/marketplace/stores`) → FULLY FUNCTIONAL  
  Mounted at `app.use("/api/marketplace", storesRoutes)` in `server/index.ts` line 780
  - `GET /api/marketplace/stores` - Fetches stores by district (with tenant isolation)
  - Uses `storesQueryDTO` validation
  - AI-powered ranking via DSSL scores
  - User behavior tracking integrated

- **products.routes.ts** (`/api/marketplace/products`) → FULLY FUNCTIONAL  
  Mounted at `app.use("/api/marketplace/products", productsRoutes)` in `server/index.ts` line 781
  - `GET /api/marketplace/products` - Fetches products by district (with tenant isolation)
  - District ID comes ONLY from `req.districtId` (tenantResolver, never client input)
  - Proper error handling and sorting by vendor DSSL score

### ⚠️ Placeholder File
- **marketplace.ts** (`registerMarketplaceRoutes`) → PLACEHOLDER ONLY  
  Contains only `/api/marketplace/health` endpoint. **NOT mounted** in `server/index.ts`
  - This file is NOT used (no `registerMarketplaceRoutes` call in index.ts)
  - Routes are correctly handled by specialized files (stores.routes.ts, products.routes.ts)

### ✅ Tenant Middleware Order (VERIFIED CORRECT)

In `server/index.ts`:

```typescript
// Line 446: tenantResolver runs FIRST for all /api routes
app.use("/api", tenantResolver);

// Line 452: API caching middleware
app.use('/api', apiCacheMiddleware);

// Line 529-535: Rate limiting (skips auth routes)
app.use('/api/', (req, res, next) => {
  const authRoutes = [...];
  if (authRoutes.some(route => req.path === route)) {
    return next(); // Skip rate limiting for auth
  }
  return apiLimiter(req, res, next);
});

// Line 637-723: Public route bypass middleware
// - Auth routes: SKIP tenant validation
// - Protected routes (/marketplace, /orders, etc.): REQUIRE x-district-slug header
// - Public read-only routes (/health, /categories, /districts): Skip district context
// - Development: Auto-sets x-district-slug='shahdol' if missing

// Line 770: registerSovereignRoutes() mounts /districts, /offers, /categories, /auth, /ai routes

// Line 780-782: Marketplace routes mounted in correct order
app.use("/api/marketplace", storesRoutes);        // MUST come first (no /:id wildcard)
app.use("/api/marketplace/products", productsRoutes); // After storesRoutes
```

### 🔍 Key Findings

1. **No Duplicate/Conflicting Routes**: The specialized route files (`stores.routes.ts`, `products.routes.ts`) handle all marketplace routes correctly. The placeholder `marketplace.ts` is unused.

2. **Tenant Middleware is CORRECT**: 
   - `tenantResolver` runs FIRST (line 446) before any route handlers
   - Public route bypass middleware allows `/api/public/*` and GET `/api/health`, `/api/categories`, `/api/districts` without district context
   - Protected routes REQUIRE `x-district-slug` header
   - Development mode auto-sets default district

3. **District ID Security**: 
   - `req.districtId` is set by `tenantResolver` from `x-district-slug` header
   - NEVER comes from client query/body (except frontend route slugs)
   - Backend uses `req.districtId` for all data filtering

4. **Current Mount Points**:
   - `GET /api/marketplace/stores` → `stores.routes.ts` ✅
   - `GET /api/marketplace/products` → `products.routes.ts` ✅
   - `GET /api/marketplace/health` → Not mounted (placeholder only)

## Frontend Request Flow

When frontend calls `/api/marketplace/products`:

1. Request hits Express server
2. `tenantResolver` middleware (line 446) extracts `x-district-slug` header
3. Resolves district ID from slug
4. Sets `req.districtId`
5. Passes through public route bypass middleware (line 637)
6. Hits route handler in `products.routes.ts` line 57-96
7. Uses `req.districtId` to filter products
8. Returns district-specific products

## Frontend Fix Required

The **frontend `marketplace.tsx`** is using `extractData(res)` which doesn't exist!

**Current (BROKEN):**
```typescript
queryFn: async () => {
  const res = await apiRequest("GET", "/marketplace/products");
  return extractData(res);  // ❌ extractData is NOT imported or defined!
}
```

**Should Be:**
```typescript
queryFn: async () => {
  const res = await apiRequest("GET", "/marketplace/products");
  return getArrayData(res);  // ✅ Single-arg pattern
}
```

## Backend Status: ✅ READY

The backend is **correctly mounted and functional**. The issue is frontend-only:
- `extractData` function is not defined anywhere in codebase
- Should use `getArrayData` (single arg) from `@/lib/api-client`
- Backend correctly handles district isolation via `req.districtId`

## Recommendations

1. **Immediate**: Fix frontend marketplace calls (see App.tsx edits above)
2. **Optional**: Remove placeholder `/server/routes/marketplace.ts` (unused)
3. **Optional**: Add `GET /api/marketplace/health` endpoint to stores.routes.ts if needed
