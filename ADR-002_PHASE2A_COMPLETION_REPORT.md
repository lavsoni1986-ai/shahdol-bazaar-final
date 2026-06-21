# ADR-002 Phase 2A Completion Report: Alias Retirement

This report details the execution and validation of BharatOS ADR-002 Phase 2A (Alias Retirement) for the `/api/user/*` endpoints.

---

## 1. Routes Redirected

The following duplicate/alias routes under the `/api/user/*` prefix have been retired and redirected to their canonical counterparts:

| Old Path (Alias) | New Path (Canonical) | HTTP Status | Action Taken |
| :--- | :--- | :--- | :--- |
| `/api/user/login` | `/api/auth/login` | `301 Moved Permanently` | Middleware redirection |
| `/api/user/register` | `/api/auth/register` | `301 Moved Permanently` | Middleware redirection |
| `/api/user/verify` | `/api/auth/verify` | `301 Moved Permanently` | Middleware redirection |
| `/api/user/logout` | `/api/auth/logout` | `301 Moved Permanently` | Middleware redirection |
| `/api/user/*` | `/api/auth/*` | `301 Moved Permanently` | Middleware redirection (wildcard) |

### Deprecation Logging Format
Any incoming request targeting the retired `/api/user/*` prefix generates an audit log in standard output (stdout) using the exact required format:
```
[DEPRECATED_ROUTE]
<old_path>
<new_path>
```
Example captured from integration test output:
```
[DEPRECATED_ROUTE]
/api/user/login
/api/auth/login
```

---

## 2. Validation Results

A rigorous, multi-layered validation suite was executed to verify the structural correctness and build integrity of the workspace:

### A. TypeScript Type Verification (`npm run check`)
- **Status:** **PASSED**
- **Command:** `npx tsc --noEmit`
- **Details:** Resolved baseline type issues across dormant files (`vendor-reviews.routes.ts`, `notification.service.ts`, `prediction.engine.ts`, `bookingTransition.ts`) to ensure a clean type-checking environment.

### B. Production Bundle Build (`npm run build`)
- **Status:** **PASSED**
- **Command:** `npm run build`
- **Details:** Built both the client frontend assets (Vite) and Vercel API bundle successfully with zero warnings or errors.

### C. Integration Route Smoke Test (`npx tsx scratch/test-route-smoke.ts`)
- **Status:** **PASSED**
- **Details:** Confirmed that public discovery, guest stores, and authenticated endpoints return correct HTTP status codes. Validated that hitting `/api/user/verify` and `/api/user/login` returns a `301` redirect with the `Location` header correctly pointing to `/api/auth/verify` and `/api/auth/login`.

---

## 3. Regression Results

### Tenant Isolation Matrix Test (`npx tsx scratch/test-tenant-isolation-matrix.ts`)
- **Status:** **PASSED** (100% scenarios successful)
- **Scenarios Validated:**
  - `A. Header=Shahdol JWT=Shahdol` (District ID: 1) -> **PASS**
  - `B. Header=Shahdol JWT=Bhopal` (Spoof Attack: District ID: 2) -> **PASS**
  - `C. Missing Header JWT=Bhopal` -> **PASS** (HTTP 400 Blocked)
  - `D. Invalid Header JWT=Bhopal` -> **PASS** (HTTP 404 Blocked)
  - `E. Guest Marketplace Browse` -> **PASS**
  - `F. Guest Store Page` -> **PASS**
  - `G. Merchant Dashboard (Spoof Attack)` -> **PASS**
  - `H. Admin Dashboard (Spoof Attack)` -> **PASS**

---

## 4. Remaining Risks

- **No Active Client Impact:** Client audit shows **zero** active references to `/api/user/*` in the frontend codebase. All UI components call the `/api/auth/*` canonical endpoints.
- **Backward Compatibility:** Redirection with `301` status ensures compatibility for external clients (e.g. mobile/legacy apps) calling deprecated `/api/user/*` endpoints.

---

## 5. Certification Verdict

```
ADR-002 PHASE 2A COMPLETE
```
