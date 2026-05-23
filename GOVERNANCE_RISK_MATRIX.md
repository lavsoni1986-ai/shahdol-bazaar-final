# GOVERNANCE RISK MATRIX — BHARATOS SHAHDOL PILOT

**Identifies privilege escalation paths, audit gaps, governance bypass risks, and moderation inconsistencies.**

---

## RISK CLASSIFICATION

| Severity | Definition |
|---|---|
| CRITICAL | System compromise — data loss, privilege escalation, governance bypass |
| HIGH | Significant trust erosion — undetected fraud, moderation bypass |
| MEDIUM | Operational risk — audit gaps, process friction |
| LOW | Informational — minor consistency issues |

---

## G1. PRIVILEGE ESCALATION PATHS

### G1-1. Role Assignment via PUT /admin/users/:id/role
**Severity:** MEDIUM  
**File:** `server/routes/admin/admin.routes.ts:512-528`  
**Risk:** SUPER_ADMIN can assign any role to any user. No secondary confirmation, no rate limiting, no notification to affected user.

```typescript
router.put("/users/:id/role", requireAuth, requireSuperAdmin, async (req, res) => {
  const { role } = req.body;
  // Validates role string but NO checks on:
  // - Whether target user exists
  // - Whether role change is appropriate
  // - No audit before mutation (audit happens via Prisma extension)
  await prisma.user.update({ where: { id: userId }, data: { role } });
});
```

**Mitigation:** Acceptable for pilot — SUPER_ADMIN is trusted. Add secondary confirmation before full launch.

### G1-2. User Quarantine Without Actual Isolation
**Severity:** MEDIUM  
**File:** `server/routes/admin/admin.routes.ts:531-561`  
**Risk:** `PATCH /admin/users/:id/quarantine` only logs to admin action log — does NOT actually restrict the user's access. Quarantined user retains full system access.

```typescript
// Only logs — no actual enforcement
await prisma.adminActionLog.create({ ... });
return res.json({ success: true, data: { message: "User quarantined" } });
```

**True isolation (not implemented):** No token invalidation, no login block, no API access restriction.

**P1 finding:** User quarantine is a no-op — provides false sense of security.

### G1-3. Kill Switch Without Actual Enforcement
**Severity:** MEDIUM  
**File:** `server/routes/admin/admin.routes.ts:590-617`  
**Risk:** Kill switch logs the event but does NOT actually lock down the system. No middleware reads a `isKilled` flag to block requests.

```typescript
// Logs only — no actual system lockdown
await prisma.adminActionLog.create({ ... });
return res.json({ success: true, data: { message: "Kill switch activated", status: "terminated" } });
```

**Note:** SystemLockdown service exists (`server/services/system.health.ts`) and provides `isLocked()` — but kill switch route doesn't call it.

**P1 finding:** Kill switch endpoint logs but doesn't invoke SystemLockdown.

---

## G2. AUDIT GAPS

### G2-1. Three Audit Tables — Reconciliation Gap
**Severity:** LOW  
**Tables:** `auditLog`, `adminLog`, `adminActionLog`  
**Risk:** Some actions logged to multiple tables, some to only one. No unified audit view. Prisma extension auto-audits all writes to `auditLog`. Admin routes manually log to `adminActionLog`. Overlap creates ambiguity.

### G2-2. Legacy Order Engine — No Audit Trail
**Severity:** HIGH  
**File:** `server/routes/orders.routes.ts`  
**Risk:** Legacy order creation (`POST /orders`) uses direct `prisma.order.create()` without Prisma extension auditing. If the extension doesn't auto-capture this model, legacy orders bypass audit entirely.

**Verification needed:** Does `auditLog` extension's `writeOperations` include `Order` model? If not, legacy orders are invisible to audit.

### G2-3. DSSL Score Changes — No Audit Trail
**Severity:** MEDIUM  
**Risk:** DSSL score fields (`dsslScore`, `aiRankScore`, `trendingScore`) on Vendor are mutated by DSSL recalculation service (commented out) and admin actions. No audit tracking tracks *when* DSSL changed or *why*.

---

## G3. GOVERNANCE BYPASS PATHS

### G3-1. Auto-Provisioned Vendor Bypasses Moderation
**Severity:** MEDIUM  
**File:** `server/routes/auth.routes.ts:160-186`  
**Risk:** New merchant registration auto-creates a `PENDING` vendor — correct. But the creation uses try/catch and is non-blocking. If vendor creation *succeeds* but the vendor is never approved, the vendor enters a permanent `PENDING` limbo state.

```typescript
// Non-blocking — merchant can still login even if vendor creation fails
try {
  await prisma.vendor.create({ ... });
} catch (vendorErr: any) { ... } // Non-blocking
```

**Path to bypass:** If admin doesn't review pending vendors, they remain in limbo forever. No system notifies admins of pending vendors.

### G3-2. Shop Model — No District Governance
**Severity:** MEDIUM  
**File:** `prisma/schema.prisma:139-157`  
**Risk:** `Shop` has NO `districtId` field. All shop operations bypass district isolation. Shops created from routes that expect district context will silently fail or operate without tenant boundary.

### G3-3. Client Trusted vendorId in Legacy Orders
**Severity:** CRITICAL  
**File:** `server/routes/orders.routes.ts:140-144`  
**Risk:** Legacy order engine accepts `item.vendorId` from client without server-side validation. A malicious client could:
- Create orders attributed to any vendor (reputation manipulation)
- Attribute orders to vendors in other districts (cross-district data corruption)
- Create phantom orders for financial fraud

```typescript
vendorId: item.vendorId, // Client-supplied — NO server-side vendor verification
```

---

## G4. MODERATION INCONSISTENCIES

### G4-1. Vendor Status ≡ Shadow Ban Inconsistency
**Severity:** LOW  
**File:** `server/routes/admin/admin.routes.ts:286-293`  
**Risk:** Status update endpoint sets `isShadowBanned: true` when status is `"APPROVED"` — this is counterintuitive:

```typescript
data: {
  status,
  isShadowBanned: status === "APPROVED" ? false : true,
}
```

This is actually correct (APPROVED = not shadowbanned) but the logic is inverted from a readability standpoint. Consider renaming or clarifying.

### G4-2. Product Approval Dual Truth
**Severity:** MEDIUM  
**Files:** Product model has both `approved: Boolean` and `status: String`  
**Risk:** Some routes set `approved: true`, others set `status: "approved"`. No synchronization ensures both fields are consistent. A product can have `approved: true` with `status: "pending"` or vice versa.

```typescript
// product.service.ts — sets both
approved: !requiresReview,
status: requiresReview ? 'pending' : 'approved'

// Some routes may only set one
```

### G4-3. Review Moderation — No Rejection Workflow
**Severity:** LOW  
**File:** `server/routes/admin/admin.routes.ts:742-792`  
**Risk:** Admin can only DELETE reviews, not reject/hide-with-option-to-appeal. No soft-delete or spam flag. Deletion is permanent.

---

## G5. DISTRICT ISOLATION WEAKNESSES

### G5-1. SUPER_ADMIN Bypasses District Filters
**Severity:** INFORMATIONAL (intentional)  
**Risk:** SUPER_ADMIN scoped to see all districts. This is by design. Ensure SUPER_ADMIN credentials are tightly controlled.

### G5-2. GET /admin/districts Leaks All Districts
**Severity:** MEDIUM  
**File:** `server/routes/admin/admin.routes.ts:852-862`  
**Risk:** SUPER_ADMIN sees all districts. This is acceptable for pilot. Post-pilot, consider scoping CITY_ADMIN visibility.

---

## RISK SUMMARY

| ID | Finding | Severity | Pilot Blocker? | Fix Window |
|---|---|---|---|---|
| G3-3 | Client-trusted vendorId in legacy orders | CRITICAL | YES — must fix | Before pilot |
| G1-2 | Quarantine is no-op | MEDIUM | NO — close before full launch | Before launch |
| G1-3 | Kill switch doesn't invoke SystemLockdown | MEDIUM | NO — but document known gap | Before launch |
| G2-2 | Legacy orders may bypass audit | HIGH | CONDITIONAL — verify audit coverage | Before pilot |
| G3-2 | Shop has no districtId | MEDIUM | NO — Shop is legacy, being phased out | Defer |
| G4-2 | Product approved/status dual truth | MEDIUM | NO — operational consistency gap | Post-pilot |
| G3-1 | No admin notification for pending vendors | LOW | NO — manual check sufficient for pilot | Post-pilot |

---

## GOVERNANCE VERDICT

**Governance architecture is structurally sound but has 3 critical gaps:**

1. **Client-trusted vendorId** in legacy orders (G3-3) — immediate fix needed
2. **Quarantine/kill-switch are ceremonial** — provide false sense of security (G1-2, G1-3)
3. **Audit trail for legacy orders unverified** (G2-2) — need to confirm Prisma extension covers Order model

**No fundamental governance redesign needed. Surgical fixes required.**
