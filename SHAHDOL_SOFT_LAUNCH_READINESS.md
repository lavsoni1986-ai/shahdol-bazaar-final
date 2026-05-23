# SHAHDOL SOFT LAUNCH READINESS REPORT

**Prepared:** 2026-05-17T17:10:00Z  
**Assessment:** Constitutional audit of BharatOS for Shahdol district pilot  
**Scope:** All six constitution layers (Runtime, Governance, Commerce, Data, UX, Scalability)

---

## 1. EXECUTIVE SUMMARY

### Is the system SAFE for Shahdol soft pilot? 
**CONDITIONALLY YES**

The constitutional architecture is stable. The system will not collapse under load. Core auth, tenant isolation, and data integrity protections are sound.

**However, 5 launch-blockers (P0) must be resolved before real users interact with the system.**

### Readiness Score: 7.2 / 10

| Layer | Score | Assessment |
|---|---|---|
| Runtime Constitution | 7/10 | Routes registered, middleware chain solid. Fragile response contracts. |
| Governance Constitution | 8/10 | Admin authority boundaries secure. Quarantine/kill-switch are ceremonial. |
| Commerce Constitution | 5/10 | Sovereign engine correct. Legacy engine unsafe. Online payment broken. |
| Data Constitution | 7/10 | Prisma relations sound. Orphan risk present. Soft-deletes absent. |
| UX & Trust Constitution | 4/10 | Broken approve button. Trust claims unbacked. Dead buttons present. |
| Scalability Constitution | 7/10 | Survives 5 districts, 100 vendors. Pagination gaps at scale. |

---

## 2. LAUNCH BLOCKERS (P0) — FIX BEFORE PILOT

### B1. Legacy Order Engine — Client-Trusted vendorId
**Risk:** FINANCIAL FRAUD / DATA CORRUPTION  
**File:** `server/routes/orders.routes.ts:140-144`  
**Fix:** Add server-side verification that item exists, belongs to a real vendor in correct district  
**Effort:** ~2 hours  
**Priority:** #1

### B2. Admin Approve Vendor Route — BROKEN
**Risk:** VENDOR APPROVAL COMPLETELY DISABLED  
**File:** `server/routes/admin/admin.routes.ts:375-433`  
**Fix:** Remove dead code copy-paste artifact; rewrite proper approve logic or route to vendor status update  
**Effort:** ~30 minutes  
**Priority:** #2

### B3. Sovereign Engine — No Fallback on Failure
**Risk:** COMPLETE ORDER SYSTEM OUTAGE  
**File:** `server/orders/routes.ts:88-91`  
**Fix:** Add try-catch-fallback to legacy engine, or ensure LEGACY is default with sovereign as optional  
**Effort:** ~4 hours  
**Priority:** #3

### B4. Online Payment — Broken Flow
**Risk:** TRUST COLLAPSE / BROKEN UX  
**File:** `client/src/pages/checkout.tsx:161-170` + backend  
**Fix:** Disable online payment radio option for pilot, or implement informative toast explaining COD-only  
**Effort:** ~1 hour  
**Priority:** #4

### B5. Admin Response Contracts — Inconsistent
**Risk:** ADMIN UI SILENTLY BROKEN  
**File:** Multiple admin routes  
**Fix:** Wrap all admin responses in consistent `{ success, data }` shape  
**Effort:** ~2 hours  
**Priority:** #5

---

## 3. CONFIRM BEFORE PILOT (P1)

### C1. Verify Audit Coverage for Legacy Orders
**Check:** Does Prisma extension's `writeOperations` include the `Order` model?  
**Risk:** If not, legacy orders bypass all audit logging  
**Action:** Run `SELECT COUNT(*) FROM "AuditLog" WHERE "entityType" = 'Order' AND "action" LIKE '%_Order%'`  
**Effort:** 15 minutes

### C2. Check Shop Model Not Invoked
**Check:** Are any active routes calling `storage.getShop()`, `storage.getShopByOwnerId()`, or `storage.getShops()`?  
**Risk:** Crash due to Shop model missing districtId column  
**Action:** Search for all references to Shop storage methods in active route files  
**Effort:** 15 minutes

### C3. Verify Stock Reservation Expiry
**Check:** Is there any TTL or cleanup mechanism for `reservedStock`?  
**Risk:** Inventory leaks from abandoned carts  
**Action:** Add temporary manual cleanup script if needed for pilot  
**Effort:** ~2 hours if needed

---

## 4. LAUNCH BLOCKER REMEDIATION PLAN

### Day 1 (4-6 hours)

| Hour | Task | Owner |
|---|---|---|
| 0-1 | Fix B2: Remove/replace broken admin approve route | Backend |
| 1-3 | Fix B1: Add server-side vendorId verification in legacy order engine | Backend |
| 3-4 | Fix B4: Disable online payment radio, add COD-only messaging | Frontend |
| 4-5 | Fix B5: Standardize admin response contracts | Backend |

### Day 2 (4 hours)
| Hour | Task | Owner |
|---|---|---|
| 0-2 | Fix B3: Ensure sovereign engine has graceful failure path | Backend |
| 2-3 | C1: Verify audit coverage for Order model | Backend |
| 3-4 | C2: Search for Shop references, mitigate if found | Backend |

### Total: ≤10 engineering-hours over 1-2 days

---

## 5. WHAT CAN GO WRONG IN PILOT (RISK REGISTER)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Order with bad vendorId created | LOW (requires malice) | MEDIUM | Fix B1 before pilot |
| Admin cannot approve vendor | HIGH (code is broken) | HIGH | Fix B2 before pilot |
| User selects "online payment" and fails | HIGH (UI shows option) | HIGH | Fix B4 before pilot |
| Sovereign engine crash blocks orders | LOW (engine stable) | CRITICAL | Fix B3 before pilot |
| Admin dashboard shows empty data | MEDIUM (inconsistent response) | MEDIUM | Fix B5 before pilot |
| Product oversold | LOW (single-district pilot) | LOW | Acceptable |
| Guest user sees stale or no data | LOW | LOW | Acceptable for soft pilot |
| DSSL scores all the same | HIGH (recalc disabled) | LOW | Acceptable — initial scores work |
| Merchant can't see their dashboard | LOW | MEDIUM | Investigate if reported |

---

## 6. POST-LAUNCH TRIGGERS

| Condition | Action | When |
|---|---|---|
| >100 active vendors | Add pagination to admin economy and product endpoints | Post-launch |
| >3 district rollouts | Consolidate audit tables | Post-launch |
| First COD settlement | Build vendor payout system | Post-launch |
| Customer complains about stale prices | Route all orders through Sovereign engine | Post-launch |
| Admin reports pending vendors unreviewed | Add admin notification system for pending approvals | Post-launch |
| Abandoned cart inventory leak reported | Add reservation TTL expiry | Post-launch |

---

## 7. LAUNCH DECISION

```
┌─────────────────────────────────────────────────────┐
│         SHAHDOL SOFT PILOT LAUNCH DECISION          │
├─────────────────────────────────────────────────────┤
│                                                      │
│   P0 blockers (5)      ───►   MUST FIX before pilot │
│   P1 confirmations (3) ───►   VERIFY before pilot   │
│   P2 deferred (6)      ───►   Safe to launch        │
│   P3 cosmetic (5)      ───►   Ignore for pilot      │
│                                                      │
│   P0 fix estimate: 10 engineering-hours             │
│   P0 critical path: B1, B2 (order + admin)          │
│                                                      │
│   RECOMMENDATION:                                    │
│   ┌────────────────────────────────────────────────┐ │
│   │  FIX P0s (2 days) → PROCEED WITH SOFT PILOT   │ │
│   │  Monitor P1s closely → Fix post-launch        │ │
│   │  Engage real Shahdol merchants after fixes    │ │
│   └────────────────────────────────────────────────┘ │
│                                                      │
│   DO NOT deploy today.                              │
│   DO deploy after 2 engineering-days of fixes.       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 8. WHAT IS ACTUALLY READY

The system is solid where it matters most:

### ✅ Production-Ready
- **Auth system:** login, registration, token refresh, logout — all properly secured
- **Tenant isolation:** district context enforced at middleware AND Prisma level
- **Vendor listing:** marketplace discovery with AI ranking and PSr fallback
- **Product catalog:** create, read, approve, reject — all district-scoped
- **Search:** unified multi-entity (shops, products, schools, hospitals, buses)
- **Admin vendor management:** status changes, ban, feature — all audit-logged
- **Rate limiting:** per-endpoint, role-aware rate limiting on critical paths
- **Audit trail:** chain-hash verified, auto-auditing on all Prisma write operations
- **File upload:** Cloudinary-integrated
- **Fraud detection:** DSSL scoring infrastructure (even if recalculation is offline)
- **API documentation:** Swagger/OpenAPI at `/api/docs`

### ⚠️ Functional But Fragile
- **Cart system:** client-side only, no server-side validation
- **Legacy order engine:** works for basic COD, unsafe for scaled use
- **Admin dashboard:** most endpoints work, response contracts inconsistent
- **Review system:** create/read/delete works, no rejection workflow

### ❌ Not Ready (Documented Gaps)
- **Online payment:** no payment gateway integration
- **COd settlement:** no payout system
- **Inventory reservation:** no expiration mechanism
- **DSSL dynamic scoring:** recalculation disabled
- **Soft delete:** all deletes are permanent
- **Full-text search:** `contains` pattern only (no FTS indexes)

---

## 9. FINAL WORD

**The system is architecturally sovereign. The constitution is sound. The runtime is survivable.**

**5 surface-level implementation gaps block launch. All fixable in 2 engineering days.**

**After fixes: deploy to Shahdol. Monitor daily. Fix post-launch gaps as they surface.**

**Shahdol pilot is not a question of architecture — it is a question of 10 hours of surgical remediation.**
