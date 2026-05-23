// 🏛️ BHARAT-OS: IMMERSIVE MODE ENGINE
// Centralized immersive mode coordination.
// Each mode governs: header visibility, bottom nav, floating actions, spacing, gestures, viewport density.
// Route-driven shell transformation.

import { useState, useCallback, useMemo } from "react";
import { resolveRouteConfig } from "@/config/route-governance";
import { SAFE_AREAS } from "@/design/safe-area";
import { useLocation } from "wouter";
import { shellTelemetry } from "./shell-telemetry";

// ─── IMMERSIVE MODE DEFINITIONS ────────────────────────
export const IMMERSIVE_MODES = {
    /** Default shell — full chrome */
    default: "default",
    /** Commerce product detail — reduced chrome, trust + pricing + CTA focus */
    commerce: "commerce",
    /** Checkout — minimal chrome, no distractions */
    checkout: "checkout",
    /** AI focus — AI chat immersive */
    aiFocus: "ai_focus",
    /** Media viewer — full screen content */
    mediaViewer: "media_viewer",
    /** Onboarding — guided chrome */
    onboarding: "onboarding",
} as const;

export type ImmersiveMode = (typeof IMMERSIVE_MODES)[keyof typeof IMMERSIVE_MODES];

// ─── MODE CONFIG ───────────────────────────────────────
export interface ImmersiveModeConfig {
    /** Unique mode identifier */
    mode: ImmersiveMode;
    /** Header visibility strategy */
    header: "visible" | "minimal" | "hidden";
    /** Bottom nav visibility */
    showBottomNav: boolean;
    /** Floating action visibility */
    showFloatingActions: boolean;
    /** Whether scroll-triggered search bar is visible */
    showSearch: boolean;
    /** Content padding top in px */
    paddingTop: number;
    /** Content padding bottom in px */
    paddingBottom: number;
    /** Z-index base layer for content */
    contentZIndex: number;
    /** Whether gestures like swipe-back are enabled */
    allowGestures: boolean;
    /** Whether sheet overlays can appear in this mode */
    allowSheets: boolean;
    /** Description for telemetry/intent */
    description: string;
}

// ─── MODE REGISTRY ─────────────────────────────────────
const modeConfigs: Record<ImmersiveMode, ImmersiveModeConfig> = {
    [IMMERSIVE_MODES.default]: {
        mode: IMMERSIVE_MODES.default,
        header: "visible",
        showBottomNav: true,
        showFloatingActions: true,
        showSearch: true,
        paddingTop: SAFE_AREAS.header,
        paddingBottom: SAFE_AREAS.pageBottomPadding,
        contentZIndex: 10,
        allowGestures: true,
        allowSheets: true,
        description: "Full chrome: header, bottom nav, search, floating actions",
    },
    [IMMERSIVE_MODES.commerce]: {
        mode: IMMERSIVE_MODES.commerce,
        header: "minimal", // back/share/save only
        showBottomNav: true,
        showFloatingActions: true, // WA visible
        showSearch: false,
        paddingTop: SAFE_AREAS.header,
        paddingBottom: SAFE_AREAS.stickyCTA + SAFE_AREAS.bottomNav + 24, // ~196px
        contentZIndex: 10,
        allowGestures: true,
        allowSheets: true,
        description: "Immersive commerce: reduced chrome, no search, sticky CTA",
    },
    [IMMERSIVE_MODES.checkout]: {
        mode: IMMERSIVE_MODES.checkout,
        header: "minimal",
        showBottomNav: false, // No distractions during checkout
        showFloatingActions: false,
        showSearch: false,
        paddingTop: SAFE_AREAS.header,
        paddingBottom: 24,
        contentZIndex: 10,
        allowGestures: false, // Prevent accidental back during checkout
        allowSheets: false, // Prevent overlays during payment
        description: "Checkout flow: minimal chrome, no bottom nav, locked gestures",
    },
    [IMMERSIVE_MODES.aiFocus]: {
        mode: IMMERSIVE_MODES.aiFocus,
        header: "visible",
        showBottomNav: true,
        showFloatingActions: true,
        showSearch: false,
        paddingTop: SAFE_AREAS.header,
        paddingBottom: SAFE_AREAS.bottomNav + 24,
        contentZIndex: 10,
        allowGestures: true,
        allowSheets: true,
        description: "AI focus: full chrome, no search distraction",
    },
    [IMMERSIVE_MODES.mediaViewer]: {
        mode: IMMERSIVE_MODES.mediaViewer,
        header: "hidden",
        showBottomNav: false,
        showFloatingActions: false,
        showSearch: false,
        paddingTop: 0,
        paddingBottom: 0,
        contentZIndex: 100,
        allowGestures: false, // Custom media gestures only
        allowSheets: false,
        description: "Media viewer: zero chrome, full viewport",
    },
    [IMMERSIVE_MODES.onboarding]: {
        mode: IMMERSIVE_MODES.onboarding,
        header: "hidden",
        showBottomNav: false,
        showFloatingActions: false,
        showSearch: false,
        paddingTop: 0,
        paddingBottom: 0,
        contentZIndex: 10,
        allowGestures: true,
        allowSheets: false,
        description: "Onboarding: no chrome, guided experience",
    },
};

// ─── HOOK ──────────────────────────────────────────────
interface ImmersiveModeHook {
    /** Current immersive mode */
    mode: ImmersiveMode;
    /** Current mode configuration */
    config: ImmersiveModeConfig;
    /** Set immersive mode directly */
    setMode: (mode: ImmersiveMode) => void;
    /** Reset to route-driven mode */
    resetToRoute: () => void;
    /** Manually override a single config property */
    patchConfig: (patch: Partial<ImmersiveModeConfig>) => void;
    /** Whether the current mode is NOT default (immersive) */
    isImmersive: boolean;
}

export function useImmersiveMode(): ImmersiveModeHook {
    const [location] = useLocation();
    const [overrideMode, setOverrideMode] = useState<ImmersiveMode | null>(null);
    const [configPatch, setConfigPatch] = useState<Partial<ImmersiveModeConfig> | null>(null);

    // Route-driven mode resolution
    const routeMode = useMemo((): ImmersiveMode => {
        const routeConfig = resolveRouteConfig(location);

        // Map RouteConfig to ImmersiveMode
        if (routeConfig.safeAreaMode === "commerce" && routeConfig.isProductRoute) {
            return IMMERSIVE_MODES.commerce;
        }
        if (routeConfig.safeAreaMode === "checkout") {
            return IMMERSIVE_MODES.checkout;
        }
        if (routeConfig.headerMode === "immersive") {
            return IMMERSIVE_MODES.commerce;
        }

        return IMMERSIVE_MODES.default;
    }, [location]);

    // Resolve current mode: override > route-driven
    const currentMode = overrideMode ?? routeMode;

    // Resolve config
    const baseConfig = modeConfigs[currentMode];
    const config = useMemo((): ImmersiveModeConfig => {
        if (!configPatch) return baseConfig;
        return { ...baseConfig, ...configPatch };
    }, [baseConfig, configPatch]);

    const setMode = useCallback((mode: ImmersiveMode) => {
        setOverrideMode(mode);
        shellTelemetry.immersiveEnter(mode, window.location.pathname);
    }, []);

    const resetToRoute = useCallback(() => {
        setOverrideMode(null);
        setConfigPatch(null);
    }, []);

    const patchConfig = useCallback((patch: Partial<ImmersiveModeConfig>) => {
        setConfigPatch((prev) => ({ ...prev, ...patch }));
    }, []);

    return {
        mode: currentMode,
        config,
        setMode,
        resetToRoute,
        patchConfig,
        isImmersive: currentMode !== IMMERSIVE_MODES.default,
    };
}

/**
 * Get all available immersive modes with their descriptions.
 */
export function getImmersiveModeInfo(): Array<{ mode: ImmersiveMode; description: string }> {
    return Object.entries(modeConfigs).map(([mode, config]) => ({
        mode: mode as ImmersiveMode,
        description: config.description,
    }));
}
