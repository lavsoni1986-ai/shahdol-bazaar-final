// 🏛️ BHARAT-OS: SHEET STACK ORCHESTRATION
// Single sheet stack coordinator. Governs z-order, dismiss hierarchy,
// backdrop ownership, interaction locking, nested sheets, keyboard focus.
// Prevents sheet chaos and modal stacking conflicts.

import { useState, useCallback, useRef } from "react";
import { SHEET_PRESETS, SheetConfig } from "@/design/sheets";
import { shellTelemetry } from "./shell-telemetry";

export const SHEET_STACK_EVENTS = {
    PUSH: "sheetstack:push",
    POP: "sheetstack:pop",
    FOCUS_CHANGE: "sheetstack:focus",
    STACK_EMPTY: "sheetstack:empty",
} as const;

// ─── TYPES ─────────────────────────────────────────────
export interface SheetInstance {
    /** Unique instance ID (auto-generated) */
    id: string;
    /** Sheet preset ID (e.g., "aiAssistant", "filters") */
    presetId: string;
    /** Sheet configuration (resolved from preset or custom) */
    config: SheetConfig;
    /** Open timestamp */
    openedAt: number;
    /** Arbitrary data associated with this sheet instance */
    data?: Record<string, unknown>;
}

let sheetInstanceCounter = 0;
function generateSheetId(presetId: string): string {
    sheetInstanceCounter++;
    return `${presetId}-${sheetInstanceCounter}-${Date.now()}`;
}

/** ES2020-compatible findLastIndex */
function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i])) return i;
    }
    return -1;
}

// ─── HOOK ──────────────────────────────────────────────
interface SheetStackHook {
    /** Currently visible sheets (deepest = most recent) */
    stack: SheetInstance[];
    /** The top/most recent sheet (null if stack empty) */
    topSheet: SheetInstance | null;
    /** Stack depth (0 = no sheets open) */
    depth: number;
    /** Open a sheet by preset ID */
    open: (presetId: string, data?: Record<string, unknown>) => string;
    /** Open a sheet with custom config */
    openCustom: (config: SheetConfig, data?: Record<string, unknown>) => string;
    /** Close the topmost sheet */
    close: () => void;
    /** Close a specific sheet by ID */
    closeById: (id: string) => void;
    /** Close all sheets */
    closeAll: () => void;
    /** Close sheets until only sheets matching predicate remain */
    closeUntil: (predicate: (sheet: SheetInstance) => boolean) => void;
    /** Whether a specific sheet preset is currently open */
    isOpen: (presetId: string) => boolean;
    /** Whether any sheets are open */
    hasOpenSheets: boolean;
}

export function useSheetStack(): SheetStackHook {
    const [stack, setStack] = useState<SheetInstance[]>([]);
    const stackRef = useRef<SheetInstance[]>(stack);

    // Keep ref in sync
    stackRef.current = stack;

    const open = useCallback((presetId: string, data?: Record<string, unknown>): string => {
        const preset = SHEET_PRESETS[presetId];
        if (!preset) {
            console.warn(`[SHEET_STACK] Unknown preset: "${presetId}". Available: ${Object.keys(SHEET_PRESETS).join(", ")}`);
            return "";
        }

        const instance: SheetInstance = {
            id: generateSheetId(presetId),
            presetId,
            config: preset,
            openedAt: Date.now(),
            data,
        };

        setStack((prev) => {
            // Prevent duplicate of same preset at top of stack
            if (prev.length > 0 && prev[prev.length - 1].presetId === presetId) {
                shellTelemetry.sheetConflict(prev[prev.length - 1].id, instance.id);
                return prev;
            }

            const newStack = [...prev, instance];
            shellTelemetry.sheetOpen(instance.id, newStack.length);

            window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.PUSH, {
                detail: { sheetId: instance.id, presetId, depth: newStack.length },
            }));

            return newStack;
        });

        return instance.id;
    }, []);

    const openCustom = useCallback((config: SheetConfig, data?: Record<string, unknown>): string => {
        const instance: SheetInstance = {
            id: generateSheetId(config.id),
            presetId: config.id,
            config,
            openedAt: Date.now(),
            data,
        };

        setStack((prev) => {
            const newStack = [...prev, instance];
            shellTelemetry.sheetOpen(instance.id, newStack.length);

            window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.PUSH, {
                detail: { sheetId: instance.id, presetId: config.id, depth: newStack.length },
            }));

            return newStack;
        });

        return instance.id;
    }, []);

    const close = useCallback(() => {
        setStack((prev) => {
            if (prev.length === 0) return prev;
            const closed = prev[prev.length - 1];
            const newStack = prev.slice(0, -1);

            shellTelemetry.sheetClose(closed.id, newStack.length);

            window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.POP, {
                detail: { sheetId: closed.id, depth: newStack.length },
            }));

            if (newStack.length === 0) {
                window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.STACK_EMPTY));
            }

            return newStack;
        });
    }, []);

    const closeById = useCallback((id: string) => {
        setStack((prev) => {
            const index = prev.findIndex((s) => s.id === id);
            if (index === -1) return prev;

            const newStack = prev.slice(0, index);
            shellTelemetry.sheetClose(id, newStack.length);

            if (index === prev.length - 1) {
                window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.POP, {
                    detail: { sheetId: id, depth: newStack.length },
                }));
            }

            if (newStack.length === 0) {
                window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.STACK_EMPTY));
            }

            return newStack;
        });
    }, []);

    const closeAll = useCallback(() => {
        setStack((prev) => {
            if (prev.length === 0) return prev;
            prev.forEach((sheet) => shellTelemetry.sheetClose(sheet.id, 0));
            window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.STACK_EMPTY));
            return [];
        });
    }, []);

    const closeUntil = useCallback((predicate: (sheet: SheetInstance) => boolean) => {
        setStack((prev) => {
            const keepIndex = findLastIndex(prev, predicate);
            if (keepIndex === -1) return prev;

            const closed = prev.slice(keepIndex + 1);
            closed.forEach((sheet) => shellTelemetry.sheetClose(sheet.id, keepIndex + 1));

            const newStack = prev.slice(0, keepIndex + 1);

            if (newStack.length === 0) {
                window.dispatchEvent(new CustomEvent(SHEET_STACK_EVENTS.STACK_EMPTY));
            }

            return newStack;
        });
    }, []);

    const isOpen = useCallback((presetId: string): boolean => {
        return stackRef.current.some((s) => s.presetId === presetId);
    }, []);

    const topSheet = stack.length > 0 ? stack[stack.length - 1] : null;

    return {
        stack,
        topSheet,
        depth: stack.length,
        open,
        openCustom,
        close,
        closeById,
        closeAll,
        closeUntil,
        isOpen,
        hasOpenSheets: stack.length > 0,
    };
}
