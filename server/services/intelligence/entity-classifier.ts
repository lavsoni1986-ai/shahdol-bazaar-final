// 🏛️ BHARAT-OS: SERVER-SIDE ENTITY CLASSIFIER
// ================================================================
// Authoritative entity kind classification with district awareness.
//
// This is the SERVER-SIDE classifier — it has access to:
// - Full Prisma schema
// - Vendor metadata
// - DSSL intelligence signals
// - District-level context
//
// Client-side classifier (client/src/governance/entity-classifier.ts)
// is for instant rendering. Server classifier is authoritative.
// ================================================================

import { prisma } from "../../storage";
import { safeLogger } from "../../lib/logging/safe-logger";
import { LogComponent } from "../../lib/logging/structured-logger";

// ─── CANONICAL ENTITY KINDS ──────────────────────────────────────

export type ServerEntityKind =
    | "product"
    | "service"
    | "professional"
    | "healthcare"
    | "booking"
    | "marketplace"
    | "education"
    | "emergency";

// ─── CLASSIFICATION RESULT ───────────────────────────────────────

export interface ServerClassificationResult {
    kind: ServerEntityKind;
    confidence: number;
    signals: string[];
    source: "vendor" | "product" | "service";
    vendorBusinessType?: string;
    metadata?: {
        category?: string;
        tags?: string[];
        consultationMode?: string | null;
        emergencyAvailable?: boolean | null;
        deliveryActive?: boolean | null;
        hasSlots?: boolean;
    };
}

// ─── CLASSIFICATION PATTERNS ─────────────────────────────────────

interface ClassificationRule {
    patterns: RegExp[];
    kind: ServerEntityKind;
    priority: number;
}

const CATEGORY_RULES: ClassificationRule[] = [
    // Products
    { patterns: [/^electronics$/i, /^mobiles?$/i, /^clothing$/i, /^grocery$/i, /^kirana$/i, /^fashion$/i, /^accessories$/i, /^food$/i], kind: "product", priority: 10 },
    // Services
    { patterns: [/^repair$/i, /^plumb(er|ing)$/i, /^electric(al|ian)$/i, /^cleaning$/i, /^maintenance$/i, /^carpenter$/i, /^mechanic$/i, /^salon$/i, /^beaut(y|ician)/i, /^tailor$/i], kind: "service", priority: 20 },
    // Professionals
    { patterns: [/^doctor/i, /^physician/i, /^specialist/i, /^consultant/i, /^legal$/i, /^lawyer$/i, /^tutor$/i, /^coach(ing)?$/i, /^dietitian$/i, /^therapist$/i], kind: "professional", priority: 20 },
    // Healthcare
    { patterns: [/^hospital/i, /^clinic/i, /^diagnostic/i, /^pathology/i, /^pharmacy/i, /^dental/i, /^eye$/i, /^optical$/i], kind: "healthcare", priority: 20 },
    // Booking
    { patterns: [/^hotel/i, /^resort/i, /^guest.?house/i, /^spa$/i, /^restaurant/i, /^dining$/i], kind: "booking", priority: 15 },
    // Education
    { patterns: [/^school/i, /^college/i, /^university/i, /^academy/i, /^institute/i, /^tuition/i, /^education$/i], kind: "education", priority: 20 },
    // Emergency
    { patterns: [/^ambulance/i, /^emergency/i, /^fire.?brigade/i, /^police$/i, /^disaster/i, /^rescue/i], kind: "emergency", priority: 30 },
];

const BUSINESS_TYPE_KIND_MAP: Record<string, ServerEntityKind> = {
    PRODUCT: "product",
    SERVICE: "service",
    PROFESSIONAL: "professional",
    HEALTHCARE: "healthcare",
    HOSPITAL: "healthcare",
    CLINIC: "healthcare",
    DOCTOR: "professional",
    SCHOOL: "education",
    RETAIL: "product",
    WHOLESALE: "product",
    EMERGENCY: "emergency",
};

// ─── CLASSIFIER ──────────────────────────────────────────────────

const COMPONENT = LogComponent.SYSTEM;
const TAG = "[ENTITY_CLASSIFIER]";

/**
 * Classify a VENDOR by its ID.
 * Full Prisma-based classification with metadata analysis.
 */
export async function classifyVendor(vendorId: number): Promise<ServerClassificationResult> {
    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
            metadata: true,
            products: {
                take: 1,
                select: { id: true, category: true, categoryName: true },
            },
        },
    });

    if (!vendor) {
        return {
            kind: "marketplace",
            confidence: 0.5,
            signals: ["vendor_not_found"],
            source: "vendor",
        };
    }

    const signals: string[] = [];
    const scores: Map<ServerEntityKind, number> = new Map();
    const kinds: ServerEntityKind[] = ["product", "service", "professional", "healthcare", "booking", "education", "emergency", "marketplace"];

    for (const k of kinds) scores.set(k, 0);

    // 1. Business type (strongest signal)
    if (vendor.businessType) {
        const mappedKind = BUSINESS_TYPE_KIND_MAP[vendor.businessType];
        if (mappedKind) {
            scores.set(mappedKind, (scores.get(mappedKind) || 0) + 100);
            signals.push(`businessType:${vendor.businessType}`);
        }
    }

    // 2. Category
    const category = vendor.category || vendor.categorySlug || "";
    if (category) {
        for (const rule of CATEGORY_RULES) {
            for (const pattern of rule.patterns) {
                if (pattern.test(category)) {
                    scores.set(rule.kind, (scores.get(rule.kind) || 0) + rule.priority * 5);
                    signals.push(`category:${category} matches ${rule.kind}`);
                }
            }
        }
    }

    // 3. Metadata signals
    if (vendor.metadata) {
        const meta = vendor.metadata;

        if (meta.emergencyAvailable) {
            scores.set("emergency", (scores.get("emergency") || 0) + 50);
            signals.push("metadata:emergencyAvailable");
        }

        if (meta.consultationMode) {
            scores.set("professional", (scores.get("professional") || 0) + 40);
            signals.push(`metadata:consultationMode=${meta.consultationMode}`);
        }

        if (meta.tags) {
            const tags = Array.isArray(meta.tags) ? meta.tags : [];
            for (const tag of tags) {
                const tagStr = String(tag).toLowerCase();
                if (/hospital|clinic|medical/.test(tagStr)) {
                    scores.set("healthcare", (scores.get("healthcare") || 0) + 30);
                    signals.push(`tag:${tagStr}`);
                }
                if (/doctor|specialist/.test(tagStr)) {
                    scores.set("professional", (scores.get("professional") || 0) + 30);
                    signals.push(`tag:${tagStr}`);
                }
                if (/emergency|ambulance/.test(tagStr)) {
                    scores.set("emergency", (scores.get("emergency") || 0) + 40);
                    signals.push(`tag:${tagStr}`);
                }
            }
        }

        if (meta.specializations) {
            const specializations = Array.isArray(meta.specializations) ? meta.specializations : [];
            for (const spec of specializations) {
                const specStr = String(spec).toLowerCase();
                for (const rule of CATEGORY_RULES) {
                    for (const pattern of rule.patterns) {
                        if (pattern.test(specStr)) {
                            scores.set(rule.kind, (scores.get(rule.kind) || 0) + 25);
                            signals.push(`specialization:${specStr} matches ${rule.kind}`);
                        }
                    }
                }
            }
        }
    }

    // 4. Vendor flags
    if (vendor.isHospital) {
        scores.set("healthcare", (scores.get("healthcare") || 0) + 80);
        signals.push("vendor:isHospital");
    }

    if (vendor.isProfessional) {
        scores.set("professional", (scores.get("professional") || 0) + 80);
        signals.push("vendor:isProfessional");
    }

    // 5. Product existence (weak product signal for the vendor)
    if (vendor.products && vendor.products.length > 0) {
        scores.set("product", (scores.get("product") || 0) + 10);
        signals.push("vendor:hasProducts");
    }

    // Determine winner
    const sorted = [...scores.entries()].sort(([, a], [, b]) => b - a);
    const topKind = sorted[0][0];
    const topScore = sorted[0][1];
    const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0) || 1;

    safeLogger.info(COMPONENT, `${TAG} Vendor ${vendorId} classified as ${topKind} (confidence=${(topScore / totalScore).toFixed(2)})`);

    return {
        kind: topKind,
        confidence: Math.min(1, topScore / totalScore),
        signals: signals.slice(0, 10),
        source: "vendor",
        vendorBusinessType: vendor.businessType || undefined,
        metadata: {
            category: vendor.category || undefined,
            tags: vendor.safetyBadges || undefined,
            consultationMode: vendor.metadata?.consultationMode || null,
            emergencyAvailable: vendor.metadata?.emergencyAvailable ?? null,
            deliveryActive: vendor.metadata?.deliveryActive ?? null,
            hasSlots: !!(vendor.metadata?.businessHours),
        },
    };
}

/**
 * Classify a PRODUCT by its ID.
 * Uses product category + vendor business type.
 */
export async function classifyProduct(productId: number): Promise<ServerClassificationResult> {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            vendor: {
                select: { businessType: true, category: true, isHospital: true, isProfessional: true, metadata: true },
            },
        },
    });

    if (!product) {
        return { kind: "marketplace", confidence: 0.5, signals: ["product_not_found"], source: "product" };
    }

    // Products are ALWAYS "product" kind unless vendor context overrides
    if (product.vendor?.isHospital || product.vendor?.isProfessional) {
        // Vendor context can override — e.g., hospital selling medicine
        // But the product itself is still a product
        return {
            kind: "product",
            confidence: 0.9,
            signals: ["entity:product", `vendorBusinessType:${product.vendor.businessType}`],
            source: "product",
            vendorBusinessType: product.vendor.businessType || undefined,
        };
    }

    return {
        kind: "product",
        confidence: 0.95,
        signals: ["entity:product"],
        source: "product",
        vendorBusinessType: product.vendor?.businessType || undefined,
        metadata: {
            category: product.categoryName || product.category?.toString() || undefined,
        },
    };
}

/**
 * Classify any entity by type and ID.
 */
export async function classifyEntity(
    type: "vendor" | "product",
    id: number,
): Promise<ServerClassificationResult> {
    if (type === "vendor") return classifyVendor(id);
    return classifyProduct(id);
}

export const SERVER_CLASSIFIER_VERSION = "1.0.0";
export const SERVER_CLASSIFIER_CREATED = "2026-05-22";
