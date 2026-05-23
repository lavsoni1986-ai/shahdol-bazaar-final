// 🏛️ BHARAT-OS: SOVEREIGN FLOATING ACTION GOVERNANCE
// Centralized coordination for ALL floating UI elements.
// Prevents collisions between AI Orb, WhatsApp FAB, sticky CTA, bottom nav.
// NO overlapping buttons. NO z-index escalation wars. NO clipping.
// Every floating element MUST register here.

import { SAFE_AREAS, LAYER_OFFSETS } from "./safe-area";
import { spacingValues } from "./tokens";

// ─── FLOATING ELEMENT REGISTRY ─────────────────────────
// Vertical stacking order (top to bottom of viewport).
// Each element specifies its position and collision zone.

export interface FloatingElement {
    /** Unique identifier */
    id: string;
    /** Priority (lower = higher in visual stack. z-index governance layer) */
    zLayer: number;
    /** Distance from viewport right edge (px) */
    right: number;
    /** Distance from viewport bottom edge (px) */
    bottom: number;
    /** Size in px (width/height for circular, height for rectangular) */
    size: number;
    /** Whether element is circular */
    isCircular: boolean;
    /** Whether visible on product detail (commerce) routes */
    visibleOnCommerce: boolean;
    /** Whether visible on non-commerce routes */
    visibleOnDefault: boolean;
}

// ─── CANONICAL FLOATING ACTION POSITIONS ───────────────
// These positions are PRE-CALCULATED to avoid collisions.
// AI Orb: centered above bottom nav (overlaps nav by design).
// WhatsApp FAB: right-aligned, above bottom nav.

export const FLOATING_ELEMENTS: Record<string, FloatingElement> = {
    /** AI Orb — sits above bottom nav, centered via nav AI button */
    aiOrb: {
        id: "ai-orb",
        zLayer: 60, // z-[60] — below header, above content
        right: 0,
        bottom: SAFE_AREAS.bottomNav + 20, // -top-5 relative
        size: SAFE_AREAS.orbSize,
        isCircular: true,
        visibleOnCommerce: true,
        visibleOnDefault: true,
    },
    /** WhatsApp FAB — right-aligned, above bottom nav + spacing */
    whatsappFAB: {
        id: "whatsapp-fab",
        zLayer: 110, // z-[110] — tooltip layer, below max
        right: spacingValues.base * 1, // 16px from right
        bottom: SAFE_AREAS.bottomNav + spacingValues.layout, // 80 + 64 = 144px from bottom
        size: 48, // h-12 w-12 approx
        isCircular: true,
        visibleOnCommerce: true,
        visibleOnDefault: true,
    },
};

// ─── COLLISION DETECTION ───────────────────────────────

export interface CollisionReport {
    elementA: string;
    elementB: string;
    overlapping: boolean;
    overlapX: number;
    overlapY: number;
    severity: "none" | "minor" | "critical";
}

/**
 * Detect collisions between two floating elements.
 * Returns overlap metrics and severity.
 */
export function detectCollision(a: FloatingElement, b: FloatingElement): CollisionReport {
    // Calculate absolute positions
    const aLeft = window.innerWidth - a.right - a.size;
    const aTop = window.innerHeight - a.bottom - a.size;
    const bLeft = window.innerWidth - b.right - b.size;
    const bTop = window.innerHeight - b.bottom - b.size;

    // Check overlap
    const overlapX = Math.max(0, Math.min(aLeft + a.size, bLeft + b.size) - Math.max(aLeft, bLeft));
    const overlapY = Math.max(0, Math.min(aTop + a.size, bTop + b.size) - Math.max(aTop, bTop));

    const overlapping = overlapX > 0 && overlapY > 0;
    const overlapArea = overlapX * overlapY;
    const minArea = Math.min(a.size * a.size, b.size * b.size);

    let severity: CollisionReport["severity"] = "none";
    if (overlapping) {
        severity = overlapArea > minArea * 0.3 ? "critical" : "minor";
    }

    return {
        elementA: a.id,
        elementB: b.id,
        overlapping,
        overlapX,
        overlapY,
        severity,
    };
}

// ─── POSITION COMPUTATION ──────────────────────────────

/**
 * Get the computed CSS position for a floating element.
 * Returns inline style object.
 */
export function getFloatingStyle(
    element: FloatingElement,
    viewportHeight: number,
    keyboardOpen: boolean
): React.CSSProperties {
    let bottom = element.bottom;

    // If keyboard is open, shift elements up
    if (keyboardOpen) {
        bottom += SAFE_AREAS.keyboardOffset;
    }

    return {
        position: "fixed",
        right: `${element.right}px`,
        bottom: `${bottom}px`,
        zIndex: element.zLayer,
        width: element.isCircular ? `${element.size}px` : "auto",
        height: element.isCircular ? `${element.size}px` : "auto",
        borderRadius: element.isCircular ? "50%" : undefined,
    };
}

/**
 * Get vertical safe zone for floating elements.
 * Returns the Y coordinate above which elements must not extend to avoid bottom nav overlap.
 */
export function getFloatingSafeZone(viewportHeight: number): number {
    return viewportHeight - SAFE_AREAS.bottomNav;
}

/**
 * Get the recommended bottom offset for a floating element
 * to guarantee no overlap with bottom nav.
 */
export function getSafeFloatingBottom(element: Pick<FloatingElement, "size" | "isCircular">): number {
    return SAFE_AREAS.bottomNav + spacingValues.base + element.size;
}

/**
 * Verify all floating elements have collision-free positions.
 * Returns array of collision reports.
 */
export function auditFloatingActions(viewportWidth: number, viewportHeight: number): CollisionReport[] {
    const elements = Object.values(FLOATING_ELEMENTS);
    const reports: CollisionReport[] = [];

    for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
            reports.push(detectCollision(elements[i], elements[j]));
        }
    }

    return reports;
}

// ─── VIEWPORT-AWARE OFFSETS ────────────────────────────

/**
 * Get bottom offset for WhatsApp FAB to sit above bottom nav.
 */
export function getWhatsappFABBottom(): number {
    return LAYER_OFFSETS.whatsappFAB.bottom;
}

/**
 * Get bottom offset for sticky CTA to sit above bottom nav.
 */
export function getStickyCTABottom(): number {
    return LAYER_OFFSETS.stickyCTA.bottom;
}
