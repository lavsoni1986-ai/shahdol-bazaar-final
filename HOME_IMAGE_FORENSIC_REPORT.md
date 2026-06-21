# HOME PAGE PRODUCT IMAGE FORENSIC REPORT

**Date:** 2026-06-20  
**Product:** ID 192 — "vitamin c cerum"  
**Scope:** Home snapshot image not rendering, product detail works  

---

## 1. API RESPONSE COMPARISON

### `GET /api/marketplace/home-snapshot` (Product 192 after adapter)

```
{
    id: 192,
    name: "vitamin c cerum",
    imageUrl: null,                  // ← PROBLEM: null
                                     // No fallback to images array
    price: ...,
    mrp: ...,
    ...
}
```

### `GET /api/marketplace/products/192` (Product Detail)

```
{
    data: {
        id: 192,
        name: "vitamin c cerum",
        logo: null,                  // ← Same source field, null
        images: ["https://..."],     // ← This has the image!
        ...
    }
}
```

**Detail page renders correctly** because it uses `product.images?.[0]`.

---

## 2. DATA FLOW — HOME SNAPSHOT CHAIN

```
Prisma Query (discovery.service.ts:335-353)
  ↓ includes { vendor: true, images: true }
mapProduct(p) (discovery.service.ts:145-168)
  ↓
  mapProductToDTO(p, p.vendor) (entity.dto.ts:364-429)
    ↓
    dto.logo  = product.imageUrl || null            // the imageUrl column
    dto.images = ProductImage[].map(img => img.url)  // the relation table
  ↓
  DiscoveryEntity {
    image: dto.logo,        // ← ONLY uses logo, NOT images[0]
    meta: dto,              // dto.images available here but never accessed
  }
  ↓
adaptDiscoveryHomePayload(feed) (stores.routes.ts:74-113)
  ↓
  products: feed.filter(PRODUCT).map(x => ({
    imageUrl: x.image,      // = dto.logo = product.imageUrl || null
    // NEVER checks: x.meta?.images?.[0]
  }))
  ↓
normalizeCanonicalEntity() (response-normalizers.ts:100-156)
  ↓
  imageUrl: entity.imageUrl || entity.image || entity.logo || ...
  // Adapted object only has imageUrl (null), no fallback fields
  ↓
SovereignEntityCard → toProductCardData() (SovereignEntityCard.tsx:72-96)
  ↓
  imageUrl: entity.imageUrl ?? null   // still null
  ↓
SovereignProductCard → getPrimaryImage() (SovereignProductCard.tsx:79-81)
  ↓
  return data.imageUrl || data.image || null   // null → NO IMAGE
```

## 3. DATA FLOW — PRODUCT DETAIL CHAIN

```
Prisma Query (products.routes.ts:156-196)
  ↓ includes vendor, images
resolveProductByEntityKey → product with vendor + images
  ↓
mapProductToDTO(product, product.vendor) (entity.dto.ts:364-429)
  ↓
  logo: product.imageUrl || null     // null
  images: productImages              // ["https://..."] ✅
    // productImages = product.images?.length
    //   ? product.images.map(img => img.url) ← ProductImage relation
    //   : product.imageUrl ? [product.imageUrl] : [];
  ↓
product-detail.tsx
  ↓
  primaryImage = toAbsolute(
    product.images?.[0] ||           // ✅ hits this
    product.imageUrls?.[0] ||
    product.imageUrl ||
    defaultImage
  )
```

---

## 4. ROOT CAUSE

**The `adaptDiscoveryHomePayload` function in `stores.routes.ts` does not propagate the `images` array from the ProductImage relation to the home-snapshot response.**

### Why imageUrl is null:
- The Prisma `Product` model has `imageUrl  String?  @map("image")` — a single column
- Many products have this column as `NULL` (the DB column is `image`)
- Actual images are stored in the **ProductImage** relation table

### Why product detail works:
- `mapProductToDTO` constructs `productImages` from the `ProductImage[]` relation
- The detail page explicitly checks `product.images?.[0]` first

### Why home-snapshot fails:
- `mapProduct()` only copies `dto.logo` (= `product.imageUrl`) to `DiscoveryEntity.image`
- `adaptDiscoveryHomePayload` maps `x.image` to `imageUrl`
- Neither falls back to the `ProductImage` relation

---

## 5. EXACT MISSING MAPPING

| Layer | Field Used | Has Image? | Fallbacks |
|-------|-----------|------------|-----------|
| **DB Column** | `Product.image` | NULL | — |
| **DB Relation** | `ProductImage[].url` | ✅ | — |
| **mapProductToDTO.logo** | `product.imageUrl` | NULL | No fallback to ProductImage |
| **mapProductToDTO.images** | `ProductImage[].url` | ✅ | Falls back to `[product.imageUrl]` |
| **DiscoveryEntity.image** | `dto.logo` | NULL | No fallback |
| **adaptDiscoveryHomePayload.imageUrl** | `x.image` | NULL | No fallback to `x.meta?.images?.[0]` |
| **normalizeCanonicalEntity** | chain | NULL | Has fallbacks but missing source field |

---

## 6. AFFECTED COMPONENTS

| Component | File | Impact |
|-----------|------|--------|
| `adaptDiscoveryHomePayload` | `server/routes/marketplace/stores.routes.ts:92-103` | **Primary bug location** — missing images array in product mapping |
| `mapProduct` | `server/services/discovery.service.ts:145-168` | Only passes `dto.logo`, not `dto.images` |
| `mapProductToDTO` | `server/dto/entity.dto.ts:364-429` | Sets `logo` without fallback to `images[0]` |
| `getPrimaryImage` | `client/src/components/shared/SovereignProductCard.tsx:79-81` | Consumer — receives null |
| `SovereignEntityCard.toProductCardData` | `client/src/components/shared/SovereignEntityCard.tsx:72-96` | Adapter — also only has `entity.imageUrl` |
| `normalizeCanonicalEntity` | `client/src/shared/api/response-normalizers.ts:145` | Normalizer — receives adapted object with null imageUrl |

---

## 7. PRISMA SCHEMA CONFIRMATION

```prisma
model Product {
  id                  Int            @id @default(autoincrement())
  title               String         @map("name")
  imageUrl            String?        @map("image")    // DB column: image — often null
  ...
  images              ProductImage[]                   // Relation table with actual URLs
}

model ProductImage {
  id        Int      @id @default(autoincrement())
  url       String                                      // The actual image URL
  productId Int
  product   Product  @relation(fields: [productId], references: [id])
}
```

---

## 8. SUMMARY

**Root Cause:** The home-snapshot data pipeline maps only `product.imageUrl` (a single nullable DB column) to the response `imageUrl` field, completely ignoring the `ProductImage[]` relation table where actual product images live.

**Fix needed at:** `server/routes/marketplace/stores.routes.ts` in the `adaptDiscoveryHomePayload` function — the product mapper should check `x.meta?.images?.[0]` as a fallback for `imageUrl`.
