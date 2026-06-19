# CORS CONSOLIDATION REPORT

This report catalogs all occurrences of CORS configuration in the BharatOS codebase, indicating their behavior and whether they are active in production.

---

## 1. CORS Invocations Inventory

### A. Inline CORS Middleware in `api/index.ts`
- **File:** [api/index.ts](file:///E:/Shahdol-Bazaar-MVP/api/index.ts#L80) (Line 80)
- **Current Behavior:** Restricts cross-origin requests using a local `ALLOWED_ORIGINS` array (`localhost:5174`, `localhost:5002`, `process.env.FRONTEND_URL`, and `*.bharatos.in`). Blocks requests violating the policy with a 500 error ("CORS policy violation").
- **Production Active:** **YES** (This is the primary serverless handler for Vercel production traffic).

### B. Preflight OPTIONS Handler in `api/index.ts`
- **File:** [api/index.ts](file:///E:/Shahdol-Bazaar-MVP/api/index.ts#L101) (Line 101)
- **Current Behavior:** Mounts default preflight OPTIONS handler: `app.options("*", cors())`.
- **Production Active:** **YES** (Required for preflight requests in production).

---

### C. Inline CORS Middleware in `server/index.ts`
- **File:** [server/index.ts](file:///E:/Shahdol-Bazaar-MVP/server/index.ts#L250) (Line 250)
- **Current Behavior:** Identical logic and whitelist to the inline implementation in `api/index.ts`.
- **Production Active:** **NO** (This entrypoint is only used for local development, not production on Vercel).

### D. Preflight OPTIONS Handler in `server/index.ts`
- **File:** [server/index.ts](file:///E:/Shahdol-Bazaar-MVP/server/index.ts#L268) (Line 268)
- **Current Behavior:** Mounts default preflight OPTIONS handler: `app.options("*", cors())`.
- **Production Active:** **NO** (Local development only).

---

### E. Centralized CORS Wrapper in `server/config/cors.ts`
- **File:** [server/config/cors.ts](file:///E:/Shahdol-Bazaar-MVP/server/config/cors.ts#L83) (Line 83)
- **Current Behavior:** Employs regex-based whitelisting (`shahdolbazaar.com`, `www.shahdolbazaar.com`, `*.vercel.app`, and `localhost`). Applies length guards on the Origin header, logs violations, and appends `Vary: Origin` to optimize caching and avoid CDN cache poisoning.
- **Production Active:** **NO** (Only referenced by the legacy/unused `api/bootstrap.ts` file).

---

## 2. Consolidation Strategy & Target Configuration

We select **`server/config/cors.ts`** as the single authoritative CORS implementation. To prevent breaking existing domains, the allowed whitelist regexes inside the authoritative file must be extended to merge the properties of all three lists.

### The Unified Whitelist Requirements:
- `http://localhost:*` (development)
- `process.env.FRONTEND_URL` (dynamic target)
- `*.bharatos.in` (federated subdomains)
- `shahdolbazaar.com` (production root)
- `www.shahdolbazaar.com` (production canonical)
- `*.vercel.app` (deployments)
