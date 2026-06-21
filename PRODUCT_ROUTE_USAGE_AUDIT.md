# Product Route Usage Audit (BharatOS ADR-002 Phase 2A)

This document details the usage analysis of `/api/products/*` routes on both the server and client. It establishes the current references, mapping, and redundant configurations before any redirection or retirement is executed.

---

## 1. Executive Summary

- **Client-Side Reference Status:** The client application does **NOT** reference the legacy `/api/products` or `/api/products/*` routes.
- **Storefront Discovery:** All frontend public product discovery calls use `/api/marketplace/products/*`.
- **Merchant Management:** All frontend merchant dashboard features use `/api/merchant/products/*`.
- **Accidental Mounts:** The double mounting of `products.routes.ts` in the backend exposes accidental routes under `/api/marketplace/merchant/*` which have **zero** active usage.
- **Verification:** Since the client only references the canonical paths (`/api/marketplace/products` and `/api/merchant/products`), retiring `/api/products/*` via a `301 Redirect` to `/api/marketplace/products/*` is extremely safe and will ensure complete backward compatibility.

---

## 2. Server-Side Routing Architecture

In [server/routes/index.ts](file:///E:/Shahdol-Bazaar-MVP/server/routes/index.ts), the router `products.routes.ts` is imported twice under different aliases and mounted twice:

```typescript
import productsRoutes from "./marketplace/products.routes";
import merchantRoutes from "./marketplace/products.routes";

// ...

app.use("", merchantRoutes);       // Mounts router at root ("/")
app.use("/marketplace", productsRoutes); // Mounts router at "/marketplace"
```

This double-mounting replicates **every route** defined in `products.routes.ts` under two prefixes:

### Root Mount (`/api/...`)
| HTTP Method | Route Defined in File | Resulting URL Path | Intended Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | `/api/products` | Legacy public discovery (District isolated) |
| `GET` | `/products/slug/:slug` | `/api/products/slug/:slug` | Legacy public product detail by slug |
| `GET` | `/products/:entityKey` | `/api/products/:entityKey` | Legacy public canonical resolver (ID/Slug) |
| `GET` | `/merchant/products` | `/api/merchant/products` | **Canonical** merchant product list |
| `POST` | `/merchant/products` | `/api/merchant/products` | **Canonical** merchant product create |
| `POST` | `/merchant/products/:id/images` | `/api/merchant/products/:id/images` | **Canonical** upload product images |
| `DELETE` | `/merchant/products/:productId/images/:imageId` | `/api/merchant/products/:productId/images/:imageId` | **Canonical** delete product image |
| `PUT` | `/merchant/products/:id` | `/api/merchant/products/:id` | **Canonical** update product |
| `DELETE` | `/merchant/products/:id` | `/api/merchant/products/:id` | **Canonical** delete product |

### Marketplace Mount (`/api/marketplace/...`)
| HTTP Method | Route Defined in File | Resulting URL Path | Intended Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | `/api/marketplace/products` | **Canonical** public discovery (District isolated) |
| `GET` | `/products/slug/:slug` | `/api/marketplace/products/slug/:slug` | **Canonical** public product detail by slug |
| `GET` | `/products/:entityKey` | `/api/marketplace/products/:entityKey` | **Canonical** public canonical resolver (ID/Slug) |
| `GET` | `/merchant/products` | `/api/marketplace/merchant/products` | *Accidental* mirror of merchant list |
| `POST` | `/merchant/products` | `/api/marketplace/merchant/products` | *Accidental* mirror of merchant create |
| `POST` | `/merchant/products/:id/images` | `/api/marketplace/merchant/products/:id/images` | *Accidental* mirror of image upload |
| `DELETE` | `/merchant/products/:productId/images/:imageId` | `/api/marketplace/merchant/products/:productId/images/:imageId` | *Accidental* mirror of image delete |
| `PUT` | `/merchant/products/:id` | `/api/marketplace/merchant/products/:id` | *Accidental* mirror of product update |
| `DELETE` | `/merchant/products/:id` | `/api/marketplace/merchant/products/:id` | *Accidental* mirror of product delete |

---

## 3. Client-Side Code Reference Inventory

A comprehensive search of the `client/` codebase shows that the client ONLY uses canonical endpoints:

### A. Discovery Endpoints (`/api/marketplace/products`)

* **List / Feed Fetching:**
  - `client/src/pages/marketplace.tsx` (Line 100):
    ```typescript
    const res = await apiRequest("GET", "/marketplace/products");
    ```
  - `client/src/pages/shop-detail.tsx` (Line 161) and `client/src/services/vendor.service.ts` (Line 67):
    ```typescript
    const result = await apiRequest("GET", `marketplace/products?vendorId=${vendorId}`);
    ```

* **Single Product Detail Fetching:**
  - `client/src/pages/product-detail.tsx` (Line 108):
    ```typescript
    const res = await apiRequest("GET", `marketplace/products/${Number(productKey)}`);
    ```
  - `client/src/pages/product-detail.tsx` (Line 113):
    ```typescript
    const res = await apiRequest("GET", `marketplace/products/slug/${safeSlug}`);
    ```
  - `client/src/pages/checkout.tsx` (Line 101):
    ```typescript
    const response = await apiRequest("GET", `marketplace/products/${productId}`);
    ```

* **Navigation / Routing Constants:**
  - `client/src/shared/routing/sovereign-routes.ts` (Lines 31-35, 73, 103, 153):
    Defines UI routes matching `/marketplace/products/:id` and `/marketplace/products/slug/:slug`.

### B. Merchant Dashboard Endpoints (`/api/merchant/products`)

* **Dashboard Operations:**
  - `client/src/pages/partner-dashboard.tsx` (Line 33):
    ```typescript
    const prodRes = await apiRequest("GET", "/merchant/products");
    ```
  - `client/src/pages/partner-dashboard.tsx` (Line 88):
    ```typescript
    const res = await apiRequest("POST", "/merchant/products", payload);
    ```
  - `client/src/pages/partner-dashboard.tsx` (Line 125):
    ```typescript
    await apiRequest("DELETE", `/merchant/products/${id}`);
    ```

> [!NOTE]
> There are **zero** instances of `apiRequest` or other HTTP fetch clients hitting raw `/api/products/*` or `/api/marketplace/merchant/products/*` routes.

---

## 4. Planned Aliasing / Redirection Actions

When authorized to proceed with `/api/products/*` retirement, the changes will be configured as follows in `server/routes/index.ts` to cleanly transition legacy routes without runtime disruption:

1. **Retire Root `/api/products/*` Paths:**
   - Redirect to `/api/marketplace/products/*` using a HTTP 301.
   - Include deprecation warning logs:
     ```
     [DEPRECATED_ROUTE]
     /api/products/...
     /api/marketplace/products/...
     ```

2. **Decouple Router Mounts (Phase 2B):**
   - Public storefront routes will only be mounted on `/marketplace`.
   - Merchant routes will remain mounted on root to maintain `/api/merchant/products/*` as canonical.
