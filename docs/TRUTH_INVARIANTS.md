# TRUTH INVARIANTS - BharatOS Constitution

**The Constitution of BharatOS**  
**Immutable Truth Discipline for Distributed Cognition**

## 🔥 FUNDAMENTAL RULES

### RULE 1: Unknown ≠ False
**NEVER conflate absence of knowledge with falsity.**

```typescript
❌ WRONG: openNow: false  // Absence of data ≠ closed
✅ RIGHT: openNow: null   // Unknown state
```

**Implication:** Live signals must be explicitly verified. Static data cannot imply live state.

### RULE 2: Live State Cannot Be Inferred From Static Data
**Static truth and live signals are separate domains.**

```typescript
❌ NEVER INFER:
// If businessHours exist, assume openNow: true
openNow: businessHours ? true : null

✅ ALWAYS REQUIRE VERIFICATION:
openNow: null  // Until explicitly checked
```

**Implication:** Business hours ≠ operational status. Verification required for live state.

### RULE 3: No Direct res.json Outside Finalizer
**Response authority is centralized.**

```typescript
❌ FORBIDDEN:
app.get('/api/data', (req, res) => {
  res.json({ data });  // Direct response
});

✅ REQUIRED:
app.get('/api/data', (req, res) => {
  return finalizeResponse(res, { data });  // Through finalizer
});
```

**Implication:** All responses go through normalization and telemetry protection.

### RULE 4: No Stage Mutation Outside Orchestrator
**FSM authority is absolute.**

```typescript
❌ FORBIDDEN:
executionState.currentStage = CognitionStage.RESPONSE_SYNTHESIS;

✅ REQUIRED:
advanceStage(executionState, CognitionStage.RESPONSE_SYNTHESIS);
```

**Implication:** All state transitions are validated and logged.

### RULE 5: No Hallucinated Entity Hydration
**Truth must be grounded in persisted data.**

```typescript
❌ FORBIDDEN:
// Fabricating fallback data
title: dto.title || "Untitled Vendor"

✅ REQUIRED:
// Preserve unknown state
title: dto.title || null
```

**Implication:** Unknown remains unknown. No fabrication of missing data.

### RULE 6: All Cognition Flows Emit Telemetry
**Observability is mandatory.**

```typescript
❌ FORBIDDEN:
// Silent processing
const result = processQuery(query);

✅ REQUIRED:
// Always emit telemetry
const result = processQuery(query);
emitTelemetry(executionState.telemetry);
```

**Implication:** Every cognition execution is observable for debugging and improvement.

### RULE 7: All Failures Are Deterministic
**Chaos is eliminated through governance.**

```typescript
❌ FORBIDDEN:
// Random failures
throw new Error("Something went wrong");

✅ REQUIRED:
// Structured failures
failStage(executionState, currentStage, "Specific error", "ERROR_CODE");
```

**Implication:** Failures are predictable and recoverable.

## 🛡️ ARCHITECTURAL INVARIANTS

### STATIC TRUTH (Persisted Only)
- businessHours
- specialization
- deliverySupport
- contactInfo

**Never changes without explicit update.**

### COMPUTED TRUTH (Derived)
- metadataCompletenessScore
- trustAssessment
- relevanceScore

**Deterministically computed from static truth.**

### LIVE SIGNALS (Never Persisted)
- openNow
- queueEstimate
- doctorAvailable
- currentWaitTime

**Always null until verified. Never inferred.**

## ⚡ RUNTIME ASSERTIONS

**Every pilot-critical module must include:**

```typescript
/**
 * TRUTH INVARIANT: Never infer live state
 */
if (metadata.openNow === true && !metadata.liveSignalAt) {
  throw new Error("LIVE_SIGNAL_INVARIANT_VIOLATION");
}

/**
 * TRUTH INVARIANT: Unknown remains null
 */
if (entity.title === "Untitled" || entity.title === "Unknown") {
  throw new Error("HALLUCINATION_INVARIANT_VIOLATION");
}
```

## 📊 TELEMETRY INVARIANTS

**All telemetry must include:**
- queryHash
- executionTime
- stageTimings
- errorCodes (if any)
- entityCount
- confidenceScore

**Never include:**
- PII data
- Live signals (they're not persisted)

## 🔒 STATE SEAL INVARIANTS

**Runtime state must be sealed:**

```typescript
const executionState = Object.seal({
  // ALL mutable fields defined here
  telemetry: null,
  confidenceResult: null,
  // ...
});
```

**Forbidden after seal:**
```typescript
executionState.newField = value; // VIOLATION
```

## 🎯 TESTING INVARIANTS

**All tests must verify:**
1. Null preservation
2. No live state inference
3. Telemetry emission
4. Deterministic failures
5. FSM validity

## 🚨 VIOLATION CONSEQUENCES

**Immediate quarantine of violating module.**

**No exceptions. No mercy.**

**This constitution is the foundation of BharatOS sovereignty.**