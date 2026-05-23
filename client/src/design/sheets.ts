// 🏛️ BHARAT-OS: SOVEREIGN BOTTOM SHEET GOVERNANCE
// Unified bottom-sheet behavior for AI assistant, merchant tools, booking, filters, governance panels.
// Prevents modal chaos, keyboard overlap, drag inconsistency.
// NO scattered sheet implementations. NO arbitrary snap heights.

import { SAFE_AREAS } from "./safe-area";
import { spacing } from "./tokens";

// ─── SNAP POINT CONSTANTS ──────────────────────────────
export const SHEET_SNAPS = {
    /** Minimal peek height — just shows handle + title */
    peek: 80,
    /** Compact — shows a few items, common for filter sheets */
    compact: 200,
    /** Half screen — balanced content view */
    half: "50%",
    /** Three quarters — almost full screen */
    threeQuarters: "75%",
    /** Full screen — keyboard-safe max */
    full: `calc(100% - ${SAFE_AREAS.header}px)`,
} as const;

export type SheetSnap = keyof typeof SHEET_SNAPS;

// ─── SHEET CONFIGURATION ───────────────────────────────
export interface SheetConfig {
    /** Unique sheet identifier */
    id: string;
    /** Default snap point */
    defaultSnap: SheetSnap;
    /** Available snap points (ordered top to bottom) */
    snapPoints: SheetSnap[];
    /** Whether sheet has drag handle */
    showHandle: boolean;
    /** Overlay opacity (0-1) */
    overlayOpacity: number;
    /** Overlay blur in px */
    overlayBlur: number;
    /** Whether to close on overlay tap */
    closeOnOverlay: boolean;
    /** Whether keyboard open should adjust sheet */
    keyboardAware: boolean;
    /** Safe bottom padding in px */
    safeBottomPadding: number;
    /** Animation duration in ms */
    animationDuration: number;
    /** Animation easing */
    animationEasing: string;
    /** Whether content should scroll inside sheet */
    scrollable: boolean;
}

// ─── SHEET PRESETS ─────────────────────────────────────
export const SHEET_PRESETS: Record<string, SheetConfig> = {
    /** AI Assistant Chat */
    aiAssistant: {
        id: "ai-assistant",
        defaultSnap: "half",
        snapPoints: ["peek", "half", "full"],
        showHandle: true,
        overlayOpacity: 0.5,
        overlayBlur: 8,
        closeOnOverlay: true,
        keyboardAware: true,
        safeBottomPadding: SAFE_AREAS.modalPadding,
        animationDuration: 350,
        animationEasing: "cubic-bezier(0.32, 0.72, 0, 1)",
        scrollable: true,
    },
    /** Merchant tools / quick actions */
    merchantTools: {
        id: "merchant-tools",
        defaultSnap: "compact",
        snapPoints: ["compact", "half", "threeQuarters"],
        showHandle: true,
        overlayOpacity: 0.6,
        overlayBlur: 12,
        closeOnOverlay: true,
        keyboardAware: false,
        safeBottomPadding: SAFE_AREAS.bottomNav,
        animationDuration: 300,
        animationEasing: "cubic-bezier(0.32, 0.72, 0, 1)",
        scrollable: true,
    },
    /** Filters panel */
    filters: {
        id: "filters",
        defaultSnap: "threeQuarters",
        snapPoints: ["compact", "half", "threeQuarters", "full"],
        showHandle: true,
        overlayOpacity: 0.5,
        overlayBlur: 16,
        closeOnOverlay: true,
        keyboardAware: false,
        safeBottomPadding: SAFE_AREAS.bottomNav,
        animationDuration: 350,
        animationEasing: "cubic-bezier(0.32, 0.72, 0, 1)",
        scrollable: true,
    },
    /** Booking panel */
    booking: {
        id: "booking",
        defaultSnap: "half",
        snapPoints: ["half", "full"],
        showHandle: true,
        overlayOpacity: 0.5,
        overlayBlur: 8,
        closeOnOverlay: true,
        keyboardAware: true,
        safeBottomPadding: SAFE_AREAS.modalPadding,
        animationDuration: 400,
        animationEasing: "cubic-bezier(0.32, 0.72, 0, 1)",
        scrollable: true,
    },
    /** Governance / consent panel */
    governance: {
        id: "governance",
        defaultSnap: "threeQuarters",
        snapPoints: ["threeQuarters", "full"],
        showHandle: true,
        overlayOpacity: 0.6,
        overlayBlur: 20,
        closeOnOverlay: false, // Must explicitly consent
        keyboardAware: true,
        safeBottomPadding: SAFE_AREAS.modalPadding,
        animationDuration: 400,
        animationEasing: "cubic-bezier(0.32, 0.72, 0, 1)",
        scrollable: true,
    },
} as const;

// ─── HELPER FUNCTIONS ──────────────────────────────────

/**
 * Get the pixel value for a snap point.
 */
export function getSnapValue(snap: SheetSnap, viewportHeight: number): number {
    const value = SHEET_SNAPS[snap];
    if (typeof value === "number") return value;
    if (value.endsWith("%")) {
        return (parseFloat(value) / 100) * viewportHeight;
    }
    // Handle calc() expressions
    // e.g. "calc(100% - 88px)" → viewportHeight - 88
    const calcMatch = value.match(/calc\(100%\s*-\s*(\d+)px\)/);
    if (calcMatch) {
        return viewportHeight - parseInt(calcMatch[1], 10);
    }
    return viewportHeight;
}

/**
 * Get bottom padding for a sheet based on visible bottom layers.
 */
export function getSheetBottomPadding(
    config: SheetConfig,
    keyboardOpen: boolean,
    bottomNavVisible: boolean
): number {
    if (keyboardOpen && config.keyboardAware) {
        return SAFE_AREAS.keyboardOffset + config.safeBottomPadding;
    }
    if (bottomNavVisible) {
        return SAFE_AREAS.bottomNav + config.safeBottomPadding;
    }
    return config.safeBottomPadding;
}

/**
 * Get the recommended overlay z-index for bottom sheets.
 * Must be below header (z-index 100) but above content (z-index 10).
 */
export function getSheetOverlayZIndex(): number {
    return 90; // Below header (100), above content
}

/**
 * Get the recommended sheet content z-index.
 */
export function getSheetContentZIndex(): number {
    return 91; // Above overlay, below header
}

/**
 * Get a style object for the sheet container.
 */
export function getSheetContainerStyle(
    config: SheetConfig,
    keyboardOpen: boolean,
    bottomNavVisible: boolean
): React.CSSProperties {
    return {
        paddingBottom: `${getSheetBottomPadding(config, keyboardOpen, bottomNavVisible)}px`,
        transition: `transform ${config.animationDuration}ms ${config.animationEasing}`,
    };
}
