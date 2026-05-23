// 🏛️ BHARAT-OS: SOVEREIGN DESIGN TOKENS
// Single source of truth for ALL design decisions.
// NO random Tailwind drift. NO inline spacing chaos.
// Every component must reference these semantic tokens.

// ─── SPACING SCALE (rem-based, mobile-first) ────────────
// Base unit: 4px (0.25rem)
export const spacing = {
    /** 4px — Micro spacing (icons, badges) */
    micro: "0.25rem",
    /** 8px — Tight spacing (inner card padding, small gaps) */
    tight: "0.5rem",
    /** 12px — Compact spacing (button padding, metadata gaps) */
    compact: "0.75rem",
    /** 16px — Base spacing (card padding, section gaps) */
    base: "1rem",
    /** 20px — Relaxed spacing (between sections on mobile) */
    relaxed: "1.25rem",
    /** 24px — Section spacing (between major sections) */
    section: "1.5rem",
    /** 32px — Large section spacing */
    large: "2rem",
    /** 40px — Page section spacing */
    page: "2.5rem",
    /** 48px — Hero/Screen spacing */
    hero: "3rem",
    /** 64px — Major layout separation */
    layout: "4rem",
} as const;

// ─── SPACING VALUES (numeric for calculations) ───────────
export const spacingValues = {
    micro: 4,
    tight: 8,
    compact: 12,
    base: 16,
    relaxed: 20,
    section: 24,
    large: 32,
    page: 40,
    hero: 48,
    layout: 64,
} as const;

// ─── RADIUS SCALE ───────────────────────────────────────
export const radii = {
    /** 8px — Small chips, badges, inputs */
    sm: "0.5rem",
    /** 12px — Buttons, small cards, CTAs */
    md: "0.75rem",
    /** 16px — Cards, modals, sheets (default) */
    lg: "1rem",
    /** 24px — Featured cards, premium containers */
    xl: "1.5rem",
    /** 32px — Hero containers, bottom sheets */
    "2xl": "2rem",
    /** Full round for pills, avatars */
    full: "9999px",
} as const;

// ─── SHADOW SCALE ───────────────────────────────────────
export const shadows = {
    /** Subtle surface elevation */
    subtle: "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.06)",
    /** Default card elevation */
    card: "0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.06)",
    /** Elevated cards, modals */
    elevated: "0 10px 15px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.1)",
    /** Modal/Sheet elevation */
    modal: "0 20px 25px rgba(0,0,0,0.5), 0 10px 10px rgba(0,0,0,0.2)",
    /** Premium glow (sovereign accent) */
    glow: "0 0 20px rgba(249,115,22,0.15), 0 0 40px rgba(249,115,22,0.05)",
    /** Strong glow for featured items */
    "glow-strong": "0 0 30px rgba(249,115,22,0.25), 0 0 60px rgba(249,115,22,0.1)",
} as const;

// ─── ELEVATION MAP ──────────────────────────────────────
export type SurfaceElevation = "flat" | "raised" | "overlay" | "modal" | "premium";

export const surfaceElevation: Record<SurfaceElevation, {
    background: string;
    border: string;
    shadow: string;
    backdropFilter?: string;
}> = {
    flat: {
        background: "bg-white/[0.02]",
        border: "border-white/[0.06]",
        shadow: shadows.subtle,
    },
    raised: {
        background: "bg-white/[0.04]",
        border: "border-white/[0.08]",
        shadow: shadows.card,
    },
    overlay: {
        background: "bg-white/[0.06]",
        border: "border-white/[0.1]",
        shadow: shadows.elevated,
        backdropFilter: "backdrop-blur-xl",
    },
    modal: {
        background: "bg-white/[0.08]",
        border: "border-white/[0.12]",
        shadow: shadows.modal,
        backdropFilter: "backdrop-blur-2xl",
    },
    premium: {
        background: "bg-gradient-to-b from-white/[0.06] to-white/[0.02]",
        border: "border-orange-500/30",
        shadow: shadows.glow,
        backdropFilter: "backdrop-blur-xl",
    },
};

// ─── COLOR TOKENS ───────────────────────────────────────
export const colors = {
    // Brand
    accent: {
        DEFAULT: "#f97316",
        50: "#fff7ed",
        100: "#ffedd5",
        200: "#fed7aa",
        300: "#fdba74",
        400: "#fb923c",
        500: "#f97316",
        600: "#ea580c",
        700: "#c2410c",
        800: "#9a3412",
        900: "#7c2d12",
        950: "#431407",
    },
    // Semantic
    success: {
        DEFAULT: "#10b981",
        light: "#34d399",
        dark: "#059669",
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
    },
    warning: {
        DEFAULT: "#f59e0b",
        light: "#fbbf24",
        dark: "#d97706",
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
    },
    error: {
        DEFAULT: "#ef4444",
        light: "#f87171",
        dark: "#dc2626",
        bg: "bg-red-500/10",
        text: "text-red-400",
        border: "border-red-500/20",
    },
    // Surface
    surface: {
        deep: "#030005",
        base: "#0a0a0a",
        card: "rgba(255,255,255,0.03)",
        border: "rgba(255,255,255,0.08)",
        hover: "rgba(255,255,255,0.06)",
    },
    // Text
    text: {
        primary: "#ffffff",
        secondary: "#a1a1aa",
        muted: "#71717a",
        dim: "#52525b",
        accent: "#fb923c",
    },
} as const;

// ─── OPACITY TOKENS ─────────────────────────────────────
export const opacity = {
    glass: "0.03",
    subtle: "0.05",
    medium: "0.08",
    strong: "0.12",
    overlay: "0.6",
    solid: "1",
} as const;

// ─── FONT WEIGHT SYSTEM ─────────────────────────────────
export const fontWeights = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
} as const;

// ─── Z-INDEX GOVERNANCE ─────────────────────────────────
// CANONICAL z-index constants. Every component MUST use these.
// NO arbitrary z-[*] values. NO z-index hacks.
// This is the SINGLE SOURCE OF TRUTH for stacking context.
//
// Layer hierarchy (bottom to top):
//   content  (1)   — Page content, cards, grids
//   sticky   (50)  — Sticky elements within page flow
//   nav      (60)  — Navigation bars, tabs
//   overlay  (70)  — Overlay panels, mobile CTAs, bottom sheets
//   modal    (80)  — Modals, dialogs, sheets
//   toast    (90)  — Toasts, notifications, search dropdowns
//   header   (100) — Fixed/sticky headers (layout authority)
//   tooltip  (110) — Tooltips, floating buttons
//   max      (9999)— Emergency override for AI orb, floating WA
export const zIndex = {
    /** Content layer — page content, cards, grids */
    content: 1,
    /** Sticky elements within page flow */
    sticky: 50,
    /** Navigation bars, tabs */
    nav: 60,
    /** Overlay panels, mobile CTAs, bottom sheets */
    overlay: 70,
    /** Modals, dialogs, sheets */
    modal: 80,
    /** Toasts, notifications, search dropdowns */
    toast: 90,
    /** Fixed/sticky header (layout authority — ONLY one) */
    header: 100,
    /** Tooltips, floating buttons */
    tooltip: 110,
    /** Emergency override for critical UI elements */
    max: 9999,
} as const;

/** Counterpart mapping for inline z-index classes */
export const zIndexClasses: Record<keyof typeof zIndex, string> = {
    content: "z-1",
    sticky: "z-50",
    nav: "z-[60]",
    overlay: "z-[70]",
    modal: "z-[80]",
    toast: "z-[90]",
    header: "z-[100]",
    tooltip: "z-[110]",
    max: "z-[9999]",
} as const;

// ─── UTILITY HELPERS ─────────────────────────────────────
export function classNames(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(" ");
}

/**
 * Resolve surface classes for a given elevation level.
 */
export function getSurfaceClasses(elevation: SurfaceElevation): string {
    const e = surfaceElevation[elevation];
    return `${e.background} ${e.border} ${e.backdropFilter || ""} shadow-sm`;
}

export default {
    spacing,
    spacingValues,
    radii,
    shadows,
    surfaceElevation,
    colors,
    opacity,
    fontWeights,
    zIndex,
    classNames,
    getSurfaceClasses,
};
