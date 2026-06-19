# ROUTE CANONICALIZATION AUDIT

This document audits all registered Express endpoints in BharatOS, mapping current paths, handlers, and classification categories (CANONICAL, ALIAS, LEGACY, DEAD).

---

## 1. Route Classification Matrix

### A. Authentication & Identity Family
- **Router File:** [auth.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/auth.routes.ts)
- **Mounted prefixes:** `/auth` (Canonical) and `/user` (Alias/Mirror)

| Current Path | Classification | Controller Method | Database Tables | Production Usage |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | **CANONICAL** | Inlined callback | `User` | Active (Mobile/Web authentication) |
| `POST /api/auth/register` | **CANONICAL** | Inlined callback | `User`, `Vendor` | Active (Account creation) |
| `GET /api/auth/verify` | **CANONICAL** | Inlined callback | `User` | Active (Session validation) |
| `POST /api/auth/logout` | **CANONICAL** | Inlined callback | `User` | Active (Session termination) |
| Mirrored `/api/user/*` | **ALIAS** | Mirrors auth routes | `User` | Compatibility (Legacy frontend references) |

---

### B. Product Discovery & Merchant Catalog Family
- **Router File:** [products.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/products.routes.ts)
- **Mounted prefixes:** `/marketplace` (for discovery routes) and `""` (for merchant routes)
- **THE DUPLICATION:** Due to mounting the same router file under two prefixes, all routes are double-registered.

| Current Path | Classification | Controller Method | Database Tables | Production Usage |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/marketplace/products` | **CANONICAL** | `GET /products` in router | `Product` | Active (Marketplace browsing) |
| `GET /api/marketplace/products/slug/:slug` | **CANONICAL** | `GET /products/slug/:slug` | `Product` | Active (Product detail views) |
| `GET /api/products` | **LEGACY / ALIAS** | `GET /products` (Root) | `Product` | Legacy (Old frontend calls) |
| `GET /api/products/slug/:slug` | **LEGACY / ALIAS** | `GET /products/slug/:slug` | `Product` | Legacy (Old frontend calls) |
| `GET /api/merchant/products` | **CANONICAL** | `GET /merchant/products` | `Product` | Active (Merchant dashboard) |
| `GET /api/marketplace/merchant/products` | **ALIAS (ACCIDENTAL)**| `GET /merchant/products` | `Product` | None (Accidental mount alias) |

---

### C. Store Discovery Family
- **Router File:** [stores.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/stores.routes.ts)
- **Mounted prefixes:** `/marketplace`

| Current Path | Classification | Controller Method | Database Tables | Production Usage |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/marketplace/home-snapshot` | **CANONICAL** | Inlined callback | `Vendor`, `Product` | Active (Front page discovery feed) |
| `GET /api/marketplace/stores` | **CANONICAL** | Inlined callback | `Vendor` | Active (Store directory list) |
| `GET /api/marketplace/stores/:slug` | **CANONICAL** | Inlined callback | `Vendor`, `Product` | Active (Store detail pages) |

---

### D. Dead Route Inventory (Never Mounted)
These files exist in the file system but are not imported or mounted by the active server router, meaning they cannot receive HTTP requests.

| Route File | Projected Path | Status | Reason |
| :--- | :--- | :--- | :--- |
| [vendor.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/vendor.routes.ts) | `/api/auto-catalog` | **DEAD** | Never imported. Logic for AI uploading is unused. |
| [vendor-reviews.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/vendor-reviews.routes.ts) | `/api/vendors/:id/reviews` | **DEAD** | Never imported. Product reviews are managed via `reviews.routes.ts` instead. |
| [vendors.routes.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/marketplace/vendors.routes.ts) | `/api/marketplace/vendors` | **DEAD** | Never imported. Store resolution is handled by `stores.routes.ts`. |
