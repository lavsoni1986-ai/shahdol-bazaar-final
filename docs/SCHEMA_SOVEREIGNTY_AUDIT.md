# SCHEMA SOVEREIGNTY AUDIT

## Overview

Prisma schema and runtime have diverged. Services reference models that no longer exist in the schema. This audit classifies every missing Prisma entity with production decisions.

## Classification Rules

- **RESTORE**: Strategic production model required for Shahdol MVP
- **ARCHIVE**: Future feature, move to quarantine until needed
- **DELETE**: Dead/hallucinated architecture, remove completely

## Missing Entities Audit

| Entity | Used In | Exists In Schema? | Decision | Rationale |
|--------|---------|-------------------|----------|-----------|
| auditLog | dssl.intelligence.ts, event-delivery-verification.ts, financial-invariant-engine.ts, reservation-cleanup-worker.ts, system.health.ts | ❌ | RESTORE | Core observability for production logging |
| userEvent | execution-telemetry.service.ts, fraud.behavior.ts, telemetry.service.ts, user.intelligence.ts | ❌ | RESTORE | Essential for user behavior analytics in MVP |
| merchantSubscription | tier.manager.ts | ❌ | ARCHIVE | Monetization feature, not needed for Shahdol pilot |
| telemetryTruth | telemetry.service.ts | ❌ | RESTORE | Critical for cognition pipeline validation |
| advertisement | ad.scheduler.ts | ❌ | ARCHIVE | Ad system for future monetization |
| adSlot | ad.scheduler.ts | ❌ | ARCHIVE | Ad system for future monetization |
| vendorMetricsDaily | dynamic-discovery-ranking.service.ts | ❌ | RESTORE | Vendor ranking algorithm core to marketplace |
| aIInsight | prediction.engine.ts | ❌ | RESTORE | AI-driven insights for district intelligence |
| fraudPattern | fraud.pattern.ts | ❌ | RESTORE | Fraud detection required for production |
| eventLog | local.intelligence.profile.ts, prediction.engine.ts | ❌ | RESTORE | Event tracking for ML models |
| adminLog | system.health.ts | ❌ | RESTORE | Admin operations logging |
| userIntelligence | system.health.ts, user.intelligence.ts | ❌ | RESTORE | User profiling for personalized search |
| fraudHistory | fraud.detection.ts, system.health.ts, user.intelligence.ts | ❌ | RESTORE | Fraud prevention core feature |
| systemLock | system.health.ts | ❌ | RESTORE | System maintenance locks |
| vendorMLProfile | sovereign.global.search.ts, SovereignBrain.ts | ❌ | RESTORE | ML-enhanced vendor profiles |
| RealLoadExecutor | live-fire-validation-suite.ts (test) | ❌ | ARCHIVE | Enterprise load testing, quarantine tests |

## Implementation Plan

### Phase 1: RESTORE Entities
For each RESTORE entity:
1. Add model definition to Prisma schema
2. Run prisma generate
3. Verify no breaking changes in dependent services

### Phase 2: ARCHIVE Entities
Move dependent services to quarantine/ until future phases

### Phase 3: DELETE Entities
Remove all references and clean up code

## Risk Assessment

- **High Risk**: auditLog, userEvent, telemetryTruth - break observability if not restored
- **Medium Risk**: vendorMetricsDaily, fraudPattern - impact core marketplace features
- **Low Risk**: merchantSubscription, advertisement - future features can be added later

## Next Steps

1. Restore critical production entities first
2. Run npx tsc --noEmit after each restore
3. Archive non-critical features
4. Consolidate sovereign brain architecture