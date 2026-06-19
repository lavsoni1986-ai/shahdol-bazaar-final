# AUTHORITY_WRITE_MAP

This document maps all write operations to `tenantContext`, `AsyncLocalStorage`, and `districtId` within the BharatOS codebase, indicating their file path, line numbers, reason, and relative execution order.

---

## 1. Map of Write Operations

### 1. `tenantContext.run(...)` (Request Scoping Initialization)

- **File:** [server/index.ts](file:///E:/Shahdol-Bazaar-MVP/server/index.ts#L664) (Line 664)
- **File:** [api/index.ts](file:///E:/Shahdol-Bazaar-MVP/api/index.ts#L232) (Line 232)
- **File:** [api/bootstrap.ts](file:///E:/Shahdol-Bazaar-MVP/api/bootstrap.ts#L93) (Line 93)
- **Reason:** Generates a unique request ID (`requestId`) and initializes the `AsyncLocalStorage` store with a default `districtId` of `-1` (unresolved/guest state).
- **Execution Order:** **1** (Runs immediately upon request entry).

---

### 2. `tenantResolver` Middleware writes (Public & Guest Resolution)

- **File:** [server/middleware/tenantResolver.ts](file:///E:/Shahdol-Bazaar-MVP/server/middleware/tenantResolver.ts#L59) (Line 59 & 64)
  - **Reason:** Authenticated user resolution (in case user is parsed earlier). Overwrites `req.districtId` and `req.ctx.districtId` with the user's verified district ID.
  - **Execution Order:** **2** (Runs after request initialization, before route controllers).

- **File:** [server/middleware/tenantResolver.ts](file:///E:/Shahdol-Bazaar-MVP/server/middleware/tenantResolver.ts#L72) (Lines 72-73)
  - **Reason:** Writes the authenticated user's `districtId` and `userId` directly into the `tenantContext` ALS store.
  - **Execution Order:** **2** (Runs after request initialization, before route controllers).

- **File:** [server/middleware/tenantResolver.ts](file:///E:/Shahdol-Bazaar-MVP/server/middleware/tenantResolver.ts#L99) (Line 99 & 104)
  - **Reason:** Guest resolution. Resolves the `x-district-slug` header, finds the corresponding district in the database, and writes its ID to `req.districtId` and `req.ctx.districtId`.
  - **Execution Order:** **2** (Runs after request initialization, before route controllers).

- **File:** [server/middleware/tenantResolver.ts](file:///E:/Shahdol-Bazaar-MVP/server/middleware/tenantResolver.ts#L111) (Line 111)
  - **Reason:** Guest resolution. Writes the resolved district's ID into the `tenantContext` ALS store.
  - **Execution Order:** **2** (Runs after request initialization, before route controllers).

---

### 3. `requireAuth` Middleware writes (Authenticated Security Context)

- **File:** [server/auth/middleware.ts](file:///E:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L187) (Line 187)
  - **Reason:** Authenticated user fallback. If `req.districtId` is null, assigns `dbUser.districtId`.
  - **Execution Order:** **3** (Runs on route-level execution for protected routes).

- **File:** [server/auth/middleware.ts](file:///E:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L201) (Line 201)
  - **Reason:** populates user-bound `districtId`, `userId`, `role`, and `isAdmin` inside the request context object (`req.ctx`).
  - **Execution Order:** **3** (Runs on route-level execution for protected routes).

- **File:** [server/auth/middleware.ts](file:///E:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L209) (Line 209)
  - **Reason:** Synchronizes request-level tenant authority: `req.districtId = req.ctx.districtId`.
  - **Execution Order:** **3** (Runs on route-level execution for protected routes).

---

### 4. `optionalAuth` Middleware writes (Optional/Session Security Context)

- **File:** [server/auth/middleware.ts](file:///E:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L436) (Line 436)
  - **Reason:** Populates verified user metadata in `req.ctx` when a valid session token is found.
  - **Execution Order:** **3** (Runs on route-level execution for optional auth routes).

- **File:** [server/auth/middleware.ts](file:///E:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L444) (Line 444)
  - **Reason:** Synchronizes request-level tenant authority: `req.districtId = req.ctx.districtId`.
  - **Execution Order:** **3** (Runs on route-level execution for optional auth routes).

- **File:** [server/auth/middleware.ts](file:///E:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L447) (Line 447)
  - **Reason:** Safe fallback synchronization for valid session users where `req.districtId` remains falsy.
  - **Execution Order:** **3** (Runs on route-level execution for optional auth routes).

---

## 2. Execution Order Summary

1. **Request Entry (`tenantContext.run`)**: Binds default context `{ districtId: -1 }`.
2. **Tenant Resolution (`tenantResolver`)**:
   - Resolves guest header (`x-district-slug`) and updates request/store context with target district.
   - Or, if user was already parsed, updates request/store context with user's authentic district.
3. **Authentication (`requireAuth` / `optionalAuth`)**:
   - Validates the user's token against the database.
   - Synchronizes `req.districtId` and `req.ctx.districtId` with database truth.
   - **VULNERABILITY POINT**: Currently fails to update the `tenantContext` ALS store at this stage, resulting in authority divergence when header spoofing occurs.
