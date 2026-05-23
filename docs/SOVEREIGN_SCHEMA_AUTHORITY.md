# SOVEREIGN SCHEMA AUTHORITY

## Canonical Field Contracts for Shahdol Bazaar District Intelligence OS

This document defines the authoritative data contracts that govern all runtime behavior, AI cognition, and discovery intelligence in the Shahdol Bazaar system.

## Sovereign Data Tiers

### Layer 1: Core Commerce
- **Purpose**: Transaction processing, inventory management, order fulfillment
- **Models**: Order, SovereignOrder, Product, Category
- **Authority**: Financial integrity, stock accuracy, payment security

### Layer 2: Discovery Layer
- **Purpose**: Entity discovery, search, ranking, marketplace feeds
- **Models**: Vendor, Hospital, ServiceWorker, Schools
- **Authority**: Search relevance, AI ranking, user discovery experience

### Layer 3: Intelligence Layer
- **Purpose**: AI cognition, embeddings, recommendation systems
- **Models**: Vector embeddings, AI scoring, semantic search
- **Authority**: Machine learning accuracy, personalization quality

### Layer 4: Sovereign Governance
- **Purpose**: Trust, moderation, compliance, district sovereignty
- **Models**: District, Admin, moderation flags, audit trails
- **Authority**: Platform integrity, legal compliance, user safety

## Canonical Model Definitions

### Vendor Model
```prisma
model Vendor {
  id                    Int @id @default(autoincrement())
  name                  String
  slug                  String @unique
  districtId            Int?
  district              District? @relation(fields: [districtId], references: [id])
  status                VendorStatus @default(PENDING)
  isVerified            Boolean @default(false)
  isShadowBanned        Boolean @default(false)
  category              String?
  categorySlug          String?
  searchText            String?
  aiRankScore           Float @default(0)
  rating                Float @default(0)
  dsslScore             Int @default(0)
  trendingScore         Int @default(0)
  vectorEmbedding       Json?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  // Relations...
}
```

### Product Model
[Define canonical Product fields]

### District Model
[Define canonical District fields]

## Migration Authority

- All schema changes must be approved against this authority
- Runtime code assumes these contracts exist
- DB follows schema, never reverse-engineer from DB
- Migrations are single, comprehensive updates

## Runtime Dependencies

- Marketplace engine requires Vendor.aiRankScore for ranking
- Discovery feeds require Vendor.searchText for search
- AI concierge requires vector embeddings for cognition
- District middleware requires District sovereignty fields

## Governance Rules

1. Schema defines sovereignty - DB follows
2. Never use `prisma db pull` in production workflows
3. All new features must declare their schema dependencies
4. Runtime failures indicate contract violations, not bugs
5. Canonical models are updated here first, then schema