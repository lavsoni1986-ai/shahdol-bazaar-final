// 🏛️ BHARAT-OS: APP SHELL ORCHESTRATION
// Centralized runtime coordination layer.
// Single authority for: viewport orchestration, sheet coordination,
// floating action coordination, route-aware shell behavior,
// keyboard state awareness, immersive mode handling,
// interaction locks, gesture governance.

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SAFE_AREAS } from "@/design/safe-area";
import { resolveRouteConfig } from "@/config/route-governance";
import { useKeyboard, KEYBOARD_EVENTS } from "./keyboard";
import { useImmersiveMode, IMMERSIVE_MODES, type ImmersiveMode } from "./immersive-mode";
import { useSheetStack, SHEET_STACK_EVENTS, type SheetInstance } from "./sheet-stack";
import { shellTelemetry, SHELL_EVENTS } from "./shell-telemetry";

// ─── CONTEXT TYPE ──────────────────────────────────────
export interface ShellContextValue {
    /** Current route location */
    location: string;
    /** Keyboard state (isOpen, viewportHeight, keyboardHeight, settled) */
    keyboard: ReturnType<typeof useKeyboard>;
    /** Immersive mode engine */
    immersive: ReturnType<typeof useImmersiveMode>;
    /** Sheet stack coordinator */
    sheets: ReturnType<typeof useSheetStack>;
    /** Whether the shell is in an "interaction-locked" state (transitions, sheets, etc.) */
    interactionLocked: boolean;
    /** Lock all interactions (for transitions, checkout) */
    lock: () => void;
    /** Unlock interactions */
    unlock: () => void;
    /** Viewport width (reactive) */
    viewportWidth: number;
    /** Viewport height (reactive) */
    viewportHeight: number;
    /** Whether this is a mobile viewport (< 768px) */
    isMobile: boolean;
    /** Current immersive mode */
    currentMode: ImmersiveMode;
    /** Whether any bottom sheet is open */
    hasOpenSheet: boolean;
    /** Whether keyboard is open */
    isKeyboardOpen: boolean;
    /** Content padding top in px */
    contentPaddingTop: number;
    /** Content padding bottom in px */
    contentPaddingBottom: number;
    /** Whether to show bottom nav */
    showBottomNav: boolean;
    /** Whether to show floating actions */
    showFloatingActions: boolean;
    /** Whether to show search bar */
    showSearch: boolean;
    /** Whether gestures are allowed */
    allowGestures: boolean;
}

const ShellContext = createContext<ShellContextValue | null>(null);

// ─── PROVIDER ──────────────────────────────────────────
export function AppShellProvider({ children }: { children: React.ReactNode }) {
    const [location] = useLocation();
    const [interactionLocked, setInteractionLocked] = useState(false);
    const [viewportDims, setViewportDims] = useState(() => ({
        width: typeof window !== "undefined" ? window.innerWidth : 1200,
        height: typeof window !== "undefined" ? window.innerHeight : 900,
    }));

    // ─── SUB-SYSTEMS ──────────────────────────────────
    const keyboard = useKeyboard();
    const immersive = useImmersiveMode();
    const sheets = useSheetStack();

    // ─── VIEWPORT TRACKING ──────────────────────────
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setViewportDims({ width: w, height: h });
            shellTelemetry.viewportChange(w, h);
        };
        window.addEventListener("resize", handleResize, { passive: true });
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // ─── SHEET-KEYBOARD COORDINATION ─────────────────
    // When keyboard opens, close sheets that are not keyboard-aware
    useEffect(() => {
        const handleKeyboardOpen = () => {
            if (sheets.hasOpenSheets && sheets.topSheet) {
                if (!sheets.topSheet.config.keyboardAware) {
                    sheets.closeAll();
                }
            }
        };

        window.addEventListener(KEYBOARD_EVENTS.OPEN, handleKeyboardOpen);
        return () => window.removeEventListener(KEYBOARD_EVENTS.OPEN, handleKeyboardOpen);
    }, [sheets]);

    // ─── IMMERSIVE MODE → SHELL TELEMETRY ────────────
    useEffect(() => {
        if (immersive.isImmersive) {
            shellTelemetry.modeChange(
                IMMERSIVE_MODES.default,
                immersive.mode,
                location
            );
        }
    }, [immersive.mode, immersive.isImmersive, location]);

    // ─── DERIVED STATE ──────────────────────────────
    const isMobile = viewportDims.width < 768;
    const currentMode = immersive.mode;
    const config = immersive.config;
    const isKeyboardOpen = keyboard.isOpen;

    // Content padding: immersive config + keyboard adjustment
    const contentPaddingTop = config.paddingTop;
    const contentPaddingBottom = isKeyboardOpen
        ? keyboard.keyboardHeight + 16
        : config.paddingBottom;

    // ─── LOCK / UNLOCK ──────────────────────────────
    const lock = useCallback(() => {
        setInteractionLocked(true);
        shellTelemetry.log(SHELL_EVENTS.INTERACTION_LOCK, { locked: true });
    }, []);

    const unlock = useCallback(() => {
        setInteractionLocked(false);
        shellTelemetry.log(SHELL_EVENTS.INTERACTION_LOCK, { locked: false });
    }, []);

    // ─── CONTEXT VALUE ──────────────────────────────
    const value = useMemo((): ShellContextValue => ({
        location,
        keyboard,
        immersive,
        sheets,
        interactionLocked,
        lock,
        unlock,
        viewportWidth: viewportDims.width,
        viewportHeight: viewportDims.height,
        isMobile,
        currentMode,
        hasOpenSheet: sheets.hasOpenSheets,
        isKeyboardOpen,
        contentPaddingTop,
        contentPaddingBottom,
        showBottomNav: config.showBottomNav && !isKeyboardOpen,
        showFloatingActions: config.showFloatingActions,
        showSearch: config.showSearch,
        allowGestures: config.allowGestures && !interactionLocked,
    }), [
        location,
        keyboard,
        immersive,
        sheets,
        interactionLocked,
        lock,
        unlock,
        viewportDims,
        isMobile,
        currentMode,
        isKeyboardOpen,
        contentPaddingTop,
        contentPaddingBottom,
        config,
    ]);

    return (
        <ShellContext.Provider value={value}>
            {children}
        </ShellContext.Provider>
    );
}

// ─── HOOK ──────────────────────────────────────────────
export function useShell(): ShellContextValue {
    const ctx = useContext(ShellContext);
    if (!ctx) {
        throw new Error("useShell must be used within an <AppShellProvider>");
    }
    return ctx;
}
