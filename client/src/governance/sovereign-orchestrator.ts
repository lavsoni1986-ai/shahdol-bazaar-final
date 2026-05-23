// 🏛️ BHARAT-OS: SOVEREIGN AI ORCHESTRATOR
// ================================================================
// Central orchestration layer that connects:
// Entity Intelligence → Policy Engine → Classifier → CTA Orchestrator
//
// Single entry point for ALL entity intelligence queries.
// NO component should import entity-intelligence, entity-policies,
// entity-classifier, or cta-orchestrator directly.
//
// Everything goes through sovereignOrchestrator.
// ================================================================

import { EntityKind, ENTITY_INTELLIGENCE_GOVERNANCE } from "./entity-intelligence";
import type { EntityClassificationResult } from "./entity-intelligence";
import { getEntityPolicy, type EntityPolicy } from "./entity-policies";
import { detectEntityKind, classifyEntityKind, extractClassificationSignals, isValidEntityKind } from "./entity-classifier";
import { resolveEntityActions, getPrimaryActions, getSecondaryActions, type ResolvedAction, type ActionType, ACTION_HANDLERS, type ActionHandler } from "./cta-orchestrator";

// ─── COMPOSED RESULT ─────────────────────────────────────────────

export interface EntityIntelligence {
    /** Resolved entity kind */
    kind: EntityKind;
    /** Confidence score (0-1) */
    confidence: number;
    /** Classification signals */
    signals: string[];
    /** Operational policy */
    policy: EntityPolicy;
    /** Primary CTA actions (1 + emergency) */
    primaryActions: ResolvedAction[];
    /** Secondary CTA actions (overflow) */
    secondaryActions: ResolvedAction[];
    /** All actions ordered by priority */
    allActions: ResolvedAction[];
    /** Handler map for wired UI components */
    handlers: Record<string, ActionHandler>;
    /** Classification metadata */
    classification: EntityClassificationResult;
}

// ─── ORCHESTRATOR ────────────────────────────────────────────────

/**
 * Get full entity intelligence from a raw entity object.
 * This is the PRIMARY entry point for all entity-aware UI.
 *
 * Usage:
 *   const intelligence = sovereignOrchestrator.analyze(vendor);
 *   // intelligence.policy.primaryCTALabel — "Book Appointment"
 *   // intelligence.primaryActions[0] — { label: "Book Appointment", ... }
 *   // intelligence.handlers.book_appointment — handler definition
 */
export function analyzeEntity(entity: any, vendorBusinessType?: string): EntityIntelligence {
    // 1. Classify
    const kind = detectEntityKind(entity, vendorBusinessType);
    const signals = extractClassificationSignals(entity, vendorBusinessType);
    const classification = classifyEntityKind(signals);

    // 2. Get policy
    const policy = getEntityPolicy(kind);

    // 3. Resolve actions
    const allActions = resolveEntityActions(kind);
    const primaryActions = getPrimaryActions(kind);
    const secondaryActions = getSecondaryActions(kind);

    // 4. Build handler map for UI wiring
    const handlers: Record<string, ActionHandler> = {};
    for (const action of allActions) {
        const handler = ACTION_HANDLERS[action.type];
        if (handler) {
            handlers[action.type] = handler;
        }
    }

    return {
        kind,
        confidence: classification.confidence,
        signals: classification.signals,
        policy,
        primaryActions,
        secondaryActions,
        allActions,
        handlers,
        classification,
    };
}

/**
 * Simple entity kind detection — returns just the kind string.
 * Use when you only need the kind (e.g., for conditional rendering flags).
 */
export function detectKind(entity: any, vendorBusinessType?: string): EntityKind {
    return detectEntityKind(entity, vendorBusinessType);
}

/**
 * Get policy for any entity — returns operational capabilities.
 * Use when you need to check entity capabilities.
 */
export function getPolicy(kind: EntityKind): EntityPolicy {
    return getEntityPolicy(kind);
}

/**
 * Validate that a kind string is a recognized entity kind.
 */
export function isValidKind(kind: string): kind is EntityKind {
    return isValidEntityKind(kind);
}

/**
 * Get fallback kind for unclassifiable entities.
 */
export function getFallbackKind(): EntityKind {
    return ENTITY_INTELLIGENCE_GOVERNANCE.FALLBACK_KIND;
}

// ─── VERSION ─────────────────────────────────────────────────────

export const SOVEREIGN_ORCHESTRATOR_VERSION = "1.0.0";
export const SOVEREIGN_ORCHESTRATOR_CREATED = "2026-05-22";

export const SOVEREIGN_ORCHESTRATOR_GOVERNANCE = {
    /** No direct imports from entity-intelligence, entity-policies, entity-classifier, or cta-orchestrator allowed */
    DIRECT_IMPORTS_FORBIDDEN: true,
    /** All entity intelligence MUST go through sovereignOrchestrator */
    SINGLE_ENTRY_POINT_ENFORCED: true,
    /** Auto-detection enabled for all entity types */
    AUTO_DETECTION_ENABLED: true,
    /** Fallback entity kind on detection failure */
    FALLBACK_KIND: ENTITY_INTELLIGENCE_GOVERNANCE.FALLBACK_KIND,
} as const;
