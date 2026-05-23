# BharatOS Sovereign Architecture Guardrails

## Core Principles

1. **Sovereign Cognition**: All AI operations must be district-isolated and telemetry-tracked
2. **Contract Integrity**: All API responses follow `{ success, data, error, meta }` format
3. **Entity Normalization**: Never use raw DB businessType - always use `CanonicalBusinessType`
4. **District Isolation**: Every data query must include `districtId` filtering
5. **Observability First**: All cognition operations must be logged with structured data
6. **Service Layer Ownership**: Pages consume services, never own data orchestration

## Forbidden Patterns (🚫 WILL BREAK BUILD)

### Raw Fetch Usage
```typescript
// ❌ FORBIDDEN
await fetch("/api/leads", { method: "POST", ... });

// ✅ REQUIRED
await apiRequest("POST", "leads", { body: data });
```

### Direct Prisma in Routes
```typescript
// ❌ FORBIDDEN
const vendor = await prisma.vendor.findFirst({ where: { slug } });

// ✅ REQUIRED
const vendor = await prisma.vendor.findFirst({
  where: { slug, districtId, status: "APPROVED", isShadowBanned: false }
});
```

### Page-Level Orchestration
```typescript
// ❌ FORBIDDEN
const fetchVendorById = async (id) => { ... }

// ✅ REQUIRED
// Use service layer: import { fetchVendorById } from '../services/vendor.service'
```

### Unguarded API Responses
```typescript
// ❌ FORBIDDEN
return res.json(data);

// ✅ REQUIRED
return sovereignSuccess(res, data, meta);
```

### Raw Business Type Usage
```typescript
// ❌ FORBIDDEN
if (vendor.businessType === "HOSPITAL") { ... }

// ✅ REQUIRED
import { normalizeBusinessType, CanonicalBusinessType } from '../lib/entityNormalization';
if (normalizeBusinessType(vendor.businessType) === CanonicalBusinessType.HEALTHCARE) { ... }
```

### District-Unaware Queries
```typescript
// ❌ FORBIDDEN
prisma.vendor.findMany({ where: { status: "APPROVED" } });

// ✅ REQUIRED
prisma.vendor.findMany({
  where: {
    districtId,
    status: "APPROVED",
    isShadowBanned: false
  }
});
```

### Unlogged Cognition Operations
```typescript
// ❌ FORBIDDEN
const result = await aiEngine.processQuery(query);

// ✅ REQUIRED
const startTime = Date.now();
const result = await aiEngine.processQuery(query);
cognitionLogger.logCognitionOperation({
  operation: "query_processing",
  districtId,
  query,
  responseTime: Date.now() - startTime,
  // ... other structured data
});
```

## Mandatory Patterns (✅ REQUIRED)

### API Response Validation
```typescript
const result = await apiRequest("GET", "endpoint");
if (!result.success) {
  throw createDomainError('api', result.error || 'API request failed');
}
return result.data;
```

### Entity Normalization
```typescript
import { normalizeBusinessType, CanonicalBusinessType } from '../lib/entityNormalization';

const canonicalType = normalizeBusinessType(vendor.businessType);
```

### Structured Cognition Logging
```typescript
import { cognitionLogger } from '../lib/observability';

cognitionLogger.logCognitionOperation({
  operation: "intent_classification",
  districtId,
  query,
  intent,
  semanticScore,
  accepted: score > threshold,
  // ... complete structured data
});
```

### Service Layer Consumption
```typescript
// In components/pages
import { fetchVendorBySlug, trackAnalytics } from '../services/vendor.service';

// Never define fetch functions in pages
```

### District Context Propagation
```typescript
// Always include district context
const result = await apiRequest("GET", "endpoint", {
  headers: { 'x-district-slug': districtSlug }
});
```

### React Query Consistency
```typescript
// Consistent queryKey patterns
const { data } = useQuery({
  queryKey: ["entity", "by-slug", slug, districtId],
  queryFn: () => service.fetchBySlug(slug),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Proper cache invalidation
queryClient.invalidateQueries({ queryKey: ["entity", "by-slug", slug] });
```

## Quality Gates

### Pre-Commit Hooks
- ESLint rules for forbidden patterns
- TypeScript strict mode
- Import restrictions

### Build-Time Checks
- API contract validation
- Entity normalization verification
- District isolation audit

### Runtime Guards
- Response validation in apiRequest
- Business type normalization
- Cognition operation logging

## Emergency Overrides

**Only for critical hotfixes with explicit approval:**

```typescript
// EMERGENCY: Raw fetch allowed only with justification
// MUST include TODO for service migration
const result = await fetch("/api/critical-fix");
```

## Migration Priority

1. **P0**: API contract standardization
2. **P0**: District isolation enforcement
3. **P1**: Entity normalization
4. **P1**: Observability layer completion
5. **P2**: Service layer expansion

## Enforcement

- **Build Failure**: Forbidden patterns trigger build errors
- **Code Review**: Mandatory guardrail compliance check
- **Monitoring**: Runtime violations logged and alerted
- **Documentation**: All deviations require explicit approval

---

*These guardrails ensure BharatOS remains sovereign, maintainable, and scalable. Violations will be treated as critical incidents.*