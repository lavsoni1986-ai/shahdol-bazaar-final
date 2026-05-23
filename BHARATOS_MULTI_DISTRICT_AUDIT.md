# BHARATOS MULTI-DISTRICT SCALABILITY AUDIT
## Principal Architect Report for 15-20 District Scale-Up

**System:** BharatOS - Sovereign District Operating System
**Current:** Shahdol districtId: 121
**Target Phase 1:** 15-20 districts simultaneous
**Audit Date:** 2026-04-19
**Scale Readiness Score:** 4/10 - DO NOT SCALE YET

---

## CORE MISSION
Ensure BharatOS can handle 15-20 districts with:
1. Strict tenant isolation
2. Zero data leakage
3. No duplicate logic
4. Consistent schema + API formats
5. <1s query performance at 100k records per district

---

## 1. MULTI-TENANT VALIDATION

### Required Checks
- [ ] EVERY tenant table MUST have `districtId Int @index`
- [ ] NO global table should have `districtId`
- [ ] NO tenant table missing `districtId` filter in Prisma extension

### Tables to Audit

```bash
Vendor, Product, Store, ServiceWorker, BusSchedule, Order,
OrderItem, User, Notification, Review, Category
```

### Collision Test Case
District 121: vendorId: 99, name: "Shahdol Store"
District 122: vendorId: 99, name: "Jabalpur Store"
Expected: GET /api/vendors/99 with districtId:121 returns ONLY "Shahdol Store"
Current: Returns whichever DB finds first - COLLISION

### Fix
Extend Prisma to scope ALL operations:
```typescript
$allModels: {
  findUnique: ({args, query}) => query({...args, where: {...args.where, districtId: getTenant()}}),
  create: ({args, query}) => query({...args, data: {...args.data, districtId: getTenant()}}),
  aggregate: ({args, query}) => query({...args, where: {...args.where, districtId: getTenant()}})
}
```

---

## 2. DATA ISOLATION TEST - ATTACK VECTORS

### Test 1: Direct ID Attack
```
Request: GET /api/vendors/5
Auth: User from districtId: 121
Vendor 5 belongs to: districtId: 122
Expected: 404 Not Found
Current: 200 OK - DATA LEAK
```
**Fix:** validateTenantResource('vendor') middleware

### Test 2: Create Cross-Tenant
```
Request: POST /api/products {districtId: 122, name: "Hacked"}
Auth: User from districtId: 121
Expected: 403 Forbidden or force districtId: 121
Current: Creates product in district 122 - DATA LEAK
```
**Fix:** Forbid districtId in body, always use req.districtId

### Test 3: Aggregation Leak
```
Request: GET /api/stats/total-products
Expected: Count only for req.districtId
Current: prisma.product.aggregate() returns global count - DATA LEAK
```
**Fix:** Prisma extension must scope aggregate

### Test 4: Bus Timetable Cross-Access
```
Check: Does busSchedule table have districtId?
Check: Does GET /api/bus filter by req.districtId?
If NO to either: District 121 sees District 122 routes
```

---

## 3. SEEDING SYSTEM AUDIT - CRITICAL FOR 20 DISTRICTS

### Requirements for seedDistrict(districtId)
- Idempotent: Can run 100x, same result
- No hardcoded IDs: Use upsert with @@unique([districtId][code])
- Consistent shape: All districts must match field names
- Transactional: All-or-nothing per district

### Duplicate ID Detection Query
```sql
-- Must return 0 rows after seeding
SELECT districtId, id, COUNT(*) FROM vendors GROUP BY districtId, id HAVING COUNT(*) > 1;
SELECT * FROM products WHERE districtId NOT IN (VALID_DISTRICT_IDS);
```

### Inconsistent Data Shape Check
```
Problem: District 121 bus = {time: "08:00"}
         District 122 bus = {firstBusTime: "08:00"}
Result: Frontend shows blank for 122
Fix: fieldMapper.ts normalizes all responses
```

### Seeding Script Structure
```typescript
// scripts/seed-all-districts.ts
const DISTRICTS = [
  {id: 121, name: "Shahdol"}, {id: 122, name: "Jabalpur"},
  //...up to 140
];

for (const d of DISTRICTS) {
  await prisma.$transaction(async (tx) => {
    await seedDistrict(tx, d.id, d.name);
  });
}
```

---

## 4. API SCALABILITY CHECKLIST

### All endpoints must pass:
- [ ] req.districtId filtering enforced via Prisma or middleware
- [ ] Pagination: limit <= 100, default 20
- [ ] No endpoint returns global data without explicit /admin/global route
- [ ] Response shape: {success: boolean, data: T, error?: {}, meta: {}}
- [ ] Errors: Never res.json({data: []}) on catch, use sendError()

### Endpoints to Audit
```bash
GET /api/products, /vendors, /stores, /bus, /orders
POST /api/products, /vendors, /orders
GET /api/vendors/:id, /products/:id - MUST use validateTenantResource
```

---

## 5. FRONTEND MULTI-DISTRICT SWITCH

### Race Condition Test
```
User on District 121, loads products
Switches to District 122 before API returns
Check: Does 121 data show on 122 page?
```

### Required Fixes
```typescript
// All React Query hooks
useQuery({
  queryKey: ['products', districtId],
  queryFn: () => api.getProducts(districtId),
  enabled:!!districtId, // Prevents undefined calls
  staleTime: 1 * 60 * 1000, // 1 min, not 5 min
})

// On district switch
queryClient.invalidateQueries({queryKey: ['products']})
queryClient.invalidateQueries({queryKey: ['vendors']})
```

---

## 6. DATABASE SCALE CHECK

### Required Indexes - Add to ALL tenant tables
```prisma
model Product {
  districtId Int
  status String
  categoryId Int
  createdAt DateTime

  @@index([districtId])
  @@index([districtId, status])
  @@index([districtId, categoryId])
  @@index([districtId, createdAt])
}
```

### Performance Target
```sql
SELECT * FROM products WHERE districtId = 121 LIMIT 20
Must run <50ms with 100k records in table
Test with: EXPLAIN ANALYZE
```

### N+1 Query Fix
```typescript
// Bad
stores.map(s => prisma.dsslScore.findMany({where: {storeId: s.id}}))

// Good
prisma.store.findMany({include: {dsslScores: true}, where: {districtId}})
```

---

## 7. DUPLICATION DETECTION

| Logic | Locations | Centralize To |
|-------|-----------|--------------|
| API response format | 50+ routes | server/lib/apiResponse.ts |
| Field mapping time/price | 20+ routes | server/lib/fieldMapper.ts |
| districtId injection | 50+ queries | Prisma extension |
| Error handling | 50+ catch blocks | errorHandler.ts middleware |
| Tenant validation | 30+ routes | validateTenantResource.ts |

---

## 8. SECURITY RISKS SUMMARY

- **Direct ID bypass:** /api/vendors/:id returns any district
- **Create cross-tenant:** POST body can set any districtId
- **Aggregate leak:** Count/sum queries return global data
- **Silent failures:** Bugs hide isolation breaks
- **Middleware order:** Wrong order = auth bypass

---

## 9. EXACT FIXES - IMPLEMENTATION ORDER

### Day 1-2: Core Safety - 8 hours
- [ ] Create apiResponse.ts with success/error helpers
- [ ] Create errorHandler.ts - replace all silent failures
- [ ] Create fieldMapper.ts - normalize time/price/firstBusTime
- [ ] Update 50 routes to use new format

### Day 3: Tenant Isolation - 6 hours
- [ ] Complete Prisma extension for create/findUnique/aggregate
- [ ] Create validateTenantResource.ts middleware
- [ ] Apply to 30+ /:id routes
- [ ] Add @@index() to all tables via migration[districtId]

### Day 4: Frontend + Seeding - 5 hours
- [ ] Add enabled:!!districtId to all React Query hooks
- [ ] Implement district switch invalidation
- [ ] Build seedDistrict() idempotent function
- [ ] Test with district 121 + 122

### Day 5-6: Testing - 8 hours
- [ ] Run all attack vectors from Section 2
- [ ] Load test: 20 districts × 100 concurrent users
- [ ] Verify 0 data leaks in logs
- [ ] EXPLAIN ANALYZE all queries <50ms

---

## 10. SUCCESS CRITERIA FOR 20 DISTRICT LAUNCH

### Must Pass Before Launch
- [ ] Attack Test: Cannot fetch vendor 5 from other district = 404
- [ ] Seed Test: Run seedDistrict() 20x, zero duplicate IDs
- [ ] Scale Test: 2M total records, queries <100ms
- [ ] Switch Test: District change clears cache in <200ms
- [ ] Format Test: All 50 endpoints return same shape
- [ ] Leak Test: Enable logs, confirm 0 cross-tenant queries

### Monitoring After Launch
```typescript
Alert if: Any query WHERE districtId IS NULL on tenant table
Alert if: Response time >500ms for districtId filtered query
Alert if: Error logs missing districtId context
```

---

## FINAL VERDICT

| Current State | After Fixes |
|--------------|-------------|
| 4/10 - Will leak data at district #2 | 8.5/10 - Safe for 20 districts |

**Time to Ready:** 40-50 hours = 1 week with 1 dev

**Critical Path:** Fix Prisma extension + validateTenantResource first. Without these, everything else leaks.

**Rollback Plan:** Git revert. No DB changes needed except indexes.