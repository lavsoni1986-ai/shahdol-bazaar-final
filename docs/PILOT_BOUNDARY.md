# PILOT BOUNDARY - Shahdol Bazaar MVP

**PHASE 1 - PILOT LOCKDOWN (DETAIL IMPLEMENTATION)**

**Effective Date:** 2026-05-13  
**Status:** ACTIVE - SYSTEM SCOPE FROZEN

## 📋 PURPOSE

✅ **SYSTEM SCOPE FREEZE**  
- Prevent entropy increase  
- Avoid random fixes  
- Maintain cognition stability  
- Enable rollout possibility  

## 🛡️ PILOT-CRITICAL MODULES

**ONLY THESE GET ACTIVE FIXES**  
**Every other module may fail/drift without blocking pilot deployment.**

### 1. `concierge.routes.ts`
**Role:** Main cognition entrypoint

**Must Guarantee:**
- Request never hangs
- Try/catch complete coverage
- Telemetry always exists
- Response always finalized
- FSM valid transitions only
- Timeout discipline

**Allowed Errors:** NONE

**Mandatory Rules:**
- Every path must finalize: `return finalizeCognitionResponse(...)`
- Every fatal error: `failStage(...)`
- No direct `res.json` - only `finalizeCognitionResponse()`

### 2. `discovery.service.ts`
**Role:** Entity discovery orchestration

**Must Guarantee:**
- No hallucinated entities
- Deterministic ranking
- No null corruption
- Vendor identity preserved

**Mandatory Rules:**
- Unknown remains `null`:
  ```typescript
  openNow: null  // NOT false
  ```
- No fallback fabrication:
  ```typescript
  ❌ "Untitled"
  ✅ "Local Partner"
  ```

### 3. `discovery-gateway.ts`
**Role:** Truth hydration layer  
**MOST CRITICAL FILE NOW**

**This file defines:**
- Metadata truth
- Live signal truth
- Actionability truth
- Completeness scoring

**Mandatory Architecture:**
- **STATIC** (Persisted truth only):
  - specialization
  - businessHours
  - deliverySupport

- **COMPUTED** (Derived truth):
  - metadataCompletenessScore
  - trustAssessment

- **LIVE** (Must NEVER persist):
  - openNow
  - queueEstimate
  - doctorAvailable

**CRITICAL RULE:**
**NEVER INFER LIVE STATE**
```typescript
❌ WRONG
openNow: true  // because businessHours exist

✅ RIGHT
openNow: null  // until verified
```

### 4. `district-intelligence.service.ts`
**Role:** District memory + unmet demand cognition

**Must Guarantee:**
- Shared learning persistence works
- Unmet demand tracking works
- District memory never crashes cognition

**Required Governance:**
- ALL learning writes guarded:
  ```typescript
  if (!prisma.sharedLearning) return;
  ```
- Never block cognition on memory failure:
  ```typescript
  try {
    learning...
  } catch {
    log only  // don't throw
  }
  ```

### 5. `runtime-state.ts`
**Role:** Sovereign cognition state authority  
**MOST IMPORTANT GOVERNANCE FILE**

**Mandatory Rule:**
ALL mutable runtime fields MUST exist BEFORE seal.

**Example:**
```typescript
return Object.seal({
  telemetry: null,
  confidenceRationale: null,
  synthesis: null,
  semanticRejection: false
})
```

**Forbidden:**
```typescript
❌ NEVER:
executionState.newField = ...  // after seal
```

### 6. `runtime-orchestrator.ts`
**Role:** FSM governance authority

**Must Guarantee:**
- Deterministic transitions
- No illegal jumps
- Idempotency

**Mandatory Rule:**
ALL stage changes go through:
- `advanceStage()`
- OR `failStage()`

**NEVER:**
```typescript
executionState.stage = ...  // direct assignment
```

**Legal Flow:**
```
INITIALIZED
→ VALIDATION
→ GROUNDING
→ DISCOVERY
→ CONFIDENCE
→ RESPONSE_SYNTHESIS
→ FINALIZED
```

### 7. `response-finalizer.ts`
**Role:** Single response authority

**Must Guarantee:**
- Exactly one response
- Normalized payload
- Telemetry emitted safely

**Mandatory Rules:**
- ONLY THIS FILE MAY: `res.json()`
- Must always protect telemetry:
  ```typescript
  if (executionState.telemetry) {
    // emit safely
  }
  ```

## 🚨 EVERYTHING ELSE = NON_PILOT

**This is VERY important.**

**NON_PILOT DEFINITION:**
These modules:
- May fail
- May drift
- May remain broken
- May be archived
- May be rewritten later

**WITHOUT blocking pilot.**

## 🚫 DO NOT FIX NOW

### QUARANTINE GROUP A (HIGH ENTROPY)
- `system.health.ts`
- `user.intelligence.ts`
- `webhookHandler.ts`
- `signal.engine.ts`

**Reason:** Old architecture assumptions.

### QUARANTINE GROUP B (PARTIAL EVOLUTION)
- `entity-search-indexing.ts`
- `sovereign.global.search.ts`
- `observability-dashboard.ts`

**Reason:** Schema incomplete.

### QUARANTINE GROUP C (ADMIN/LEGACY)
- Everything in: `client/src/pages/archive/`
- All admin intelligence tooling

## 🎯 TS CONFIG GOVERNANCE

**Temporarily exclude:**
```json
{
  "exclude": [
    "server/tests",
    "server/services/system.health.ts",
    "server/services/user.intelligence.ts",
    "server/services/webhookHandler.ts",
    "server/shared/cognition/entity-search-indexing.ts"
  ]
}
```

## 🚨 IMPORTANT

**This is NOT "hiding errors".**  
**This is: 🏛️ BOUNDED CONTEXT GOVERNANCE**

**Huge difference.**

## 🎯 NEXT EXECUTION PLAN

**After pilot lockdown:**

### STEP 1
Get ONLY pilot-critical modules to:
```bash
npx tsc --noEmit
```
With ZERO errors.

### STEP 2
Pilot deploy Shahdol cognition.

### STEP 3
Observe:
- Unmet demand
- Memory growth
- Query failures
- Cognition confidence
- Thin entities

### STEP 4
Later: revive quarantined modules ONE bounded context at a time.

**NOT all together.**