# BHARATOS SECURITY RECERTIFICATION REPORT

**Vulnerability ID:** SEV-1-TENANT-SPLIT  
**Classification:** Tenant Isolation Breakdown / Authority Split-Brain  
**Target:** AsyncLocalStorage (ALS) and Express Request Context Synchronization  
**Status:** MITIGATED / CERTIFIED  

---

## 1. Executive Summary

A critical SEV-1 vulnerability was identified where the AsyncLocalStorage store (`tenantContext`), which holds the authoritative `districtId` used by the Prisma engine for multi-tenant query isolation, could diverge from the verified database user identity. 

Following the implementation of the Tenant Authority Recovery Plan, the authority split has been resolved by synchronizing the database-verified user district directly into the `tenantContext` ALS store during request authentication.

**FINAL VERDICT:**  
`TENANT_ISOLATION RESTORED`

---

## 2. Technical Context & Vulnerability Analysis

### The Before State (Split-Brain)
Prior to mitigation, tenant resolution followed two parallel, unaligned paths:
1. **Global Request Entry / Guest Resolution:**
   - `tenantContext.run` initialized ALS to `{ districtId: -1 }`.
   - `tenantResolver` resolved the `x-district-slug` header and mutated the ALS store (`store.districtId = resolvedId`).
2. **User Authentication:**
   - `requireAuth` / `optionalAuth` decoded the JWT, queried the database to find the user's authentic district, and updated `req.districtId` and `req.ctx.districtId`.
   - **THE SPLIT:** The authentication middleware failed to propagate the verified district back to the `tenantContext` ALS store.

### The Attack Path (Exploited)
A malicious authenticated Merchant or City Admin assigned to **Bhopal** (District ID 2) could spoof their header to **Shahdol** (`x-district-slug: shahdol`, District ID 1):
1. The global `tenantResolver` ran, saw the header, and set ALS `districtId = 1` (Shahdol).
2. The `requireAuth` middleware validated the Bhopal user JWT, setting `req.districtId = 2` (Bhopal).
3. The Prisma interceptor ran, querying `tenantContext.getStore()?.districtId` which was still `1` (Shahdol).
4. The user was allowed to query, mutate, or delete Shahdol vendors/products, completely bypassing tenant isolation boundaries.

---

## 3. Mitigation & Implementation Detail

The mitigation establishes **exactly one tenant authority chain** where authenticated users derive authority strictly from verified database identity:

### The After State (Unified Chain)
- **Guest requests:** Resolve via `tenantResolver` -> ALS store.
- **Authenticated requests:** Overwrite ALS store with verified user identity from database inside `requireAuth` and `optionalAuth` before any business logic or Prisma queries execute.

### Applied Changes in `server/auth/middleware.ts`
1. Imported the `tenantContext` store:
   ```typescript
   import { tenantContext } from '../storage';
   ```
2. Added ALS synchronization block in `requireAuth` after verification:
   ```typescript
   const store = tenantContext.getStore();
   if (store) {
     store.districtId = dbUser.districtId ?? -1;
     store.userId = dbUser.id;
   }
   ```
3. Added ALS synchronization block in `optionalAuth` for verified users:
   ```typescript
   const store = tenantContext.getStore();
   if (store) {
     store.districtId = user.districtId ?? -1;
     store.userId = user.id;
   }
   ```

---

## 4. Verification Evidence & Test Results

An automated regression matrix test suite was executed simulating all 8 target scenarios.

### Scenario Run Results

| Scenario | Request URL | Header `x-district-slug` | Auth JWT Identity | Expected District ID | Resolved ALS District ID | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `/api/orders` | `shahdol` | Shahdol Merchant | `1` (Shahdol) | `1` (Shahdol) | **✅ PASS** |
| **B** | `/api/orders` | `shahdol` (Spoof) | Bhopal Merchant | `2` (Bhopal) | `2` (Bhopal) | **✅ PASS** |
| **C** | `/api/orders` | *Missing* | Bhopal Merchant | `BLOCKED` (400) | `BLOCKED` | **✅ PASS** |
| **D** | `/api/orders` | `invalid-district` | Bhopal Merchant | `BLOCKED` (404) | `BLOCKED` | **✅ PASS** |
| **E** | `/api/marketplace/products` | `shahdol` | Guest / Anonymous | `1` (Shahdol) | `1` (Shahdol) | **✅ PASS** |
| **F** | `/api/marketplace/stores` | `bhopal` | Guest / Anonymous | `2` (Bhopal) | `2` (Bhopal) | **✅ PASS** |
| **G** | `/api/merchant/products` | `shahdol` (Spoof) | Bhopal Merchant | `2` (Bhopal) | `2` (Bhopal) | **✅ PASS** |
| **H** | `/api/admin/vendors` | `shahdol` (Spoof) | Bhopal Admin | `2` (Bhopal) | `2` (Bhopal) | **✅ PASS** |

### Test Log Output
```
🚀 STARTING BHARATOS SEV-1 TENANT Isolation TEST SUITE

⏳ Ensuring test database records...
✅ Seeded test users:
  - Shahdol User ID: 60 (District: 1)
  - Bhopal User ID: 61 (District: 2)
  - Bhopal Admin ID: 62 (District: 2)

🏢 [TENANT] GET /api/orders | Slug: shahdol
🏢 [TENANT] ✅ header district resolved: 1 (Shahdol)
Scenario [A. Header=Shahdol JWT=Shahdol]
  - Expected District ID: 1
  - Resolved ALS districtId: 1
  - Verdict: ✅ PASS

🏢 [TENANT] GET /api/orders | Slug: shahdol
🏢 [TENANT] ✅ header district resolved: 1 (Shahdol)
Scenario [B. Header=Shahdol JWT=Bhopal (SPOOF ATTACK)]
  - Expected District ID: 2
  - Resolved ALS districtId: 2 (Ignored spoofed header!)
  - Verdict: ✅ PASS

🏢 [TENANT] GET /api/orders | Slug: MISSING
Scenario [C. Missing Header JWT=Bhopal]
  - Expected District ID: BLOCKED
  - Resolved ALS districtId: BLOCKED (400 Bad Request)
  - Verdict: ✅ PASS

🏢 [TENANT] GET /api/orders | Slug: invalid-district
Scenario [D. Invalid Header JWT=Bhopal]
  - Expected District ID: BLOCKED
  - Resolved ALS districtId: BLOCKED (404 District not found)
  - Verdict: ✅ PASS

🏢 [TENANT] GET /api/marketplace/products | Slug: shahdol
🏢 [TENANT] ✅ header district resolved: 1 (Shahdol)
Scenario [E. Guest Marketplace Browse]
  - Expected District ID: 1
  - Resolved ALS districtId: 1
  - Verdict: ✅ PASS

🏢 [TENANT] GET /api/marketplace/stores | Slug: bhopal
🏢 [TENANT] ✅ header district resolved: 2 (Bhopal)
Scenario [F. Guest Store Page]
  - Expected District ID: 2
  - Resolved ALS districtId: 2
  - Verdict: ✅ PASS

🏢 [TENANT] GET /api/merchant/products | Slug: shahdol
🏢 [TENANT] ✅ header district resolved: 1 (Shahdol)
Scenario [G. Merchant Dashboard (SPOOF ATTACK)]
  - Expected District ID: 2
  - Resolved ALS districtId: 2 (Ignored spoofed header!)
  - Verdict: ✅ PASS

🏢 [TENANT] GET /api/admin/vendors | Slug: shahdol
🏢 [TENANT] ✅ header district resolved: 1 (Shahdol)
Scenario [H. Admin Dashboard (SPOOF ATTACK)]
  - Expected District ID: 2
  - Resolved ALS districtId: 2 (Ignored spoofed header!)
  - Verdict: ✅ PASS

====================================================
FINAL RESULTS SUMMARY: ALL SCENARIOS PASSED
====================================================
VERDICT: TENANT ISOLATION RESTORED 🎉
```

---

## 5. Remaining Risks & Recommendations

- **No New Risks Introduced:** The changes do not touch database logic or caching headers. They enforce existing security profiles on the ALS thread.
- **Future Hardening:** Over time, it is recommended to transition to **Option B** (limiting `tenantResolver` purely to unauthenticated routes) to minimize the attack surface area of headers and reduce processing overhead on authenticated routes.
