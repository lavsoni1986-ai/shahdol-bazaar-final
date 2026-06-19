# CORS Authority Audit — Whitelist & Implementation Analysis

This document audits all CORS configurations in the codebase and identifies the single authoritative implementation to prevent split-brain issues.

---

## 1. CORS Invocations Inventory

### A. Centralized Delegate (`server/config/cors.ts`)
* **Type:** Delegate-based dynamic resolver.
* **Whitelist Source:** Regular expression array (`ALLOWED_ORIGIN_REGEXES`):
  - `^https:\/\/shahdolbazaar\.com$` *(Production)*
  - `^https:\/\/www\.shahdolbazaar\.com$` *(Production WWW)*
  - `^https:\/\/[a-z0-9-]+\.vercel\.app$` *(Vercel Previews)*
  - `^https?:\/\/localhost(:\d+)?$` *(Localhost)*
* **Features:** 
  - Dynamic reflecting origin
  - Length guard (200 char maximum to prevent buffer/header abuse)
  - Preflight cache tuning (`maxAge: 86400`)
  - CDN safety (`Vary: Origin` header injection)
  - Allowed headers include: `Content-Type`, `Authorization`, `X-Requested-With`, `x-csrf-token`, `X-District-Id`, `X-District-Slug`.

### B. Vercel Catch-all Inline CORS (`api/index.ts`)
* **Type:** Static array matcher.
* **Whitelist Source:** Static `ALLOWED_ORIGINS` array:
  - `http://localhost:5174`
  - `http://localhost:5002`
  - `process.env.FRONTEND_URL` *(if set)*
  - `/^https?:\/\/.*\.bharatos\.in$/`
* **Vulnerabilities:**
  - Lacks `https://shahdolbazaar.com` (unless mapped manually via `FRONTEND_URL`).
  - Lacks `https://*.vercel.app` (which blocks testing on Vercel preview deployments).
  - Lacks CDN cache protection (`Vary` header).
  - Lacks origin length validation.

### C. Local Server Inline CORS (`server/index.ts`)
* **Type:** Static array matcher.
* **Whitelist Source:** Static `ALLOWED_ORIGINS` array (same as `api/index.ts`).
* **Vulnerabilities:** Same as Vercel Catch-all inline CORS.

---

## 2. Authoritative Candidate Selection

### Candidate Name: `centralizedCors`
* **Location:** [cors.ts](file:///E:/Shahdol-Bazaar-MVP/server/config/cors.ts)
* **Rationale:**
  1. **Strict Production Coverage:** Automatically whitelists `shahdolbazaar.com`, `www.shahdolbazaar.com`, and all Vercel deployment preview domains (`*.vercel.app`).
  2. **Security Hardening:** Implements trailing slash normalization, a length restriction guard, and explicit header allowances (`x-csrf-token` is required for checkout and mutation endpoints).
  3. **CDN Safety:** Enforces `Vary: Origin` headers, preventing shared edge caches (like Cloudflare or Vercel Edge) from serving CORS headers meant for one origin to another (avoiding cache poisoning).
  4. **Dynamic Reflecting:** Correctly reflects origin matching, supporting credentialed CORS requests (`credentials: true`), which static wildcard structures cannot do under browser security rules.
