# 🏛️ BHARAT-OS: ENTITY INTELLIGENCE GOVERNANCE — MIGRATION AUDIT

## Completed: 2026-05-22T22:58

---

## ARCHITECTURE

```
client/src/governance/
├── index.ts                    # Barrel export — single entry point
├── entity-intelligence.ts      # Entity kind taxonomy & classification data
├── entity-policies.ts          # Operational policy per kind
├── entity-classifier.ts        # Client-side classification engine
├── cta-orchestrator.ts         # CTA resolution & handler mapping
└── sovereign-orchestrator.ts   # Super AI orchestrator (entry point)

server/services/intelligence/
├── entity-classifier.ts        # Server-side authoritative classifier
├── intent-engine.ts            # Intent detection from queries
└── district-memory.ts          # District operational memory
```

## GOVERNANCE RULES

### 1. Entity Kind Classification
- Every entity MUST resolve to exactly one `EntityKind`
- NO entity falls through to "unknown" — `marketplace` is default
- Classification uses: category > business type > keywords > metadata
- Client classifier for instant rendering; server classifier is authoritative

### 2. Operational Policies
- Entity behavior is ENTIRELY policy-driven
- NO component should hardcode:
  ```typescript
  if (category === 'medical') then...  // ❌ FORBIDDEN
  if (vendor.isHospital) then...      // ❌ FORBIDDEN
  ```
- EVERYTHING goes through policy engine:
  ```typescript
  import { analyzeEntity } from "../governance";
  const intelligence = analyzeEntity(vendor);
  // intelligence.policy.primaryCTALabel ✅
  ```

### 3. CTA Orchestration
- CTAs are resolved by ENTITY KIND, not by component
- NO hardcoded `<AddToCart />` — use `resolveEntityActions(kind)`
- Emergency actions ALWAYS highest priority
- UI variant ("primary" | "outline" | "emergency") is policy-defined

### 4. Intent Detection
- User queries classified by multi-factor scoring
- Emergency intents trigger critical urgency
- Hindi/English multilingual pattern support
- AI fallback enabled for low-confidence queries

### 5. District Memory
- Each district accumulates intelligence independently
- Trusted providers, fraud alerts, popular categories, seasonal demand
- District-aware entity classification

## MIGRATION STRATEGY

### Phase A: Existing Components (NON-BREAKING)
Replace hardcoded entity type checks with `analyzeEntity()`:
```typescript
// BEFORE
const isHospital = vendor.isHospital;
const ctaLabel = isHospital ? "Book Appointment" : "Contact";

// AFTER
const intelligence = analyzeEntity(vendor);
const ctaLabel = intelligence.policy.primaryCTALabel;
```

### Phase B: Product Detail (Priority)
Current `product-detail.tsx` uses `vendor.isHospital`/`vendor.isProfessional` flags.
Migrate to:
```typescript
const { policy, primaryActions, handlers } = analyzeEntity(vendor);
// Use policy.purchasable, policy.bookable, policy.consultation
```

### Phase C: Marketplace Search
Current `SearchBar` has type-specific rendering paths.
Migrate to dynamic entity kind rendering.

### Phase D: Sovereign Cards
`SovereignProductCard` / `SovereignStoreCard` — replace if/else CTA logic
with orchestrator-driven action resolution.

## VERIFICATION

### Build Check
```bash
npx tsc --noEmit --pretty 2>&1 | head -50
```
Expected: Zero new errors from governance layer imports.

### Audit Check
Search for forbidden patterns:
```bash
# FORBIDDEN: These should NOT appear in component code
grep -r "vendor.isHospital" client/src/pages/
grep -r "vendor.isProfessional" client/src/pages/
grep -r "category === 'medical'" client/src/
```

## VERSION

- **Governance Layer**: 1.0.0
- **Entity Intelligence**: 1.0.0  
- **Entity Policies**: 1.0.0
- **Entity Classifier**: 1.0.0
- **CTA Orchestrator**: 1.0.0
- **Sovereign Orchestrator**: 1.0.0
- **Server Classifier**: 1.0.0
- **Intent Engine**: 1.0.0
- **District Memory**: 1.0.0
