# 🧠 PHASE 2C — AI ENTITY GROUNDING TRACE

**Status**: ✅ VERIFIED | 🔴 REQUIRES CONSOLIDATION

---

## PART 1: CURRENT AI DATA SOURCES

### AI Services Using Entities

#### 1. **intent-ai.service.ts** 
- **Purpose**: Parse user intent using AI
- **Data Sources**:
  - Query text only (no entity data)
  - Category taxonomy
- **Grounding**: SEMANTIC (query-based, not entity-based)
- **Status**: ✅ No consolidation needed

#### 2. **ai_engine.service.ts**
- **Purpose**: Calculate sovereign scores for ranking
- **Data Sources**:
  - `prisma.vendor.findUnique()` - Direct DB access
  - `prisma.vendorMLProfile.findUnique()` - ML data
- **Grounding Issue**: 🔴 NOT using unified DTO
- **Action Required**: ⚠️ UPDATE to use entity.dto mappers

#### 3. **brain.service.ts**
- **Purpose**: Scoring & ranking engine
- **Data Sources**:
  - `prisma.vendor.findUnique()` - Direct DB
  - `conversionRate` field
- **Grounding Issue**: 🔴 Using vendor table directly, not normalized
- **Action Required**: ⚠️ UPDATE to use entity.dto

#### 4. **dynamic-discovery-ranking.service.ts**
- **Purpose**: Rank entities for discovery feed
- **Data Sources**:
  - Vendor entities from discovery service
  - Product entities
  - NO AI enrichment currently
- **Grounding**: ✅ CORRECT (uses discovery mappers)
- **Status**: ✅ Ready for consolidation

#### 5. **district-memory.service.ts**
- **Purpose**: Track demand patterns & entity intelligence
- **Data Sources**:
  - Search queries
  - Entity impressions
  - District commerce patterns
- **Grounding**: ✅ METADATA-BASED (not entity-specific)
- **Status**: ✅ No change needed

#### 6. **ai-refine.service.ts**
- **Purpose**: Generate reasons for search results
- **Data Sources**:
  - Query text
  - Vendor object (partial)
- **Grounding Issue**: 🔴 Uses raw vendor data
- **Action Required**: ⚠️ UPDATE to use entity.dto

---

## PART 2: CRITICAL GROUNDING POINTS

### Where AI Enrichment Happens

```typescript
// CURRENT (Problematic)
const vendor = await prisma.vendor.findUnique({ where: { id } });
const score = calculateScore(vendor); // Receives raw DB model

// REQUIRED (Standardized)
const vendor = await prisma.vendor.findUnique({ where: { id } });
const dto = mapVendorByType(vendor); // Unified DTO
const score = calculateScore(dto);   // Receives normalized shape
```

### AI Sources Matrix

| Service | Current Source | After Consolidation | Risk Level |
|---------|----------------|---------------------|-----------|
| intent-ai | Query text | Query text | 🟢 LOW |
| ai_engine | Raw Vendor | entity.dto | 🔴 HIGH |
| brain | Raw Vendor | entity.dto | 🔴 HIGH |
| dynamic-discovery | Discovery entity | entity.dto | 🟡 MEDIUM |
| district-memory | Event metadata | Event metadata | 🟢 LOW |
| ai-refine | Raw Vendor | entity.dto | 🔴 HIGH |

---

## PART 3: AI EMBEDDING GROUNDING

### Vector Embeddings

**Current State**:
```sql
-- Vendor table has vectorEmbedding (JSON)
-- Product table has vectorEmbedding (JSON)
-- NO unified embedding service
```

**Issues**:
- 🔴 Different entities may have different embedding schemas
- 🔴 Hospital/School embeddings not standardized
- 🔴 No consistent entity normalization before embedding

**Fix Required**:
```typescript
// unified-entity-embeddings.service.ts
export async function generateEntityEmbedding(entity: CanonicalEntity) {
  const normalized = {
    type: entity.entityType,
    text: `${entity.name} ${entity.description}`,
    metadata: entity.meta,
  };
  
  const embedding = await aiProviderManager.embed(normalized.text);
  return embedding;
}
```

---

## PART 4: SEARCH-TIME AI GROUNDING

### searchUnified.service.ts Flow

```
Query Input
    ↓
Intent Detection (AI) → Category
    ↓
Search Expansion → Terms
    ↓
semanticSearch() or fetchData() → RAW VENDOR/PRODUCT ENTITIES
    ↓
rankVendors() → Still raw, no DTO conversion
    ↓
generateReason() → 🔴 Uses raw vendor data for AI explanation
    ↓
Final Response → Mixed DTO shapes
```

**Required Fix**:
```typescript
// After rankVendors, before response:
const normalized = vendors.map(v => mapVendorByType(v));
const enriched = await enrichWithAI(normalized); // Use DTO
```

---

## PART 5: DISCOVERY-TIME AI GROUNDING

### getUnifiedDiscoveryFeed Flow

```
District Request
    ↓
Query Vendors/Products/Hospitals/Schools from Tables
    ↓
Map to DiscoveryEntity ✅ (Already done)
    ↓
calculateDiscoveryRank() ✅ (Uses mapped entity)
    ↓
Sort & Return
```

**Status**: ✅ MOSTLY GOOD
**Only Issue**: Need to also use entity.dto (not just DiscoveryEntity)

---

## PART 6: CONSOLIDATION ACTION ITEMS

### HIGH PRIORITY (🔴 Must Fix)

#### 6.1 - Update ai_engine.service.ts
```typescript
// BEFORE
const dssl = await getDSSLScore(vendorId);
const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });

// AFTER
const dssl = await getDSSLScore(vendorId);
const vendorRaw = await prisma.vendor.findUnique({ where: { id: vendorId } });
const vendor = mapVendorByType(vendorRaw); // Unified DTO
```

#### 6.2 - Update brain.service.ts
```typescript
// Same as 6.1 - add DTO mapping before scoring
```

#### 6.3 - Update ai-refine.service.ts
```typescript
// generateReason should accept CanonicalEntity or UnifiedEntityResponse
// Not raw Vendor model
```

#### 6.4 - Update searchUnified.service.ts
```typescript
// After rankVendors(), convert to entity.dto before generateReason()
const enriched = vendors.map(v => mapVendorByType(v));
```

### MEDIUM PRIORITY (🟡 Should Fix)

#### 6.5 - Create unified-entity-embeddings.service.ts
- Standardize how embeddings are generated
- Use CanonicalEntity as input
- Store embeddings in unified way

#### 6.6 - Update vector search
- If using vector similarity, ensure both query and target are normalized DTO

### LOW PRIORITY (🟢 Nice to Have)

#### 6.7 - Add telemetry
- Track which AI service uses which entity type
- Monitor DTO conversion overhead

---

## PART 7: VERIFICATION CHECKLIST

- [ ] ai_engine.service.ts uses entity.dto
- [ ] brain.service.ts uses entity.dto
- [ ] ai-refine.service.ts uses entity.dto
- [ ] searchUnified.service.ts converts to entity.dto before AI enrichment
- [ ] Vector embeddings use unified CanonicalEntity
- [ ] All entity responses use consistent shapes
- [ ] Discovery service uses entity.dto (supplementary to DiscoveryEntity)
- [ ] No raw Vendor/Hospital/School objects passed to AI functions

---

## SUMMARY

**Current State**: 🟡 PARTIAL (Discovery good, Search/AI mixed)

**Action Plan**:
1. Update 3 critical AI services to use entity.dto (HIGH)
2. Create unified embedding service (MEDIUM)
3. Verify search pipeline uses DTO (HIGH)

**Impact**: 
- ✅ Consistent AI grounding across all entities
- ✅ Better ranking consistency
- ✅ Easier AI model training (normalized inputs)
- ✅ ONE SOVEREIGN ENTITY GRAPH achieved
