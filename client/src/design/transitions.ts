// 🏛️ BHARAT-OS: SOVEREIGN TRANSITION GOVERNANCE
// Restrained motion language for all UI transitions.
// NOT flashy consumer-app motion. Sovereign, subtle, purposeful.
// Governs: page transitions, modal transitions, sheet transitions,
// commerce navigation, AI interactions, search transitions.

// ─── EASING CURVES ─────────────────────────────────────
// Sovereign standard: decelerate for enter, accelerate for exit.
export const EASING = {
    /** Standard enter (decelerate) — most UI entrances */
    enter: "cubic-bezier(0.16, 1, 0.3, 1)",
    /** Standard exit (accelerate) — most UI exits */
    exit: "cubic-bezier(0.7, 0, 0.84, 0)",
    /** Standard emphasis (snap) — spring-like feel */
    emphasis: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    /** Page transition — smooth, restrained */
    page: "cubic-bezier(0.22, 1, 0.36, 1)",
    /** Sheet transition — drag-follow, momentum */
    sheet: "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;

// ─── DURATIONS (ms) ────────────────────────────────────
export const DURATION = {
    /** Instant feedback (active states, hover) */
    instant: 100,
    /** Quick transitions (tap, press) */
    fast: 150,
    /** Standard transitions (hover fade, icon swap) */
    normal: 200,
    /** Emphasized transitions (enter/exit) */
    emphasized: 300,
    /** Sheet snap transitions */
    sheet: 350,
    /** Page transitions */
    page: 400,
    /** Slow transitions (background effects) */
    slow: 500,
} as const;

// ─── TRANSITION PRESETS ────────────────────────────────

export const TRANSITIONS = {
    /** Fade in — standard content entrance */
    fadeIn: {
        className: "transition-opacity duration-300 ease-out",
        from: { opacity: 0 },
        to: { opacity: 1 },
    },
    /** Fade out — standard content exit */
    fadeOut: {
        className: "transition-opacity duration-200 ease-in",
        from: { opacity: 1 },
        to: { opacity: 0 },
    },
    /** Slide up — sheets, modals, menus */
    slideUp: {
        className: "transition-transform duration-350 cubic-bezier(0.32, 0.72, 0, 1)",
        from: { transform: "translateY(100%)" },
        to: { transform: "translateY(0)" },
    },
    /** Slide down — dismiss, pull-to-refresh */
    slideDown: {
        className: "transition-transform duration-250 cubic-bezier(0.7, 0, 0.84, 0)",
        from: { transform: "translateY(0)" },
        to: { transform: "translateY(100%)" },
    },
    /** Scale in — modals, dialogs */
    scaleIn: {
        className: "transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)",
        from: { opacity: 0, transform: "scale(0.95)" },
        to: { opacity: 1, transform: "scale(1)" },
    },
    /** Scale out — modal dismiss */
    scaleOut: {
        className: "transition-all duration-200 cubic-bezier(0.7, 0, 0.84, 0)",
        from: { opacity: 1, transform: "scale(1)" },
        to: { opacity: 0, transform: "scale(0.95)" },
    },
} as const;

// ─── COMPOSED TRANSITION CLASSES ───────────────────────
// Ready-to-use Tailwind className combinations.

export const TRANSITION_CLASSES = {
    /** Page enter (right to left navigation) */
    pageEnter:
        "animate-in slide-in-from-right duration-400 fill-mode-forwards",
    /** Page exit (left to right navigation) */
    pageExit:
        "animate-out slide-out-to-right duration-300 fill-mode-forwards",
    /** Modal/dialog enter */
    modalEnter:
        "animate-in fade-in zoom-in-95 duration-300 fill-mode-forwards",
    /** Modal/dialog exit */
    modalExit:
        "animate-out fade-out zoom-out-95 duration-200 fill-mode-forwards",
    /** Sheet bottom enter */
    sheetEnter:
        "animate-in slide-in-from-bottom duration-350 fill-mode-forwards",
    /** Sheet bottom exit */
    sheetExit:
        "animate-out slide-out-to-bottom duration-250 fill-mode-forwards",
    /** Content fade in (lazy load, image load) */
    contentEnter:
        "animate-in fade-in duration-500 fill-mode-forwards",
    /** Staggered children entrance */
    stagger:
        "animate-in fade-in slide-in-from-bottom-4 duration-300 fill-mode-forwards",
    /** AI response streaming entrance */
    aiResponse:
        "animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-forwards",
    /** Search result entrance */
    searchResult:
        "animate-in fade-in slide-in-from-bottom-2 duration-200 fill-mode-forwards",
} as const;

// ─── ANIMATION DELAY UTILITIES ─────────────────────────
// For staggered animations: pass the index and get the delay class.
// Example: className={`${getDelayClass(index)}`}
const delayValues = [0, 50, 100, 150, 200, 250, 300, 400] as const;

export function getDelayClass(index: number): string {
    const delay = delayValues[Math.min(index, delayValues.length - 1)];
    return `delay-${delay}`;
}

// ─── KEYFRAME DEFINITIONS ──────────────────────────────
// Reference for Tailwind config if custom animations needed.
export const TRANSITION_KEYFRAMES = {
    "slide-in-from-right": {
        "0%": { transform: "translateX(100%)", opacity: "0" },
        "100%": { transform: "translateX(0)", opacity: "1" },
    },
    "slide-out-to-right": {
        "0%": { transform: "translateX(0)", opacity: "1" },
        "100%": { transform: "translateX(100%)", opacity: "0" },
    },
    "slide-in-from-bottom": {
        "0%": { transform: "translateY(100%)" },
        "100%": { transform: "translateY(0)" },
    },
    "slide-out-to-bottom": {
        "0%": { transform: "translateY(0)" },
        "100%": { transform: "translateY(100%)" },
    },
    "slide-in-from-bottom-4": {
        "0%": { transform: "translateY(16px)", opacity: "0" },
        "100%": { transform: "translateY(0)", opacity: "1" },
    },
    "slide-in-from-bottom-2": {
        "0%": { transform: "translateY(8px)", opacity: "0" },
        "100%": { transform: "translateY(0)", opacity: "1" },
    },
    "zoom-in-95": {
        "0%": { transform: "scale(0.95)", opacity: "0" },
        "100%": { transform: "scale(1)", opacity: "1" },
    },
    "zoom-out-95": {
        "0%": { transform: "scale(1)", opacity: "1" },
        "100%": { transform: "scale(0.95)", opacity: "0" },
    },
} as const;

// ─── PREFERS-REDUCED-MOTION SAFETY ─────────────────────
// All transitions degrade gracefully.
export const REDUCED_MOTION_CLASSES = {
    /** Apply to any element with motion to respect OS preference */
    respectMotion: "motion-safe:transition-all motion-reduce:transition-none motion-reduce:transform-none",
    /** Only animate when user allows motion */
    safeFade: "motion-safe:animate-in motion-safe:fade-in motion-reduce:opacity-100",
} as const;
