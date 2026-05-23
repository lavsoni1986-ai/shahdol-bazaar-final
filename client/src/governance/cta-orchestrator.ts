// 🏛️ BHARAT-OS: CTA ORCHESTRATION LAYER
// ================================================================
// Resolves CTAs dynamically based on EntityKind policy.
//
// DO NOT hardcode:
//   <AddToCart /> — Use resolveEntityActions(entityKind)
//   <BookAppointment /> — Use resolveEntityActions(entityKind)
//
// Every CTA is governed by the entity policy engine.
// ================================================================

import { getEntityPolicy, type EntityPolicy } from "./entity-policies";
import type { EntityKind } from "./entity-intelligence";

// ─── RESOLVED ACTION ─────────────────────────────────────────────

export interface ResolvedAction {
    /** Unique action identifier */
    id: string;
    /** Display label (e.g., "Add to Cart") */
    label: string;
    /** Icon name from lucide-react */
    icon?: string;
    /** Priority order (lower = higher priority) */
    priority: number;
    /** Action type for handler routing */
    type: ActionType;
    /** Whether this is a primary CTA */
    primary: boolean;
    /** Whether this is an emergency action */
    emergency: boolean;
    /** CSS variant for styling */
    variant: "default" | "primary" | "outline" | "ghost" | "destructive" | "emergency";
    /** Additional metadata */
    meta?: Record<string, any>;
}

export type ActionType =
    | "add_to_cart"
    | "buy_now"
    | "book_appointment"
    | "book_service"
    | "consult_now"
    | "call_now"
    | "whatsapp"
    | "directions"
    | "share"
    | "reserve_now"
    | "enquire_now"
    | "visit_store"
    | "contact"
    | "emergency_call"
    | "get_directions";

// ─── ACTION RESOLUTION ───────────────────────────────────────────

/**
 * Resolve all actions for a given entity kind based on its policy.
 * Returns ordered array of actions (primary first, then emergency, then rest).
 */
export function resolveEntityActions(kind: EntityKind): ResolvedAction[] {
    const policy = getEntityPolicy(kind);
    const actions: ResolvedAction[] = [];

    // Primary action
    if (policy.primaryCTALabel) {
        actions.push({
            id: `primary_${kind}`,
            label: policy.primaryCTALabel,
            priority: 10,
            type: resolveActionType(policy, "primary"),
            primary: true,
            emergency: false,
            variant: "primary",
        });
    }

    // Secondary action
    if (policy.secondaryCTALabel) {
        actions.push({
            id: `secondary_${kind}`,
            label: policy.secondaryCTALabel,
            priority: 20,
            type: resolveActionType(policy, "secondary"),
            primary: false,
            emergency: false,
            variant: "outline",
        });
    }

    // WhatsApp
    if (policy.whatsappEnabled) {
        actions.push({
            id: `whatsapp_${kind}`,
            label: "WhatsApp",
            icon: "MessageCircle",
            priority: 30,
            type: "whatsapp",
            primary: false,
            emergency: false,
            variant: "default",
        });
    }

    // Call
    if (policy.callEnabled) {
        actions.push({
            id: `call_${kind}`,
            label: "Call",
            icon: "Phone",
            priority: 40,
            type: "call_now",
            primary: false,
            emergency: false,
            variant: "default",
        });
    }

    // Directions
    if (policy.directionsEnabled) {
        actions.push({
            id: `directions_${kind}`,
            label: "Directions",
            icon: "MapPin",
            priority: 50,
            type: "get_directions",
            primary: false,
            emergency: false,
            variant: "ghost",
        });
    }

    // Share
    if (policy.shareEnabled) {
        actions.push({
            id: `share_${kind}`,
            label: "Share",
            icon: "Share2",
            priority: 60,
            type: "share",
            primary: false,
            emergency: false,
            variant: "ghost",
        });
    }

    // Emergency (always last, always highest visibility)
    if (policy.emergencyEnabled && policy.emergencyCTALabel) {
        actions.push({
            id: `emergency_${kind}`,
            label: policy.emergencyCTALabel,
            priority: 100,
            type: "emergency_call",
            primary: false,
            emergency: true,
            variant: "emergency",
            meta: { urgent: true },
        });
    }

    // Sort by priority
    return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * Get primary actions only (for card display).
 */
export function getPrimaryActions(kind: EntityKind): ResolvedAction[] {
    return resolveEntityActions(kind).filter((a) => a.primary || a.emergency);
}

/**
 * Get secondary actions (for overflow/detail menus).
 */
export function getSecondaryActions(kind: EntityKind): ResolvedAction[] {
    return resolveEntityActions(kind).filter((a) => !a.primary && !a.emergency);
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────

function resolveActionType(
    policy: EntityPolicy,
    position: "primary" | "secondary",
): ActionType {
    const label = position === "primary" ? policy.primaryCTALabel : policy.secondaryCTALabel;

    // Map label to action type
    if (label.includes("Cart") || label.includes("Buy")) return "add_to_cart";
    if (label.includes("Appointment")) return "book_appointment";
    if (label.includes("Service")) return "book_service";
    if (label.includes("Consult")) return "consult_now";
    if (label.includes("Call") || label.includes("Emergency")) return "emergency_call";
    if (label.includes("Reserve")) return "reserve_now";
    if (label.includes("Enquire")) return "enquire_now";
    if (label.includes("Visit")) return "visit_store";
    if (label.includes("Contact")) return "contact";
    if (label.includes("Directions")) return "get_directions";
    if (label.includes("Availability")) return "book_service";

    return "contact";
}

// ─── CTA HANDLER MAP ─────────────────────────────────────────────

export interface ActionHandler {
    action: ActionType;
    handler: string; // Function name to invoke
    requires: string[]; // Required data fields
    payload: Record<string, string>; // Field mapping
}

/**
 * Standard handler configuration for each action type.
 * UI components use this to wire up action buttons.
 */
export const ACTION_HANDLERS: Record<ActionType, ActionHandler> = {
    add_to_cart: {
        action: "add_to_cart",
        handler: "handleAddToCart",
        requires: ["id", "name", "price"],
        payload: { id: "id", name: "name", price: "price", imageUrl: "imageUrl", vendorId: "vendorId" },
    },
    buy_now: {
        action: "buy_now",
        handler: "handleBuyNow",
        requires: ["id", "name", "price"],
        payload: { id: "id", name: "name", price: "price" },
    },
    book_appointment: {
        action: "book_appointment",
        handler: "handleBookAppointment",
        requires: ["id", "name"],
        payload: { entityId: "id", entityName: "name", consultationMode: "consultationMode" },
    },
    book_service: {
        action: "book_service",
        handler: "handleBookService",
        requires: ["id", "name"],
        payload: { entityId: "id", entityName: "name" },
    },
    consult_now: {
        action: "consult_now",
        handler: "handleConsultNow",
        requires: ["id", "phone"],
        payload: { entityId: "id", phone: "phone", name: "name" },
    },
    call_now: {
        action: "call_now",
        handler: "handleCall",
        requires: ["phone"],
        payload: { phone: "phone" },
    },
    whatsapp: {
        action: "whatsapp",
        handler: "handleWhatsApp",
        requires: ["phone"],
        payload: { phone: "phone", name: "name" },
    },
    directions: {
        action: "directions",
        handler: "handleDirections",
        requires: ["address"],
        payload: { address: "address", name: "name" },
    },
    share: {
        action: "share",
        handler: "handleShare",
        requires: ["name", "route"],
        payload: { title: "name", url: "route" },
    },
    reserve_now: {
        action: "reserve_now",
        handler: "handleReserveNow",
        requires: ["id", "name"],
        payload: { entityId: "id", entityName: "name" },
    },
    enquire_now: {
        action: "enquire_now",
        handler: "handleEnquireNow",
        requires: ["id", "name"],
        payload: { entityId: "id", entityName: "name" },
    },
    visit_store: {
        action: "visit_store",
        handler: "handleVisitStore",
        requires: ["route"],
        payload: { route: "route" },
    },
    contact: {
        action: "contact",
        handler: "handleContact",
        requires: ["phone"],
        payload: { phone: "phone" },
    },
    emergency_call: {
        action: "emergency_call",
        handler: "handleEmergencyCall",
        requires: ["emergencyPhone", "phone"],
        payload: { phone: "emergencyPhone", fallbackPhone: "phone" },
    },
    get_directions: {
        action: "get_directions",
        handler: "handleDirections",
        requires: ["address"],
        payload: { address: "address", name: "name" },
    },
};

// ─── VERSION ─────────────────────────────────────────────────────

export const CTA_ORCHESTRATOR_VERSION = "1.0.0";
export const CTA_ORCHESTRATOR_CREATED = "2026-05-22";

export const CTA_ORCHESTRATOR_GOVERNANCE = {
    /** No hardcoded CTA components — always go through orchestrator */
    COMPONENT_CTA_FORBIDDEN: true,
    /** CTA labels are policy-driven, not component-driven */
    LABELS_ARE_POLICY_DRIVEN: true,
    /** Emergency actions always highest priority */
    EMERGENCY_ALWAYS_ON_TOP: true,
} as const;
