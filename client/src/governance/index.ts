// 🏛️ BHARAT-OS: GOVERNANCE LAYER — SINGLE EXPORT POINT
// ================================================================
// All entity intelligence is accessed through this barrel export.
//
// NO component should import from:
//   entity-intelligence.ts
//   entity-policies.ts
//   entity-classifier.ts
//   cta-orchestrator.ts
//
// ONLY import from this barrel or from sovereign-orchestrator.ts.
// ================================================================

// ── Sovereign Orchestrator (recommended entry point) ──
export {
    analyzeEntity,
    detectKind,
    getPolicy,
    isValidKind,
    getFallbackKind,
} from "./sovereign-orchestrator";
export type { EntityIntelligence } from "./sovereign-orchestrator";

// ── Core Types (re-exported for convenience) ──
export type {
    EntityKind,
    EntityDetectionSignals,
    EntityClassificationResult,
    EntityKindMetadata,
} from "./entity-intelligence";

export type {
    EntityPolicy,
} from "./entity-policies";

export type {
    ResolvedAction,
    ActionType,
    ActionHandler,
} from "./cta-orchestrator";

// ── Canonical CTA Resolver (NEW Sovereign Standard) ──
export {
    resolveEntityCTAs,
    getEntityCTAPolicy,
    getCTAMetadata,
    isEntityKind,
    isEntityCTA,
    hasCommerceDisplay,
    hasBookingFlow,
    getInteractionMode,
    getEntityKindLabel,
    resolveKindFromCategory,
    resolveKindFromTags,
} from "./entity-cta-resolver";

export type {
    EntityCTA,
    InteractionMode,
    EntityCTAPolicy,
    CTAMetadata,
    EntityCTAInput,
    ResolvedCTAs,
    CategoryCTAMapping,
} from "./entity-cta-resolver";

export {
    CTA_METADATA,
    ENTITY_CTA_POLICIES,
    CATEGORY_CTA_MAPPINGS,
    ENTITY_CTA_GOVERNANCE,
    ENTITY_CTA_RESOLVER_VERSION,
    ENTITY_CTA_RESOLVER_CREATED,
} from "./entity-cta-resolver";

// ── Metadata (read-only) ──
export { ENTITY_KIND_METADATA, ENTITY_INTELLIGENCE_GOVERNANCE } from "./entity-intelligence";
export { ENTITY_POLICY_GOVERNANCE } from "./entity-policies";
export { SOVEREIGN_ORCHESTRATOR_GOVERNANCE } from "./sovereign-orchestrator";

// ── Entity Route Resolver ──
export {
    resolveEntityRoute,
    resolveMarketplaceRoute,
    resolveProductRoute,
    resolveServiceRoute,
} from "./entity-route-resolver";
export type {
    ResolvableEntityKind,
    EntityRouteInput,
    EntityRouteResult,
} from "./entity-route-resolver";

// ── Entity Experience Resolver ──
export {
    resolveEntityExperience,
    isEntityCommerce,
} from "./entity-experience-resolver";
export type {
    ExperienceInput,
    ResolvedExperience,
} from "./entity-experience-resolver";

// ── Version info ──
export const GOVERNANCE_VERSION = "1.1.0";
export const GOVERNANCE_CREATED = "2026-05-23";
