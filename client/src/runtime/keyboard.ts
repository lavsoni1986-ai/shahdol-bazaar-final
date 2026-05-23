// 🏛️ BHARAT-OS: KEYBOARD ORCHESTRATION
// Runtime keyboard coordinator. Governs viewport resize detection,
// sticky CTA lift, bottom nav hide, floating action reposition, sheet resize.
// Single source of truth for keyboard state across the shell.

import { useState, useEffect, useCallback, useRef } from "react";
import { SAFE_AREAS } from "@/design/safe-area";
import { shellTelemetry } from "./shell-telemetry";

export const KEYBOARD_EVENTS = {
    OPEN: "keyboard:open",
    CLOSE: "keyboard:close",
    RESIZE: "keyboard:resize",
} as const;

export interface KeyboardState {
    /** Whether keyboard is likely visible */
    isOpen: boolean;
    /** Current viewport height in px */
    viewportHeight: number;
    /** Estimated keyboard height in px */
    keyboardHeight: number;
    /** Whether the viewport has stabilized after resize */
    settled: boolean;
}

// ─── DEFAULTS ──────────────────────────────────────────
const initialKeyboardState: KeyboardState = {
    isOpen: false,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 900,
    keyboardHeight: 0,
    settled: true,
};

// ─── DETECTION CONSTANTS ───────────────────────────────
// A viewport height drop of more than this threshold (px) indicates keyboard open.
const KEYBOARD_THRESHOLD = 80;
// Time to wait after last resize event before considering it settled (ms)
const SETTLE_DELAY = 300;

// ─── HOOK ──────────────────────────────────────────────
export function useKeyboard(): KeyboardState {
    const [state, setState] = useState<KeyboardState>(initialKeyboardState);
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHeightRef = useRef(initialKeyboardState.viewportHeight);

    const handleResize = useCallback(() => {
        const height = window.innerHeight;
        const heightDiff = lastHeightRef.current - height;
        const isOpen = heightDiff > KEYBOARD_THRESHOLD;

        // Estimate keyboard height
        const keyboardHeight = isOpen ? Math.min(heightDiff, SAFE_AREAS.keyboardOffset) : 0;

        // Update state immediately for responsiveness
        setState((prev) => ({
            ...prev,
            isOpen,
            viewportHeight: height,
            keyboardHeight,
            settled: false,
        }));

        // Log telemetry
        shellTelemetry.keyboardResize(height, isOpen);

        // Fire custom events for shell-wide awareness
        if (isOpen) {
            window.dispatchEvent(new CustomEvent(KEYBOARD_EVENTS.OPEN, {
                detail: { viewportHeight: height, keyboardHeight },
            }));
        } else if (lastHeightRef.current - height > KEYBOARD_THRESHOLD / 2) {
            // Only fire close if we were previously open (significant recovery)
            window.dispatchEvent(new CustomEvent(KEYBOARD_EVENTS.CLOSE));
        }

        window.dispatchEvent(new CustomEvent(KEYBOARD_EVENTS.RESIZE, {
            detail: { viewportHeight: height, isOpen, keyboardHeight },
        }));

        // Settle timer: mark settled after no resize events for SETTLE_DELAY
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => {
            setState((prev) => ({ ...prev, settled: true }));
            lastHeightRef.current = height;
        }, SETTLE_DELAY);
    }, []);

    useEffect(() => {
        // Set initial height
        lastHeightRef.current = window.innerHeight;
        setState((prev) => ({ ...prev, viewportHeight: window.innerHeight }));

        window.addEventListener("resize", handleResize, { passive: true });

        // Also listen for orientation change which can trigger resize
        window.addEventListener("orientationchange", () => {
            // orientationchange fires before resize; defer to next tick
            setTimeout(handleResize, 100);
        }, { passive: true });

        return () => {
            window.removeEventListener("resize", handleResize);
            if (settleTimer.current) clearTimeout(settleTimer.current);
        };
    }, [handleResize]);

    return state;
}

// ─── DERIVED COMPUTATIONS ──────────────────────────────

/**
 * Get the appropriate bottom padding for content when keyboard is visible.
 * Bottom nav should be hidden; floating actions should shift.
 */
export function getKeyboardSafeBottom(keyboardOpen: boolean, bottomNavVisible: boolean): number {
    if (keyboardOpen) {
        return SAFE_AREAS.keyboardOffset + 16; // 120px + 16px comfortable margin
    }
    return bottomNavVisible ? SAFE_AREAS.bottomNav + 24 : 24;
}

/**
 * Get the CSS transform to apply to floating actions when keyboard opens.
 */
export function getKeyboardShift(keyboardOpen: boolean, keyboardHeight: number): string {
    if (!keyboardOpen || keyboardHeight === 0) return "translateY(0)";
    // Shift floating actions upward by estimated keyboard height
    return `translateY(-${keyboardHeight}px)`;
}

/**
 * Determine if bottom nav should be hidden based on keyboard state.
 */
export function shouldHideBottomNav(keyboardOpen: boolean, viewportHeight: number): boolean {
    if (!keyboardOpen) return false;
    // Hide bottom nav when keyboard is open AND viewport is small
    return viewportHeight < 600;
}
