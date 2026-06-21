# AUTHORITY_MAP — BharatOS Customer Authentication Audit

**Date:** June 20, 2026  
**Status:** AUDIT COMPLETE — READ ONLY  
**Scope:** Customer vs Partner auth entrypoints, role authority, DB impact, onboarding discoverability

---

## FINDING SUMMARY

| Question | Answer | Severity |
|----------|--------|----------|
| Separate CUSTOMER / PARTNER auth flows? | **NO — single merged `/auth` page** | 🔴 CRITICAL |
| Same `/auth` page reused for both? | **YES** | 🔴 CRITICAL |
| Can all roles authenticate via `/auth`? | **YES — all roles** | 🟡 NOTE |
| Can a normal customer register from this screen? | **YES — but page may say "Partner Portal"** | 🔴 CRITICAL |
| Is customer onboarding discoverable? | **NO — hidden behind partner branding** | 🔴 CRITICAL |
| Can first-time buyer place an order unaided? | **NO — multiple blockers** | 🔴 CRITICAL |

---

## CANONICAL ANSWERS

### A. What is the canonical customer authentication entrypoint?

**`/auth`** (no query params)  
Page title: **"Shahdol Bazaar"** (IF localStorage is clean)  
Post-login destination: **`/customer-dashboard`**  
Discovery: Profile icon (top-right, User icon) → `/auth`

### B. What is the canonical partner authentication entrypoint?

**`/auth?role=partner`** (query param required)  
Also: `/vendor/register` → redirect → `/auth?role=partner&mode=register`  
Page title: **"Partner Portal"**  
Post-login destination: **`/partner/dashboard`**  
Discovery: Sidebar "Start Selling" button → `/vendor/register`

### C. Are they currently merged?

**YES — fully merged.** One page (`auth.tsx`), one login endpoint (`POST /api/auth/login`), one register endpoint (`POST /api/auth/register`). Role separation is a URL query param + localStorage flag only.

### D. Is customer onboarding discoverable?

**NO.** No "Sign Up" or "Login" CTA exists on the homepage or sidebar for buyers. The only path is the unlabeled Profile icon.

### E. Can a first-time buyer successfully create an account and place an order without knowing internal system behavior?

**NO.** Five active blockers exist (see Risk Register below).

---

## DETAILED FINDINGS

### 1. Backend Auth Routes

One file handles ALL roles:

```
server/routes/auth.routes.ts
  POST /api/auth/login      → ALL roles
  POST /api/auth/register   → ALL roles (role determined by payload)
  GET  /api/auth/csrf-token
  POST /api/auth/logout
  GET  /api/auth/verify
```

No `/api/auth/partner/*` separation exists.

**Registration role resolution (auth.routes.ts L136–141):**
```typescript
const inferredRole =
  shopName || shopAddress || phone ? "merchant" : role;
const finalRole = normalizeRole(inferredRole || "customer");
```

**DTO (auth.dto.ts L44–45):**
```typescript
role: z.enum(["customer", "merchant"]).default("customer"),
```

### 2. Single Page, Two Personalities

`/auth` changes its identity via URL query param:

```
/auth              → "Shahdol Bazaar" (customer mode)
/auth?role=partner → "Partner Portal" (partner mode)
/auth?role=vendor  → "Partner Portal" (partner mode alias)
```

**auth.tsx L95–102:** `authMode` is initialized from URL param. If `role=partner`, it calls `persistPortalContext("partner")` — **writing to localStorage**. On next visit, `getPortalContext()` reads back `"partner"` even if the URL has no `?role=partner`.

**This means a customer who visited a partner link will see "Partner Portal" on their next login.**

### 3. All Roles Authenticate via `/auth`

`POST /api/auth/login` performs only: find user by username → verify password → issue JWT. No role filter.

| Role | Login via `/auth`? | Redirect |
|------|--------------------|---------:|
| `CUSTOMER` | ✅ | `/customer-dashboard` |
| `MERCHANT` | ✅ | `/partner/dashboard` |
| `CITY_ADMIN` | ✅ | `/admin` |
| `SUPER_ADMIN` | ✅ | `/admin` |

### 4. Database Tables Affected

**Customer registration (`role = "customer"`):**
- `User` table — 1 INSERT

**Merchant/Partner registration (`role = "merchant"`):**
- `User` table — 1 INSERT
- `Vendor` table — 1 INSERT (auto-provisioned, `status = "PENDING"`)

### 5. Checkout Requirements

```
POST /api/orders
  → requireAuth (User JWT — ANY role)
  → SovereignOrderEngine.createOrder()
```

Checkout requires a **User account only**. No Vendor account needed for buyers. `userId` on `SovereignOrder` is nullable — the buyer's User is linked, not a Vendor.

### 6. Merged Auth Architecture Diagram

```
FRONTEND ENTRYPOINTS
─────────────────────────────────────────────────────
Layout Nav "Profile" icon  ───────────→  /auth
  (layout.tsx:95, 213-216)               ↓ customer or partner branding
                                          determined by localStorage

Sidebar "Start Selling"  ──────────→  /vendor/register
  (layout.tsx:191)                       ↓ redirect
                                         /auth?role=partner&mode=register
                                          → "Partner Portal" branding
                                          → sets localStorage = "partner"

BACKEND ENDPOINT (unified)
─────────────────────────────────────────────────────
POST /api/auth/register  ←── role: "customer" → User only
                         ←── role: "merchant" → User + Vendor (PENDING)

POST /api/auth/login     ←── ALL roles, no filter

POST-LOGIN REDIRECT (getClientRoleRedirectPath):
  CUSTOMER   → /customer-dashboard
  MERCHANT   → /partner/dashboard
  CITY_ADMIN → /admin
  SUPER_ADMIN → /admin
```

---

## RISK REGISTER

| ID | Risk | Severity |
|----|------|----------|
| R-01 | Single page serves both audiences — brand confusion | 🔴 HIGH |
| R-02 | `localStorage` contamination shows "Partner Portal" to customers | 🔴 HIGH |
| R-03 | No customer-facing "Sign Up" CTA on homepage or sidebar | 🔴 HIGH |
| R-04 | Password policy (12 chars + symbols) is merchant-grade, applied to all buyers | 🟡 MEDIUM |
| R-05 | Customer dashboard order lookup requires `user.phone` — not captured at registration | 🔴 HIGH |
| R-06 | Checkout auth gate redirects to `/auth` — may show "Partner Portal" to confused customer | 🟡 MEDIUM |
| R-07 | `MERCHANT` / `vendor` / `VENDOR` all normalized identically — no role clarity issue | 🟢 LOW |

---

*Audit: Read-only. No code modified.*
