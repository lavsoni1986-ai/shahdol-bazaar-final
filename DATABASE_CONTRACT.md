# DATABASE CONTRACT - BharatOS Sovereign Schema

## Canonical Tables
| Table | Prisma Model | Actual DB Name |
|-------|--------------|----------------|
| "Vendor" | Vendor | "Vendor" |
| "Product" | Product | "Product" |
| "Hospital" | Hospital | "Hospital" |
| "District" | District | "District" |
| "ServiceWorker" | ServiceWorker | "ServiceWorker" |

## Canonical Vendor Fields
| Field | Type | DB Column | Notes |
|-------|------|-----------|-------|
| id | Int | id | Primary key |
| name | String | name | Display name |
| slug | String | slug | URL slug |
| businessType | BusinessType | businessType | PRODUCT/SERVICE/HEALTHCARE/SCHOOL/RETAIL/EDUCATION |
| districtId | Int | district_id | Foreign key with @map |
| category | String | category | Optional category |
| dsslScore | Int | dsslScore | Trust score |
| isVerified | Boolean | isVerified | Verification status |
| status | VendorStatus | status | PENDING/APPROVED/REJECTED |

## Canonical Product Fields
| Field | Type | DB Column | Notes |
|-------|------|-----------|-------|
| id | Int | id | Primary key |
| title | String | name | @map("name") |
| vendorId | Int | vendorId | Foreign key |
| price | Float | selling_price | @map("selling_price") |
| approved | Boolean | approved | Approval status |

## BusinessType Enum Values
- PRODUCT
- SERVICE
- HEALTHCARE
- SCHOOL
- RETAIL
- EDUCATION

## VendorStatus Enum Values
- PENDING
- APPROVED
- REJECTED

## Forbidden Field Names (DO NOT USE)
- business_type (use businessType)
- district_id (use districtId with @map)
- entity_type (use entityType)
- vendors (use Vendor model)
- products (use Product model)

## Raw SQL Files (Audit Required)
- server/tests/*.ts (health checks only)
- server/routes/index.ts (health checks only)
- server/routes/admin/admin.routes.ts (health checks only)
- server/storage.ts (health checks only)

## Verified Reality Checks
- ✅ All Vendor fields exist in DB with correct casing
- ✅ All Product fields exist in DB with correct casing
- ✅ All enum values verified in actual database
- ✅ No forbidden field names found in codebase
- ✅ Grounding engine uses correct field names
- ✅ No raw SQL queries affecting business logic