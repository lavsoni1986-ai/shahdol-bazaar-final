# ACTIVE_CONSTITUTION.md

This file defines the canonical, authoritative contracts and fields for Phase 1 Constitutional Stabilization (BharatOS / Shahdol). It is the single source of truth for schema reconciliation, contract topology, and migration planning.

## Canonical Entity Contracts
Define the canonical public shape for high-level entities used across client, server, and cognition systems.

### District (canonical)
- id: number
- name: string
- slug: string
- primaryColor: string
- secondaryColor: string
- faviconUrl?: string | null
- metaTitle?: string | null
- metaDescription?: string | null
- logoUrl?: string | null
- ogImageUrl?: string | null
- contactNumber?: string | null
- description?: string | null
- state?: string | null
- isDefault: boolean
- config?: Json | null

(Constitutional: KEEP + MIGRATE)

### Vendor / Shop (canonical)
- id: number
- name: string
- slug: string
- category: string
- status: VendorStatus
- districtId: number
- rating?: number | null
- images?: string[]
- safetyBadges?: string[]
- trustScore?: number
- fraudScore?: number
- isSponsored?: boolean
- isShadowBanned?: boolean
- dsslScore?: number
- businessType?: BusinessType
- orderCount?: number
- totalOrders?: number
- trustDelta?: number

(Constitutional: KEEP + MIGRATE)

### Product (canonical)
- id: number
- title: string
- slug: string
- category: string
- subCategory?: string
- price?: number
- stock?: number
- searchText?: string

(Constitutional: KEEP + MIGRATE)

### UserIntelligence (canonical)
- userId: number
- trustScore?: number
- riskScore?: number
- deviceCount?: number
- ipDiversity?: number
- reviewCount?: number
- flaggedCount?: number
- meta?: Json
- lastActive?: Date
- processingSteps?: string[]
- performanceMetrics?: Json

(Constitutional: KEEP + MIGRATE)

### Search / AISearchResult (canonical)
- id: string
- title: string
- snippet?: string
- rating?: number
- canonicalId?: string
- entityType?: EntityType

(Constitutional: KEEP + MIGRATE)

### Telemetry / TelemetryContext (canonical)
- source: string
- timestamp: Date
- districtId?: number
- intent?: string
- unmetDemand?: number
- performance?: { latencyMs?: number; processingSteps?: string[] }

(Constitutional: KEEP + MIGRATE)

## Canonical Routing Contracts
- Define route names and path fragments in shared/routing/sovereign-routes
- MUST be exported as canonical map and used by client & server

Examples:
- ROUTES.CALL_VENDOR
- ROUTES.BOOK_VENDOR
- ROUTES.OPEN_MAPS

(Constitutional: KEEP + MIGRATE)

## Canonical Telemetry Contracts
- Telemetry events must have typed envelope and required fields:
  - eventType: string
  - districtId?: number
  - userId?: number
  - timestamp: Date
  - payload: Json

(Constitutional: KEEP + MIGRATE)

## Canonical Trust Fields (Sovereign Primitives)
- trustScore (number)
- riskScore (number)
- deviceCount (number)
- ipDiversity (number)
- processingSteps (string[])
- performanceMetrics (Json)
- meta (Json)
- lastActive (Date)

(Constitutional: KEEP + MIGRATE)

## Canonical District Fields
- primaryColor, secondaryColor, metaTitle, metaDescription, ogImageUrl, contactNumber, description

(Constitutional: KEEP + MIGRATE)

## Quarantine Rules
- Files/folders to isolate from compile graph (do NOT delete, only exclude from tsconfig includes and build):
  - client/src/pages/archive/**
  - client/src/components/archive/**
  - archive/**
  - src/archive/**
  - client/src/archive/**
  - Any file or folder explicitly named 'legacy' or 'archive' or 'quarantine'

(Constitutional: QUARANTINE)

## Import Topology Rules
- Shared is sovereign root for contracts and types only.
- No shared files may import server runtime modules (storage, prisma, server services).
- Server and client import shared.
- Paths:
  - Use path alias `@/shared/*` for client build (tsconfig client mapping)
  - Use `shared/*` relative imports for server (or `@shared/*` if runtime resolves)

(Constitutional: REFACTOR)

## Next Actions (Phase 1 prioritized)
P1 Restore import resolution
- Audit `client/src/shared` and `shared` to reconcile moved modules
- Recreate canonical exports for `@/shared/api/response-normalizers` and `@/shared/routing/sovereign-routes`

P2 Define canonical contracts (this file)

P3 Quarantine dead drift (update tsconfig exclude and move to quarantine list)

P4 Reconcile Prisma schema (map schema drift table -> canonical fields)

P5 Restore type constitution (npm run typecheck => 0)

P6 Runtime execution validation

P7 District pilot hardening

## Governance
- All schema changes must have Constitutional Mapping entries with rationale and migration plan.
- No ad-hoc deletions. Only KEEP / RENAME / REMOVE with documented justification.

