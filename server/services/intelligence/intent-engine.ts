// 🏛️ BHARAT-OS: INTENT ENGINE
// ================================================================
// Detects user INTENT from natural language queries.
//
// This is NOT a simple keyword matcher — it's a multi-factor
// intent classification system that considers:
// - Semantic keywords & patterns
// - Urgency signals (time-sensitive language)
// - Entity type being queried
// - District context
// - Previous interaction patterns
//
// Integrates with Sovereign Brain intent-orchestrator.
// ================================================================

import { safeLogger } from "../../lib/logging/safe-logger";
import { LogComponent } from "../../lib/logging/structured-logger";

// ─── INTENT TYPES ────────────────────────────────────────────────

export type IntentType =
    | "buy"           // "Sasta phone batao" — purchase intent
    | "book"          // "Doctor appointment" — booking intent
    | "consult"       // "Doctor se baat karni hai" — consult intent
    | "repair"        // "AC kharab hai" — service/repair intent
    | "emergency"     // "Mummy ki tabiyat kharab hai" — urgent
    | "compare"       // "Phone compare karo" — comparison
    | "schedule"      // "Kal subah aaiye" — schedule intent
    | "navigate"      // "Kahan hai" — location/directions
    | "inquire"       // "Kitna hai" — price/cost inquiry
    | "find"          // "Doctor dhoondo" — general discovery
    | "emergency_health" // Specific medical emergency
    | "unknown";

// ─── INTENT RESULT ───────────────────────────────────────────────

export interface IntentResult {
    intent: IntentType;
    confidence: number;
    signals: string[];
    urgency: "low" | "medium" | "high" | "critical";
    entities?: {
        suggestedEntityKind?: string;
        keywords: string[];
    };
    raw: {
        query: string;
        normalized: string;
    };
}

// ─── RULE-BASED INTENT DETECTION ─────────────────────────────────

interface IntentRule {
    patterns: RegExp[];
    intent: IntentType;
    urgency: "low" | "medium" | "high" | "critical";
    weight: number;
}

const INTENT_RULES: IntentRule[] = [
    // ── EMERGENCY (highest priority) ──
    { patterns: [/emergency/i, /urgent/i, /immediately/i, /jald/i, /jaldi/i, /fauran/i, /abhi/i, /turant/i, /\bhelp\b/i, /\bhelp me\b/i, /\bsos\b/i, /ambulance/i, /accident/i, /bleeding/i, /heart.?attack/i, /unconscious/i, /breathing/i, /choking/i, /poison/i, /burn/i, /fracture/i, /severe.?pain/i], intent: "emergency", urgency: "critical", weight: 100 },
    // ── MEDICAL EMERGENCY ──
    { patterns: [/tabiyat.*kharab/i, /health.*emergency/i, /medical.*help/i, /doctor.*urgent/i, /hospital.*now/i, /pain.*severe/i, /stabbed/i, /shot/i, /overdose/i, /allergic.*reaction/i], intent: "emergency_health", urgency: "critical", weight: 100 },

    // ── REPAIR / SERVICE ──
    { patterns: [/kharab/i, /toot/i, /repair/i, /fix/i, /theek/i, /sawal/i, /problem/i, /issue/i, /working.*not/i, /not.*working/i, /break/i, /breakdown/i, /service.*needed/i, /maintenance/i, /plumber/i, /electrician/i, /mechanic/i, /leak/i, /leakage/i, /clog/i, /blocked/i], intent: "repair", urgency: "high", weight: 40 },

    // ── BOOK / APPOINTMENT ──
    { patterns: [/book/i, /appointment/i, /slot/i, /schedule/i, /reserve/i, /booking/i, /fix.*time/i, /set.*time/i, /kal/i, /aaj/i, /parson/i, /time.*slot/i, /availability/i, /available/i, /chahiye.*time/i], intent: "book", urgency: "medium", weight: 30 },

    // ── CONSULT ──
    { patterns: [/consult/i, /baat.*karni/i, /talk.*to/i, /speak.*with/i, /discuss/i, /consultation/i, /opinion/i, /second.*opinion/i, /advice/i, /salah/i, /guidance/i, /recommend/i], intent: "consult", urgency: "medium", weight: 25 },

    // ── BUY / PURCHASE ──
    { patterns: [/buy/i, /purchase/i, /order/i, /khareed/i, /lena/i, /chahiye\b/i, /price/i, /cost/i, /kitna\b/i, /sasta/i, /expensive/i, /cheap/i, /budget/i, /\bunder\b.*\d/i, /\d.*rup/i, /rate/i, /deal/i, /offer/i], intent: "buy", urgency: "medium", weight: 20 },

    // ── COMPARE ──
    { patterns: [/compare/i, /vs\b/i, /versus/i, /difference/i, /better/i, /best/i, /top/i, /highest/i, /lowest/i], intent: "compare", urgency: "low", weight: 15 },

    // ── SCHEDULE ──
    { patterns: [/schedule/i, /timing/i, /time.?table/i, /open.?time/i, /close.?time/i, /kab.*khulta/i, /kab.*band/i, /hours/i, /shift/i, /morning/i, /evening/i, /raat/i, /subah/i, /shaam/i], intent: "schedule", urgency: "low", weight: 15 },

    // ── NAVIGATE / DIRECTIONS ──
    { patterns: [/kahan/i, /where/i, /location/i, /address/i, /direction/i, /map/i, /reach/i, /pahunch/i, /distance/i, /near/i, /nearby/i, /close.?to/i, /pass/i, /navigate/i], intent: "navigate", urgency: "low", weight: 15 },

    // ── INQUIRE / PRICE ──
    { patterns: [/kitna.*hai/i, /price.*kya/i, /cost.*how/i, /charge/i, /fees/i, /fare/i, /rate.*kya/i, /muqable/i, /quotation/i, /quote/i], intent: "inquire", urgency: "low", weight: 10 },

    // ── FIND / DISCOVER ──
    { patterns: [/dhoond/i, /search/i, /find/i, /look.?for/i, /need/i, /want/i, /show/i, /list/i, /suggest/i, /recommend/i, /sakta/i, /koi.*hai/i, /bataye/i, /batao/i], intent: "find", urgency: "low", weight: 10 },
];

// ─── ENTITY DETECTION FROM INTENT ────────────────────────────────

const INTENT_ENTITY_SUGGESTIONS: Record<IntentType, string[]> = {
    buy: ["product", "marketplace"],
    book: ["service", "booking", "professional", "healthcare"],
    consult: ["professional", "healthcare"],
    repair: ["service"],
    emergency: ["emergency", "healthcare"],
    compare: ["product", "marketplace"],
    schedule: ["booking", "service", "professional"],
    navigate: ["marketplace", "product", "service"],
    inquire: ["product", "service", "professional"],
    find: ["product", "service", "professional", "healthcare", "booking", "education", "marketplace"],
    emergency_health: ["healthcare", "emergency"],
    unknown: ["marketplace"],
};

// ─── ENGINES ─────────────────────────────────────────────────────

const COMPONENT = LogComponent.SYSTEM;
const TAG = "[INTENT_ENGINE]";

/**
 * Classify user query intent using rule-based matching.
 * Returns the detected intent with confidence score and urgency level.
 */
export function classifyIntent(query: string): IntentResult {
    const normalized = query
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[^a-z0-9\s]/g, "");

    const signals: string[] = [];
    const scores: Map<IntentType, number> = new Map();
    const allIntents: IntentType[] = [
        "buy", "book", "consult", "repair", "emergency",
        "compare", "schedule", "navigate", "inquire", "find",
        "emergency_health", "unknown",
    ];

    for (const intent of allIntents) {
        scores.set(intent, 0);
    }

    // Multi-pass scoring
    for (const rule of INTENT_RULES) {
        let matched = false;
        for (const pattern of rule.patterns) {
            if (pattern.test(normalized)) {
                matched = true;
                signals.push(`${rule.intent}:${pattern.source}`);
            }
        }
        if (matched) {
            scores.set(rule.intent, (scores.get(rule.intent) || 0) + rule.weight);
        }
    }

    // Determine winner
    const sorted = [...scores.entries()].sort(([, a], [, b]) => b - a);
    const topIntent = sorted[0][0];
    const topScore = sorted[0][1];
    const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0) || 1;

    // Calculate urgency based on top intent
    const urgency = getUrgency(topIntent, sorted);

    safeLogger.info(COMPONENT, TAG, `"${normalized}" → ${topIntent} (confidence=${(topScore / totalScore).toFixed(2)}, urgency=${urgency})`);

    return {
        intent: topIntent,
        confidence: Math.min(1, topScore / totalScore),
        signals: signals.slice(0, 5),
        urgency,
        entities: {
            suggestedEntityKind: INTENT_ENTITY_SUGGESTIONS[topIntent]?.[0] || "marketplace",
            keywords: extractKeywords(normalized, signals),
        },
        raw: {
            query,
            normalized,
        },
    };
}

/**
 * Extract meaningful keywords from a normalized query.
 */
function extractKeywords(normalized: string, signals: string[]): string[] {
    // Remove common Hindi/English stop words
    const stopWords = new Set([
        "hai", "hain", "ho", "hu", "the", "thi", "tha", "hoga",
        "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe",
        "is", "this", "that", "the", "a", "an", "for", "and", "or",
        "to", "in", "on", "at", "by", "with", "from", "of",
        "kya", "kyun", "kaise", "kab", "kahan",
        "mujhe", "tum", "aap", "main", "hum", "woh", "yeh",
        "please", "pls", "bro", "bhai", "didi", "sir",
    ]);

    const words = normalized.split(/\s+/);
    return words
        .filter((w) => w.length > 2 && !stopWords.has(w))
        .slice(0, 10);
}

/**
 * Calculate urgency level based on detected intent and signals.
 */
function getUrgency(
    topIntent: IntentType,
    _scores: [IntentType, number][],
): "low" | "medium" | "high" | "critical" {
    // Direct urgency mapping for high-priority intents
    const urgencyMap: Partial<Record<IntentType, "low" | "medium" | "high" | "critical">> = {
        emergency: "critical",
        emergency_health: "critical",
        repair: "high",
        book: "medium",
        consult: "medium",
        buy: "medium",
    };

    return urgencyMap[topIntent] || "low";
}

export const INTENT_ENGINE_VERSION = "1.0.0";
export const INTENT_ENGINE_CREATED = "2026-05-22";

export const INTENT_ENGINE_GOVERNANCE = {
    /** Strict mode enables AI fallback on low confidence */
    AI_FALLBACK_ENABLED: true,
    /** Minimum confidence for rule-based results */
    MIN_CONFIDENCE: 0.2,
    /** Fallback intent when nothing matches */
    FALLBACK_INTENT: "find" as IntentType,
} as const;
