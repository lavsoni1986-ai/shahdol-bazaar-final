// 🏛️ BHARAT-OS: MOTION GOVERNANCE
// Sovereign premium subtle motion — NOT flashy startup animations.
// Mobile-first, low-jank, low-end device safe.
// ALL animations must use these tokens. NO random duration/easing drift.

import { zIndex } from "./tokens";

// ─── DURATION TOKENS ────────────────────────────────────
export const duration = {
    /** 150ms — Instant feedback (tap states, hover) */
    instant: "150ms",
    /** 200ms — Fast transitions (button press, card hover) */
    fast: "200ms",
    /** 300ms — Default transitions (card enter, modal open) */
    normal: "300ms",
    /** 400ms — Relaxed transitions (page transitions) */
    relaxed: "400ms",
    /** 500ms — Skeleton shimmer, loading sequences */
    slow: "500ms",
    /** 700ms — Page entrances, hero animations */
    entrance: "700ms",
    /** 1000ms — Background ambient effects */
    ambient: "1000ms",
} as const;

// ─── DURATION NUMERIC (for JS animations) ──────────────
export const durationMs = {
    instant: 150,
    fast: 200,
    normal: 300,
    relaxed: 400,
    slow: 500,
    entrance: 700,
    ambient: 1000,
} as const;

// ─── EASING CURVES ──────────────────────────────────────
export const easing = {
    /** Default — smooth, natural motion */
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** For entrances — slightly exaggerated */
    out: "cubic-bezier(0.0, 0, 0.2, 1)",
    /** For exits — quick dismissal */
    in: "cubic-bezier(0.4, 0, 1, 1)",
    /** For emphasis — elastic feel (use sparingly) */
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    /** For skeletons — linear shimmer */
    linear: "linear",
    /** For ambient effects — slow deceleration */
    decelerate: "cubic-bezier(0.0, 0, 0.0, 1)",
} as const;

// ─── TRANSITION PRESETS ─────────────────────────────────
export type TransitionPreset = "fade" | "slideUp" | "slideDown" | "scale" | "cardHover" | "buttonPress" | "skeleton";

export const transitionPresets: Record<TransitionPreset, string> = {
    fade: `${duration.normal} ${easing.default}`,
    slideUp: `${duration.relaxed} ${easing.out}`,
    slideDown: `${duration.relaxed} ${easing.in}`,
    scale: `${duration.normal} ${easing.spring}`,
    cardHover: `${duration.fast} ${easing.default}`,
    buttonPress: `${duration.instant} ${easing.default}`,
    skeleton: `${duration.slow} ${easing.linear}`,
};

// ─── SKELETON CONFIG ────────────────────────────────────
export const skeleton = {
    /** Base color for skeleton shimmer */
    base: "bg-white/5",
    /** Highlight color for shimmer animation */
    highlight: "bg-white/[0.08]",
    /** Animation duration */
    duration: duration.slow,
    /** CSS animation classes for shimmer */
    animation: "animate-pulse",
    /** Border radius for skeleton elements */
    radius: "rounded-xl",
} as const;

// ─── HOVER/INTERACTION TRANSITIONS ─────────────────────
export const interaction = {
    /** Card hover: subtle lift */
    cardHover: {
        transform: "translateY(-2px)",
        shadow: "0 8px 25px rgba(0,0,0,0.3)",
        transition: `all ${duration.fast} ${easing.default}`,
    },
    /** Button press: subtle scale */
    buttonPress: {
        transform: "scale(0.97)",
        transition: `all ${duration.instant} ${easing.default}`,
    },
    /** Link/text hover: color shift */
    textHover: {
        transition: `color ${duration.fast} ${easing.default}`,
    },
    /** Image zoom on hover */
    imageZoom: {
        transform: "scale(1.05)",
        transition: `transform ${duration.relaxed} ${easing.out}`,
    },
} as const;

// ─── ANIMATION KEYFRAMED CLASSES ────────────────────────
// Use sparingly — prefer CSS transitions over keyframes for mobile perf.
export const keyframes = {
    /** Pulse for loading states */
    pulse: "animate-pulse",
    /** Spin for loading indicators */
    spin: "animate-spin",
    /** Gentle fade in */
    fadeIn: "animate-fadeIn",
    /** Slide up from bottom (sheet entrance) */
    slideUp: "animate-slideUp",
} as const;

// ─── TAILWIND CLASS GENERATORS ──────────────────────────

/** Get transition class for a preset */
export function getTransitionClass(preset: TransitionPreset): string {
    const map: Record<TransitionPreset, string> = {
        fade: "transition-opacity duration-300 ease-in-out",
        slideUp: "transition-all duration-400 ease-out",
        slideDown: "transition-all duration-400 ease-in",
        scale: "transition-transform duration-300",
        cardHover: "transition-all duration-200 ease-in-out",
        buttonPress: "transition-transform duration-150",
        skeleton: "animate-pulse",
    };
    return map[preset];
}

/** Get hover class for card elements */
export function getHoverClass(type: "card" | "button" | "link"): string {
    const map = {
        card: "hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200",
        button: "active:scale-95 transition-transform duration-150",
        link: "transition-colors duration-200",
    };
    return map[type];
}

export default {
    duration,
    durationMs,
    easing,
    transitionPresets,
    skeleton,
    interaction,
    keyframes,
    getTransitionClass,
    getHoverClass,
};
