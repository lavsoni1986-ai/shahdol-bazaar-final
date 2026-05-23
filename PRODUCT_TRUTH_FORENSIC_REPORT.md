# PRODUCT_TRUTH_FORENSIC_REPORT

## Executive Summary

- Home feed product is surfaced from `GET /api/marketplace/home-snapshot` in `server/routes/marketplace/stores.routes.ts`.
- Vendor page products come from `GET /api/marketplace/products?vendorId=...` in `server/routes/marketplace/products.routes.ts`.
- Product detail resolution was failing because the client detail page used the slug-based endpoint even when the route was a numeric `/product/:id` path.
- The Motorola product exists in the database as:
  - `id: 1`
  - `title: "motorola mobile"`
  - `price: 14000`
  - `approved: true`
  - `status: "approved"`
  - `vendorId: 3`
- The vendor exists as `rohitmobile`, `status: APPROVED`, `isShadowBanned: false`, and is public.

## Exact API Chain

1. Home feed discovery
   - `GET /api/marketplace/home-snapshot`
   - Source: `server/routes/marketplace/stores.routes.ts`
   - Discovery adapter: `getTopDiscoveryPicks()` → `adaptDiscoveryHomePayload()`
   - Home feed product object is mapped from discovery results.

2. Vendor page detail source
   - `GET /api/marketplace/stores/:slug`
   - Source: `server/routes/marketplace/stores.routes.ts:263`
   - Backend uses `findVendorBySlug(slug, districtId)` in `server/repositories/vendor.repo.ts:44`
   - That repository query selects vendor products with statuses `["ACTIVE","APPROVED","active","approved"]`.

3. Vendor products list source
   - `GET /api/marketplace/products?vendorId=<id>`
   - Source: `server/routes/marketplace/products.routes.ts:54`
   - Prisma query at `server/routes/marketplace/products.routes.ts:71`:
     ```ts
     await prisma.product.findMany({
       where: {
         vendorId,
         approved: true,
         status: "approved",
         vendor: {
           districtId,
           status: "APPROVED",
           isShadowBanned: false,
         }
       },
       include: { vendor: true }
     });
     ```

4. Product detail source
   - `GET /api/marketplace/products/:id`
   - Source: `server/routes/marketplace/products.routes.ts:149`
   - ID route is correct for numeric product lookup.

5. Product slug resolution source
   - `GET /api/marketplace/products/slug/:slug`
   - Source: `server/routes/marketplace/products.routes.ts:118`
   - Backend uses `findProductBySlug(slug, districtId)` in `server/repositories/product.repo.ts:36`
   - However, the Prisma `Product` model does not include a real `slug` database field.

## Exact Frontend Sources

- Vendor page lists products from:
  - `client/src/pages/shop-detail.tsx:37` → `fetchProducts(vendorId)`
  - `client/src/pages/shop-detail.tsx:471` → product card links use `/product/${product.id}`

- Product detail page route binding:
  - `client/src/App.tsx:246` → `/:district/product/:slug`
  - `client/src/App.tsx:269` → `/product/:id`

- Product detail data fetch:
  - `client/src/pages/product-detail.tsx:56` → `fetchProduct(productKey)`
  - `client/src/pages/product-detail.tsx:63` → `useRoute("/product/:slug")`
  - `client/src/pages/product-detail.tsx:81` → query key uses `productSlug`

## Exact Broken Condition

- `client/src/pages/product-detail.tsx` only fetched product details from the slug endpoint:
  - `marketplace/products/slug/${safeSlug}`
- Vendor page product links used numeric IDs:
  - `/product/${product.id}` at `client/src/pages/shop-detail.tsx:471`
- Therefore `/product/1` triggered slug-based resolution with `slug = 1`, which did not match any real product slug and returned `Product not found`.

- Additional divergence:
  - `server/repositories/product.repo.ts:36` expects `slug` on `Product`, but Prisma `Product` model lacks that field.
  - The current DTO fallback in `mapProductToDTO()` maps `slug` to `String(product.id)` when `product.slug` is missing, hiding the schema mismatch.

## Verified Database Truth

- The Motorola product exists and passes the vendor filters.
- The exact Prisma vendor-products query for `vendorId=3` and `districtId=1` returns the Motorola product.
- The product detail numeric lookup route is the correct canonical path for this dataset.

## Minimal Surgical Fix Applied

- Updated `client/src/pages/product-detail.tsx`:
  - support numeric product identifiers by routing numeric keys to `GET marketplace/products/:id`
  - preserve slug resolution for non-numeric product slugs using `GET marketplace/products/slug/:slug`
  - support both `/product/:id` and `/:district/product/:slug` route patterns

- No schema rewrite performed.
- No broad refactor or transport migration performed.

## Recommendation

- Canonical source of truth for product detail in this dataset is the numeric product ID route: `GET /api/marketplace/products/:id`.
- Keep slug route as secondary/legacy support only.
- If this app must support string slugs in future, add a real `slug` column to `Product` and keep the slug endpoint in sync.

## Verification Notes

- Verified the Motorola product exists in Prisma with `approved: true` and `status: "approved"`.
- Verified the vendor record is public and matching the vendor filter conditions.
- With the fix, `/product/1` now resolves against the numeric product endpoint instead of the slug-only path.

---

### File changed for fix
- `client/src/pages/product-detail.tsx`
