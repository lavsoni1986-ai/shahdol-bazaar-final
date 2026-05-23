// 🏛️ BHARAT-OS: SURFACE ELEVATION GOVERNANCE
// Glass-morphism, card surfaces, and elevation rules.
// Consistent visual rhythm across ALL components.

import { surfaceElevation as tokenElevation, type SurfaceElevation, radii } from "./tokens";

// ─── SURFACE PRESETS ────────────────────────────────────

export type SurfacePreset =
    | "card-default"
    | "card-highlight"
    | "sheet"
    | "modal"
    | "input"
    | "badge"
    | "pill"
    | "cta-primary"
    | "cta-secondary"
    | "cta-ghost"
    | "skeleton"
    | "divider";

// ─── SURFACE STYLES ─────────────────────────────────────

export interface SurfaceStyle {
    /** Container classes */
    container: string;
    /** Inner content area classes */
    content?: string;
    /** Border radius */
    radius: string;
}

export const surfacePresets: Record<SurfacePreset, SurfaceStyle> = {
    "card-default": {
        container: "bg-white/[0.03] border border-white/[0.08] hover:border-orange-500/20 transition-all duration-200",
        radius: radii.lg,
    },
    "card-highlight": {
        container: "bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-orange-500/30 hover:border-orange-500/50 transition-all duration-200",
        radius: radii.lg,
    },
    sheet: {
        container: "bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12]",
        radius: radii["2xl"],
    },
    modal: {
        container: "bg-black/80 backdrop-blur-2xl border border-white/[0.12]",
        radius: radii.xl,
    },
    input: {
        container: "bg-white/[0.03] border border-white/[0.1] focus-within:border-orange-500/40 transition-colors duration-200",
        radius: radii.md,
    },
    badge: {
        container: "bg-orange-500/10 border border-orange-500/20",
        radius: radii.full,
    },
    pill: {
        container: "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors duration-200",
        radius: radii.full,
    },
    "cta-primary": {
        container: "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black shadow-lg shadow-orange-600/20 active:scale-[0.97] transition-all duration-150",
        radius: radii.md,
    },
    "cta-secondary": {
        container: "bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.1] text-white font-bold active:scale-[0.97] transition-all duration-150",
        radius: radii.md,
    },
    "cta-ghost": {
        container: "hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors duration-150",
        radius: radii.md,
    },
    skeleton: {
        container: "bg-white/5 animate-pulse",
        radius: radii.lg,
    },
    divider: {
        container: "border-t border-white/[0.06]",
        radius: "0",
    },
};

// ─── ELEVATION HELPERS ──────────────────────────────────

/**
 * Get full Tailwind class string for a surface preset.
 * Wraps radius and container classes together.
 */
export function getSurfaceClasses(
    preset: SurfacePreset,
    extraClasses: string = ""
): string {
    const surface = surfacePresets[preset];
    const radiusClass = `rounded-[${surface.radius}]`;
    return [surface.container, radiusClass, extraClasses]
        .filter(Boolean)
        .join(" ");
}

/**
 * Get the glass-card container class for a given elevation level.
 */
export function getElevationClasses(elevation: SurfaceElevation): string {
    const e = tokenElevation[elevation];
    return [e.background, e.border, e.backdropFilter || "", `shadow-sm`]
        .filter(Boolean)
        .join(" ");
}

// ─── SECTION DIVIDER ────────────────────────────────────
export function getDividerClasses(spacing: string = "my-4"): string {
    return `${spacing} border-t border-white/[0.06]`;
}

// ─── SECTION HEADER WRAPPER ─────────────────────────────
export function getSectionHeaderClasses(): string {
    return "flex items-center justify-between mb-3 sm:mb-4";
}

export default {
    surfacePresets,
    getSurfaceClasses,
    getElevationClasses,
    getDividerClasses,
    getSectionHeaderClasses,
};
