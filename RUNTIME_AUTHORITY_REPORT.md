# RUNTIME AUTHORITY REPORT

This report evaluates all Express server entrypoints in the `api/` and `server/` directories, determining which file holds authoritative production execution status.

---

## 1. Runtime Entrypoints Audits

| Entrypoint | Type | Production Status | Classification | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| [api/index.ts](file:///E:/Shahdol-Bazaar-MVP/api/index.ts) | Vercel Serverless | **ACTIVE** | **Production Authority** | Receives and routes 100% of Vercel production API traffic (`/api/*`) via a rewrite wildcard configuration. |
| [server/index.ts](file:///E:/Shahdol-Bazaar-MVP/server/index.ts) | Node standalone | **ACTIVE (Local)** | **Local Authority** | Drives local development, hot reloading, standalone servers, and asset builds. |
| [api/bootstrap.ts](file:///E:/Shahdol-Bazaar-MVP/api/bootstrap.ts) | Shared Utility | **DEAD** | **Dead Helper** | Contains shared Express boilerplates. Only imported by other dead entrypoints. |
| [api/admin.ts](file:///E:/Shahdol-Bazaar-MVP/api/admin.ts) | Vercel Serverless | **DEAD** | **Legacy Endpoint** | Redundant file since routes are unified in `/api/index.ts`. Never receives traffic. |
| [api/ai.ts](file:///E:/Shahdol-Bazaar-MVP/api/ai.ts) | Vercel Serverless | **DEAD** | **Legacy Endpoint** | Redundant serverless function. |
| [api/auth.ts](file:///E:/Shahdol-Bazaar-MVP/api/auth.ts) | Vercel Serverless | **DEAD** | **Legacy Endpoint** | Redundant serverless function. |
| [api/health.ts](file:///E:/Shahdol-Bazaar-MVP/api/health.ts) | Vercel Serverless | **DEAD** | **Legacy Endpoint** | Redundant serverless function. |
| [api/marketplace.ts](file:///E:/Shahdol-Bazaar-MVP/api/marketplace.ts) | Vercel Serverless | **DEAD** | **Legacy Endpoint** | Redundant serverless function. |
| [api/merchant.ts](file:///E:/Shahdol-Bazaar-MVP/api/merchant.ts) | Vercel Serverless | **DEAD** | **Legacy Endpoint** | Redundant serverless function. |

---

## 2. Structural Verification

- **Production Authority:** Verification of `vercel.json` routing configuration confirms that all requests matching `/api/(.*)` route directly to `/api/index.ts` in production. No other file inside the `/api` folder is exposed to public HTTP traffic.
- **Dead Code Surface:** The files `api/admin.ts`, `api/ai.ts`, `api/auth.ts`, `api/marketplace.ts`, `api/merchant.ts`, and `api/health.ts` represent legacy endpoints from previous development phases and are safe to retain as artifacts but must not be treated as runtime entrypoints.
