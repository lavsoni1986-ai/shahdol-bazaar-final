# FORENSIC AUDIT REPORT: CHECKOUT ORDER FLOW FAILURE

**Target Environment:** Shahdol Bazaar MVP  
**Audit Date:** June 20, 2026  
**Auditor:** Antigravity AI  
**Scope:** Forensic tracing of order placement flow failure (`POST /api/orders`)  

---

## 1. Executive Summary

A forensic audit of the checkout and order placement flow in the Shahdol Bazaar MVP was performed. The investigation reveals that order placement fails with a **`403 Forbidden`** response containing `ErrorCode.AUTH_REQUIRED` ("CSRF token required") due to two critical frontend gaps and a backend validation masking effect:

1. **Frontend CSRF Omission**: The client application implements a CSRF utility (`client/src/lib/csrf.ts`) but **never invokes or imports it**. As a result, mutating requests from the frontend, including order placements, never include the required `x-csrf-token` header.
2. **Permissive Auth Gating**: The frontend checkout validation engine (`client/src/checkout/validation.ts`) treats guest status (`authState === "guest"`) as ready for checkout. It permits guest users to view the checkout page and submit the form, even though guest checkouts are entirely unsupported by the backend.
3. **Backend Error Masking**: Both CSRF validation failures and authentication check failures return the same `ErrorCode.AUTH_REQUIRED` identifier, masking CSRF token absence as a general auth failure.

---

## 2. Endpoint & Middleware Stack Trace

### 2.1 Target Endpoint
* **HTTP Method**: `POST`
* **Route**: `/api/orders`
* **Route Handler File**: [orders.routes.ts](file:///e:/Shahdol-Bazaar-MVP/server/routes/orders.routes.ts) (line 39)
* **Router Mounting File**: [index.ts](file:///e:/Shahdol-Bazaar-MVP/server/routes/index.ts) (line 374)

### 2.2 Middleware Stack Execution Order (Chronological)
When a request is sent to `POST /api/orders`, it executes through the following layers:

1. **Global Security & Compression** (defined in [server/index.ts](file:///e:/Shahdol-Bazaar-MVP/server/index.ts))
   * `compression()`: Compresses outgoing responses.
   * `centralizedCors`: Applies CORS headers.
   * `cookieParser()`: Parses client cookies (including `accessToken` and `csrfToken`).
   * `rateLimit()`: Applies global API rate limits (skipped on Vercel).
   * `helmet()`: Inserts security-related HTTP headers.
2. **Logging & Utility Headers**
   * Request logging middleware (logs API method and path).
   * Custom security headers middleware (injects HSTS, X-Content-Type-Options, X-Frame-Options).
   * `apiCacheMiddleware`: Edge caching configuration.
   * Body parsers: `express.json()` and `express.urlencoded()`.
   * Request ID Generator: Instantiates UUID in `AsyncLocalStorage`.
3. **Context Resolvers**
   * `tenantResolver`: Extracts district and tenant context.
   * Route categorization: Maps `req.requiresAuth = true`.
4. **Router Mount Middleware** (defined in [routes/index.ts](file:///e:/Shahdol-Bazaar-MVP/server/routes/index.ts))
   * **`requireCSRF`**: Executed first for any route under `/orders`.
5. **Route-Level Middleware** (defined in [routes/orders.routes.ts](file:///e:/Shahdol-Bazaar-MVP/server/routes/orders.routes.ts))
   * **`requireAuth`**: Executed after CSRF validation. Extracts JWT and checks database user record.
   * **`validate(createOrderSchema, 'body')`**: Validates request body schema using Zod.
6. **Controller Handler**: Order engine routing (Sovereign Engine or legacy fallback).

---

## 3. Authentication Path Investigation

### 3.1 Protection Level of `/api/orders`
The endpoint `/api/orders` is strictly protected by `requireAuth` on the backend route definition level:
```typescript
router.post("/", requireAuth, validate(createOrderSchema, 'body'), async (req: Request, res: Response) => { ... })
```
It requires a valid JWT `accessToken` cookie or `Authorization` header.

### 3.2 Guest Checkout Support
* **Database Schema Support**: Nullable columns exist for `userId` in both `Order` and `SovereignOrder` tables (e.g., `userId Int?`).
* **Backend Application Support**: **Unsupported**. Because the route is gated by `requireAuth`, any request without a valid user session is rejected with `401 Unauthorized` (`ErrorCode.AUTH_REQUIRED`, `"No token"`) before the handler runs.
* **Frontend Checkout Page Gating**: **Broken**. 
  * The `useCheckoutReady` hook and `validateCheckoutState` in [validation.ts](file:///e:/Shahdol-Bazaar-MVP/client/src/checkout/validation.ts) only check if auth is initialized, not loading, and not in the "loading" state.
  * If `authState` is `"guest"`, it returns `valid: true` (Auth confirmed).
  * This allows guest users to see and submit the checkout page, which invariably fails upon API submission.

---

## 4. CSRF Path Investigation

### 4.1 CSRF Validation Mechanism
* **Pattern**: Double-Submit Cookie Pattern.
* **Validation Location**: `requireCSRF` in [middleware.ts](file:///e:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L126-L151).
* **Expected Cookie**: `csrfToken`
* **Expected Header**: `x-csrf-token`
* **Request Body Expectations**: None. The validation relies strictly on matching the header token with the cookie token.

### 4.2 Token Generation
* **CSRF Endpoint**: `GET /api/auth/csrf-token` (defined in [auth.routes.ts](file:///e:/Shahdol-Bazaar-MVP/server/routes/auth.routes.ts#L240-L268)).
* **Security Guard**: Protected by `requireAuth`. **Guest users cannot fetch a CSRF token.**
* **Token Output**: Returns `{ success: true, data: { csrfToken: "..." } }` and sets an HttpOnly cookie `csrfToken`.

---

## 5. Frontend Request Audit

### 5.1 Click Trace
1. **Interactive Element**: The **Place COD Order** button is located in [checkout.tsx](file:///e:/Shahdol-Bazaar-MVP/client/src/pages/checkout.tsx#L399-L413).
2. **Submit Handler**: Triggers `handlePlaceOrder` (defined in [checkout.tsx](file:///e:/Shahdol-Bazaar-MVP/client/src/pages/checkout.tsx#L153-L258)).
3. **API Invocation**: Calls `apiRequest("POST", "/orders", { ... })` (defined in [api-client.ts](file:///e:/Shahdol-Bazaar-MVP/client/src/lib/api-client.ts#L101)).

### 5.2 CSRF Attachment Audit
* The module [csrf.ts](file:///e:/Shahdol-Bazaar-MVP/client/src/lib/csrf.ts) implements `fetchCsrfToken()` and `getCsrfToken()`.
* **Zero Usage**: Neither function is imported or called anywhere in the application.
* **Header Omission**: The `apiRequest` utility does not look up or attach the `x-csrf-token` header.
* **Result**: All mutating requests (POST, PUT, DELETE) lack the CSRF token header, failing `requireCSRF` verification on the server.

---

## 6. Exact Rejection Location and Cause

When a user attempts to submit an order:
1. The request hits the server and matches `/api/orders`.
2. The `requireCSRF` middleware interceptor executes first.
3. The server checks the cookie and the header:
   ```typescript
   const cookieToken = (req.cookies as any)?.csrfToken;
   const headerToken = req.headers['x-csrf-token'] as string;
   ```
4. Since the frontend never requests a CSRF token and never includes the header, both are `undefined`.
5. The request is rejected at [middleware.ts](file:///e:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L138-L140):
   * **Status Code**: `403 Forbidden`
   * **Payload**: `{ "success": false, "error": { "code": "AUTH_REQUIRED", "message": "CSRF token required" } }`

---

## 7. Categorization & Remediation Plan

### 7.1 Issue Categorization
* **Authentication Gating**: Frontend Defect (permissive validation logic).
* **CSRF Failure**: Frontend Defect (omitted utility execution and header injection).
* **Error Clarity**: Backend Defect (misleading `AUTH_REQUIRED` code for CSRF mismatch).

### 7.2 Recommended Fixes (Do Not Apply - Reference Only)

#### 1. Fix Frontend Checkout Gating
Modify `validateAuth` in `client/src/checkout/validation.ts` to reject guest users:
```typescript
if (input.authState !== "authenticated") {
    return {
        scope: "auth",
        valid: false,
        severity: "error",
        reason: "auth_required",
        message: "You must be logged in to complete your checkout.",
        errorCode: "AUTH_004",
    };
}
```

#### 2. Bootstrap and Inject CSRF Token
Update the frontend app bootstrap sequence (e.g., in `AuthContext` or `App.tsx`) to fetch a CSRF token upon successful authentication:
```typescript
import { fetchCsrfToken } from "@/lib/csrf";
// Call fetchCsrfToken() right after user login / session hydration completes
```
Update `apiRequest` in `client/src/lib/api-client.ts` to inject the CSRF token:
```typescript
import { getCsrfToken } from "./csrf";

// Inside apiRequest...
const headers: Record<string, string> = {
  "x-district-slug": resolveCanonicalDistrictSlug(),
  ...options?.headers,
};

const csrfToken = getCsrfToken();
if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
  headers["x-csrf-token"] = csrfToken;
}
```

#### 3. Standardize Backend CSRF Errors
Update `requireCSRF` in `server/auth/middleware.ts` to return `CSRF_INVALID` or `FORBIDDEN` instead of `AUTH_REQUIRED` to prevent validation masking:
```typescript
if (!cookieToken || !headerToken) {
  return sendError(res, 403, ErrorCode.FORBIDDEN, "CSRF token required");
}
```
