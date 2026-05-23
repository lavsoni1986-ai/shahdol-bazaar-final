# Phase-1 Runtime Stabilization — Plan & Trace

## Derivation Rule (used everywhere)
```ts
const isSponsored = !!vendor.boostedUntil && new Date(vendor.boostedUntil) > new Date();
```

## Modified Files (chronological order):
1. server/dto/entity.dto.ts — 6 DTO mappers
2. server/services/discovery.service.ts — 1 mapper
3. server/routes/marketplace/stores.routes.ts — 2 response surfaces
4. server/services/search.service.ts — deprecated SELECT fix
5. server/routes/admin/admin.routes.ts — invalid Prisma write
6. server/routes/payments.cashfree.routes.ts — MONEY+ GOVERNANCE
