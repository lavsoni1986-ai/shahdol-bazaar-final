// 🏛️ BHARAT-OS: ENTITY CLASSIFIER (CLIENT-SIDE)
// ================================================================
// Infer entity kind from raw API response or partial data.
//
// Used when server-side classification hasn't run yet,
// or for instant client-side rendering of search results.
//
// For authoritative classification, use the server-side classifier.
// ================================================================

import type {
    EntityKind,
    EntityDetectionSignals,
    EntityClassificationResult,
} from "./entity-intelligence";
import {
    CATEGORY_KIND_MAPPINGS,
    BUSINESS_TYPE_KIND_MAP,
    KEYWORD_KIND_PATTERNS,
    ENTITY_INTELLIGENCE_GOVERNANCE,
} from "./entity-intelligence";

// ─── SIGNAL EXTRACTION ───────────────────────────────────────────

/**
 * Extract classification signals from a raw entity object.
 * Works with vendor, product, service, hospital — any shape.
 */
export function extractClassificationSignals(
    entity: any,
    vendorBusinessType?: string,
): EntityDetectionSignals {
    const signals: EntityDetectionSignals = {
        category: [],
        vendorBusinessType,
        tags: [],
        keywords: [],
        dsslHints: [],
        hasBookingSlots: false,
        consultationMode: undefined,
        hasEmergencyContact: false,
        hasPrice: false,
    };

    if (!entity) return signals;

    // Category extraction
    const category =
        entity.category ??
        entity.businessType ??
        entity.serviceType ??
        entity.type ??
        entity.profession ??
        entity.specialization ??
        "";

    if (category) {
        if (typeof category === "string") {
            signals.category = category.split(/[,/]/).map((c: string) => c.trim()).filter(Boolean);
        } else if (typeof category === "object" && category !== null) {
            signals.category = [category.name ?? category.title ?? String(category)].filter(Boolean);
        }
    }

    // Tags extraction
    const tags = entity.tags ?? entity.safetyBadges ?? entity.specialties ?? [];
    signals.tags = Array.isArray(tags) ? tags.map(String) : typeof tags === "string" ? [tags] : [];

    // DSSL hints
    if (entity.dsslScore !== undefined && entity.dsslScore !== null) {
        signals.dsslHints?.push(`dssl:${entity.dsslScore}`);
    }
    if (entity.isVerified) {
        signals.dsslHints?.push("verified");
    }
    if (entity.rating && entity.rating >= 4) {
        signals.dsslHints?.push("trusted");
    }

    // Business type override
    signals.vendorBusinessType = vendorBusinessType ?? entity.businessType ?? entity.vendor?.businessType;

    // Booking/consultation signals
    signals.hasBookingSlots = !!(entity.hasSlots ?? entity.bookingEnabled ?? entity.timeSlots);
    signals.consultationMode = entity.consultationMode ?? entity.vendor?.metadata?.consultationMode;
    signals.hasEmergencyContact = !!(entity.emergencyPhone ?? entity.emergencyContact ?? entity.helpline);

    // Keyword extraction from name/description
    const name = String(entity.name ?? entity.title ?? "");
    const description = String(entity.description ?? entity.about ?? entity.summary ?? "");
    const combined = `${name} ${description}`.toLowerCase();
    signals.keywords = combined
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 20);

    // Price detection
    signals.hasPrice = entity.price !== undefined && entity.price !== null && Number(entity.price) > 0;

    return signals;
}

// ─── CLASSIFICATION ──────────────────────────────────────────────

/**
 * Classify an entity's kind based on extracted signals.
 * Uses multi-factor scoring: category match > business type > keywords > metadata.
 *
 * Returns a result with confidence score and all alternatives considered.
 */
export function classifyEntityKind(signals: EntityDetectionSignals): EntityClassificationResult {
    const scores: Map<EntityKind, { score: number; signals: string[] }> = new Map();
    const allKinds: EntityKind[] = [
        "product", "service", "professional", "healthcare",
        "booking", "education", "emergency", "marketplace",
    ];

    // Initialize scores
    for (const kind of allKinds) {
        scores.set(kind, { score: 0, signals: [] });
    }

    // ── 1. Category-based classification (highest weight) ──
    for (const cat of signals.category) {
        for (const mapping of CATEGORY_KIND_MAPPINGS) {
            for (const pattern of mapping.patterns) {
                if (pattern.test(cat)) {
                    const current = scores.get(mapping.kind)!;
                    current.score += mapping.priority * 5; // Category match is high priority
                    current.signals.push(`category:${cat} matches ${pattern}`);
                }
            }
        }
    }

    // ── 2. Business type override ──
    if (signals.vendorBusinessType) {
        const mappedKind = BUSINESS_TYPE_KIND_MAP[signals.vendorBusinessType.toUpperCase()];
        if (mappedKind) {
            const current = scores.get(mappedKind)!;
            current.score += 100; // Business type is strong signal
            current.signals.push(`businessType:${signals.vendorBusinessType}`);
        }
    }

    // ── 3. Keyword-based classification ──
    for (const keyword of signals.keywords) {
        for (const group of KEYWORD_KIND_PATTERNS) {
            for (const pattern of group.patterns) {
                if (pattern.test(keyword)) {
                    const current = scores.get(group.kind)!;
                    current.score += group.priority;
                    current.signals.push(`keyword:${keyword} matches ${pattern}`);
                }
            }
        }
    }

    // ── 4. Booking/consultation signals ──
    if (signals.hasBookingSlots) {
        const booking = scores.get("booking")!;
        booking.score += 30;
        booking.signals.push("hasBookingSlots");
    }
    if (signals.consultationMode) {
        const prof = scores.get("professional")!;
        prof.score += 40;
        prof.signals.push(`consultationMode:${signals.consultationMode}`);
    }
    if (signals.hasEmergencyContact) {
        const emergency = scores.get("emergency")!;
        emergency.score += 50;
        emergency.signals.push("hasEmergencyContact");
    }

    // ── 5. Price signal (weak product indicator) ──
    if (signals.hasPrice) {
        const prod = scores.get("product")!;
        prod.score += 15;
        prod.signals.push("hasPrice");
    }

    // ── 6. Tag-based signals ──
    for (const tag of signals.tags) {
        const tagLower = tag.toLowerCase();
        if (/emergency|ambulance|24.?7|helpline/.test(tagLower)) {
            const em = scores.get("emergency")!;
            em.score += 40;
            em.signals.push(`tag:${tag}`);
        }
        if (/booking|reservation|slot/.test(tagLower)) {
            const bk = scores.get("booking")!;
            bk.score += 20;
            bk.signals.push(`tag:${tag}`);
        }
        if (/consultation|appointment|opd/.test(tagLower)) {
            const pf = scores.get("professional")!;
            pf.score += 25;
            pf.signals.push(`tag:${tag}`);
        }
    }

    // ── DSSL hints ──
    if (signals.dsslHints) {
        for (const hint of signals.dsslHints) {
            // Low-weight signal — presence of verification boosts trust but not kind
            // Only used as tiebreaker
        }
    }

    // ── Determine winner ──
    const sorted = [...scores.entries()]
        .sort(([, a], [, b]) => b.score - a.score);

    const topKind = sorted[0][0];
    const topScore = sorted[0][1].score;
    const secondScore = sorted[1][1].score;

    // Normalize confidence: 0-1 based on score differential
    const totalScore = sorted.reduce((sum, [, s]) => sum + s.score, 0) || 1;
    const confidence = Math.min(1, topScore / totalScore);

    // Build alternatives
    const alternatives = sorted
        .filter(([kind]) => kind !== topKind)
        .slice(0, 3)
        .map(([kind, s]) => ({
            kind,
            confidence: totalScore > 0 ? s.score / totalScore : 0,
        }));

    return {
        kind: topKind,
        confidence,
        signals: sorted[0][1].signals.slice(0, 8), // Top signals
        alternatives,
    };
}

// ─── CONVENIENCE WRAPPER ─────────────────────────────────────────

/**
 * One-shot classification: extract signals + classify.
 * Use this for quick client-side entity kind detection.
 */
export function detectEntityKind(
    entity: any,
    vendorBusinessType?: string,
): EntityKind {
    if (!entity) return ENTITY_INTELLIGENCE_GOVERNANCE.FALLBACK_KIND;

    // If entity already has a kind field, trust it
    if (entity.entityKind || entity.kind) {
        const existing = (entity.entityKind ?? entity.kind) as EntityKind;
        if (isValidEntityKind(existing)) return existing;
    }

    const signals = extractClassificationSignals(entity, vendorBusinessType);
    const result = classifyEntityKind(signals);

    return result.confidence >= ENTITY_INTELLIGENCE_GOVERNANCE.MIN_CONFIDENCE_THRESHOLD
        ? result.kind
        : ENTITY_INTELLIGENCE_GOVERNANCE.FALLBACK_KIND;
}

/**
 * Validate that a string is a valid EntityKind.
 */
export function isValidEntityKind(value: string): value is EntityKind {
    return ["product", "service", "professional", "healthcare", "booking", "marketplace", "education", "emergency"].includes(value);
}

// ─── VERSION ─────────────────────────────────────────────────────

export const ENTITY_CLASSIFIER_VERSION = "1.0.0";
export const ENTITY_CLASSIFIER_CREATED = "2026-05-22";
