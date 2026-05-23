// 🏛️ BHARAT-OS: SOVEREIGN INTERACTION GOVERNANCE
// Consistent sovereign interaction language for ALL components.
// Governs: tap feedback, hover states, press states, active states,
// disabled states, loading states, CTA emphasis, focus visibility.
// Subtle, premium, low-jank, touch-first, Android-safe.

// ─── TAP / PRESS FEEDBACK ──────────────────────────────
// Touch-first: active state visible instantly (not hover-dependant).
// Android-safe: no :hover-only patterns that break touch.

export const TAP_STATES = {
    /** Standard interactive element (buttons, cards, list items) */
    standard:
        "active:scale-95 hover:scale-[1.02] transition-transform duration-150 ease-out cursor-pointer",
    /** Icon buttons, avatar, small controls */
    icon:
        "active:scale-90 hover:scale-105 transition-transform duration-100 ease-out cursor-pointer",
    /** Navigation items (bottom nav, tabs) */
    nav:
        "active:scale-95 transition-transform duration-100 ease-out cursor-pointer",
    /** Cards and panels that are tappable */
    card:
        "active:scale-[0.98] hover:scale-[1.01] hover:bg-white/5 active:bg-white/[0.08] transition-all duration-200 ease-out cursor-pointer",
} as const;

// ─── HOVER STATES ──────────────────────────────────────
// Subtle, premium. NO neon hover spam. NO excessive scaling.

export const HOVER_STATES = {
    /** Glass surface hover (overlays, sheets, panels) */
    glass: "hover:bg-white/[0.06] active:bg-white/[0.1]",
    /** Border-only hover (outline buttons, ghost actions) */
    border: "hover:border-white/20 active:border-white/30",
    /** Text-only hover (links, ghost buttons) */
    text: "hover:text-white active:text-white/80",
    /** Accent hover (primary actions, CTAs) */
    accent: "hover:bg-orange-600 active:bg-orange-700",
    /** Surface hover (cards, list items) */
    surface: "hover:bg-white/[0.03] active:bg-white/[0.05]",
} as const;

// ─── FOCUS VISIBILITY ──────────────────────────────────
// High-contrast focus rings for keyboard navigation.
// MUST be visible on :focus-visible, NOT on :focus (touch).

export const FOCUS_RINGS = {
    /** Default sovereign focus ring */
    standard: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    /** Minimal focus ring for inline elements */
    minimal: "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500/40",
    /** No visible focus ring (for decorative elements) */
    none: "focus-visible:outline-none",
} as const;

// ─── DISABLED STATES ───────────────────────────────────
export const DISABLED_STATES = {
    /** Fully disabled with reduced opacity */
    full: "opacity-40 cursor-not-allowed pointer-events-none",
    /** Semi-disabled (visible but not interactive) */
    muted: "opacity-60 cursor-not-allowed",
} as const;

// ─── LOADING STATES ────────────────────────────────────
export const LOADING_STATES = {
    /** Pulsing skeleton placeholder */
    skeleton: "animate-pulse bg-white/[0.04] rounded-lg",
    /** Shimmer loading bar */
    shimmer: "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent",
    /** Reduced opacity for content behind loading overlay */
    dim: "opacity-30 pointer-events-none transition-opacity duration-300",
} as const;

// ─── CTA EMPHASIS ──────────────────────────────────────
// Primary vs secondary vs tertiary CTA hierarchy.
export const CTA_EMPHASIS = {
    /** Primary action (checkout, submit, confirm) */
    primary:
        "bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold shadow-lg shadow-orange-900/30 hover:shadow-orange-900/50 active:scale-95 transition-all duration-200",
    /** Secondary action (cancel, skip) */
    secondary:
        "bg-white/5 border border-white/10 text-white hover:bg-white/10 active:bg-white/15 active:scale-95 transition-all duration-200",
    /** Tertiary action (ghost, text) */
    tertiary:
        "text-zinc-400 hover:text-white active:text-white/80 transition-colors duration-150",
    /** Dangerous action (delete, remove) */
    danger:
        "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 active:scale-95 transition-all duration-200",
    /** Premium action (featured, sponsored) */
    premium:
        "bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 active:scale-95 transition-all duration-200",
} as const;

// ─── COMPOSED ACTION CLASSES ───────────────────────────
// These combine multiple interaction patterns for common component types.

export const ACTION_CLASSES = {
    /** Sovereign standard button */
    button: `${TAP_STATES.standard} ${HOVER_STATES.accent} ${FOCUS_RINGS.standard} px-6 py-3 rounded-xl font-semibold`,
    /** Sovereign ghost button */
    ghostButton: `${TAP_STATES.standard} ${HOVER_STATES.text} ${FOCUS_RINGS.standard} px-4 py-2 rounded-xl font-medium`,
    /** Sovereign tappable card */
    card: `${TAP_STATES.card} ${HOVER_STATES.surface} ${FOCUS_RINGS.standard} rounded-2xl border border-white/5`,
    /** Sovereign bottom nav item */
    navItem: `${TAP_STATES.nav} ${FOCUS_RINGS.minimal} flex flex-col items-center gap-1 px-3 py-1 min-w-[60px]`,
    /** Sovereign floating action */
    fab: `${TAP_STATES.icon} shadow-lg shadow-black/50`,
} as const;

// ─── KEYFRAME DEFINITIONS ──────────────────────────────
// Provide the shimmer keyframe for Tailwind config reference.
export const CUSTOM_KEYFRAMES = {
    shimmer: {
        "100%": { transform: "translateX(100%)" },
    },
} as const;

// ─── UTILITY ───────────────────────────────────────────

/**
 * Get the full className for a component based on its type and optional states.
 */
export function getActionClasses(
    type: keyof typeof ACTION_CLASSES,
    options?: {
        disabled?: boolean;
        loading?: boolean;
    }
): string {
    const base = ACTION_CLASSES[type];
    const extras: string[] = [];

    if (options?.disabled) extras.push(DISABLED_STATES.full);
    if (options?.loading) extras.push(LOADING_STATES.dim);

    return extras.length > 0 ? `${base} ${extras.join(" ")}` : base;
}
