# CSRF LIFECYCLE AUDIT REPORT

**Target Environment:** Shahdol Bazaar MVP  
**Audit Date:** June 20, 2026  
**Auditor:** Antigravity AI  
**Scope:** Complete verification of CSRF bootstrap lifecycle, login flows, and client-side integration  

---

## 1. CSRF Endpoint Analysis

### 1.1 Endpoint Specifications
* **Target Endpoint**: `GET /api/auth/csrf-token`
* **Exact Route File**: [auth.routes.ts](file:///e:/Shahdol-Bazaar-MVP/server/routes/auth.routes.ts) (line 240)
* **Exact Middleware Chain**:
  1. Global Express Middlewares (Compression, CORS, Cookie Parser, Rate Limiting, Helmet, Logger)
  2. `requireAuth` (defined in [middleware.ts](file:///e:/Shahdol-Bazaar-MVP/server/auth/middleware.ts#L153))
  3. Route Handler (defined in [auth.routes.ts](file:///e:/Shahdol-Bazaar-MVP/server/routes/auth.routes.ts#L240))
* **Auth Requirement**: **YES**. Access is restricted via the `requireAuth` middleware. Unauthenticated users (including guest profiles) will receive a `401 Unauthorized` response before a token can be generated.

### 1.2 Cookie Attributes set by GET `/csrf-token` Response
When the server responds successfully, it sets the `csrfToken` cookie with the following attributes:
* **Cookie Name**: `csrfToken`
* **httpOnly**: `true` (Inaccessible to client-side scripts via `document.cookie`)
* **secure**: `process.env.NODE_ENV === "production"` (`true` in production, `false` in local development)
* **sameSite**: `process.env.NODE_ENV === "production" ? "none" : "lax"` (Uses `lax` in local development to permit localhost cookie propagation)
* **maxAge**: `3600000` milliseconds (1 hour)
* **path**: `"/"`

---

## 2. Login Flow Verification

Upon a successful login request (`POST /api/auth/login`) or registration (`POST /api/auth/register`):
1. **CSRF Generation**: **None**. The backend does not generate a CSRF token or set the `csrfToken` cookie during the authentication handler execution.
2. **Cookie Creation**: Only the `accessToken` (15-minute lifespan) and `refreshToken` (7-day lifespan) cookies are created. The `csrfToken` cookie is **not** created automatically.
3. **Frontend Action Required**: The frontend client must **explicitly perform a subsequent call** to `GET /api/auth/csrf-token` once authenticated in order to establish the CSRF token and cookie.

---

## 3. Frontend Bootstrap Audit

A complete codebase search was performed for CSRF integration points on the client side:
* **`csrf.ts`**: The client-side CSRF utility [csrf.ts](file:///e:/Shahdol-Bazaar-MVP/client/src/lib/csrf.ts) implements `fetchCsrfToken()` and `getCsrfToken()`. However, this file is **never imported or referenced** by any other file in the application.
* **`fetchCsrfToken()`**: Never invoked. The function is entirely dead code.
* **`getCsrfToken()`**: Never invoked.
* **`AuthContext`**: The context provider [AuthContext.tsx](file:///e:/Shahdol-Bazaar-MVP/client/src/contexts/AuthContext.tsx) has **no references** to CSRF.
* **`apiRequest`**: The API client [api-client.ts](file:///e:/Shahdol-Bazaar-MVP/client/src/lib/api-client.ts) does not import `csrf.ts` and does not attach the `x-csrf-token` header to outgoing requests.
* **Login Page**: The login page [auth.tsx](file:///e:/Shahdol-Bazaar-MVP/client/src/pages/auth.tsx) submits auth credentials but contains no code to fetch or trigger a CSRF session setup.
* **Session Hydration**: The session hydration workflow (`checkAuth` in `AuthContext`) verifies the JWT session via `GET /auth/verify` but does not initiate a CSRF token bootstrap.

---

## 4. Integration Sequences

### 4.1 Current Sequence
```
User Login (POST /api/auth/login)
↓
HTTP 200 (Sets JWT accessToken & refreshToken cookies)
↓
window.location.href Redirect to Dashboard
↓
Session Hydration (GET /api/auth/verify)
↓
❌ [MISSING] CSRF Bootstrap (GET /api/auth/csrf-token is never called)
↓
❌ [MISSING] csrfToken Cookie NOT Set on Client
↓
❌ [MISSING] CSRF Token NOT Cached in Client Memory
↓
Order Placement Request (POST /api/orders)
↓
❌ [MISSING] x-csrf-token Header NOT Attached in apiRequest()
↓
Server requireCSRF Interceptor Fails (Cookie and Header missing)
↓
Request Rejected (403 AUTH_REQUIRED / "CSRF token required")
```

### 4.2 Required Sequence
```
User Login (POST /api/auth/login)
↓
HTTP 200 (Sets JWT accessToken & refreshToken cookies)
↓
window.location.href Redirect to Dashboard
↓
Session Hydration (GET /api/auth/verify)
↓
👉 [BOOTSTRAP] Frontend calls fetchCsrfToken() -> GET /api/auth/csrf-token
↓
👉 [STORE] csrfToken Cookie Set & Token Cached in Client Memory
↓
CSRF Ready
↓
Order Placement Request (POST /api/orders)
↓
👉 [HEADER] x-csrf-token Header Attached in apiRequest()
↓
Server requireCSRF Interceptor Matches Cookie vs Header
↓
requireAuth Passes & Order Processed Successfully
```

---

## 5. Key Question: Can authenticated users currently obtain a valid CSRF token at all?

### Answer: **YES** (via manual API invocation) / **NO** (via normal application usage)

#### Why YES (API Perspective):
If a client has a valid, active session (i.e. possesses a valid `accessToken` cookie), they can make a direct call to the `GET /api/auth/csrf-token` endpoint. The server will authenticate the request, generate the token, store it in the HTTP-only cookie, and return it in the JSON payload:

```
[Request]
GET /api/auth/csrf-token
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

[Response]
HTTP/1.1 200 OK
Set-Cookie: csrfToken=d42b93f7e...; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax
{
  "success": true,
  "data": {
    "csrfToken": "d42b93f7e..."
  }
}
```

#### Why NO (Application Perspective):
Because the frontend application completely bypasses the CSRF fetch sequence, the token is never requested during login, registration, or session hydration. Consequently, during a normal user workflow on the frontend:
1. The `csrfToken` cookie is **never created**.
2. The CSRF token is **never cached** in client memory.
3. The `x-csrf-token` header is **never attached** to mutating requests.

**Exact missing steps causing the failure:**
1. **Omitted Bootstrap**: The client-side bootstrap flow (in [AuthContext.tsx](file:///e:/Shahdol-Bazaar-MVP/client/src/contexts/AuthContext.tsx)) does not invoke `fetchCsrfToken()` when transitioning into the `"authenticated"` state.
2. **Omitted Header Injection**: The client-side fetch client (in [api-client.ts](file:///e:/Shahdol-Bazaar-MVP/client/src/lib/api-client.ts)) does not retrieve `getCsrfToken()` to inject it as the `x-csrf-token` header.
