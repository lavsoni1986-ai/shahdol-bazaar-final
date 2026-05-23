// 🏛️ BHARAT-OS: SHELL TELEMETRY
// Structured operational logging for UX runtime behavior.
// Provides visibility into shell mode changes, sheet conflicts, keyboard events,
// floating action collisions, and immersive mode transitions.

export const SHELL_EVENTS = {
    MODE_CHANGE: "[SHELL_MODE_CHANGE]",
    SHEET_STACK_CONFLICT: "[SHEET_STACK_CONFLICT]",
    KEYBOARD_RESIZE: "[KEYBOARD_RESIZE]",
    FLOATING_ACTION_COLLISION: "[FLOATING_ACTION_COLLISION]",
    IMMERSIVE_MODE_ENTER: "[IMMERSIVE_MODE_ENTER]",
    SHEET_OPEN: "[SHEET_OPEN]",
    SHEET_CLOSE: "[SHEET_CLOSE]",
    GESTURE_CONFLICT: "[GESTURE_CONFLICT]",
    VIEWPORT_CHANGE: "[VIEWPORT_CHANGE]",
    INTERACTION_LOCK: "[INTERACTION_LOCK]",
} as const;

type ShellEventValue = (typeof SHELL_EVENTS)[keyof typeof SHELL_EVENTS];

interface ShellTelemetryEntry {
    event: ShellEventValue;
    timestamp: number;
    data?: Record<string, unknown>;
}

const MAX_LOG_ENTRIES = 200;
const telemetryLog: ShellTelemetryEntry[] = [];

/**
 * Centralized shell telemetry logger.
 * Prefixes all logs with event tags for easy grep/filter.
 * Only logs in development or when SOVEREIGN_DEBUG is set.
 */
const isDebug = typeof window !== "undefined" &&
    (process.env.NODE_ENV === "development" || (window as any).__SOVEREIGN_DEBUG);

export const shellTelemetry = {
    /**
     * Log a structured shell event.
     */
    log(event: ShellEventValue, data?: Record<string, unknown>): void {
        const entry: ShellTelemetryEntry = {
            event,
            timestamp: Date.now(),
            data,
        };

        // Store in circular buffer
        telemetryLog.push(entry);
        if (telemetryLog.length > MAX_LOG_ENTRIES) {
            telemetryLog.shift();
        }

        // Console output in debug mode
        if (isDebug) {
            const prefix = event;
            const payload = data ? JSON.stringify(data) : "";
            console.log(`${prefix}`, payload);
        }
    },

    /**
     * Log shell mode change.
     */
    modeChange(from: string, to: string, route?: string): void {
        this.log(SHELL_EVENTS.MODE_CHANGE, { from, to, route });
    },

    /**
     * Log sheet stack conflict.
     */
    sheetConflict(sheetA: string, sheetB: string): void {
        this.log(SHELL_EVENTS.SHEET_STACK_CONFLICT, { sheetA, sheetB });
    },

    /**
     * Log keyboard viewport resize.
     */
    keyboardResize(viewportHeight: number, keyboardVisible: boolean): void {
        this.log(SHELL_EVENTS.KEYBOARD_RESIZE, { viewportHeight, keyboardVisible });
    },

    /**
     * Log floating action collision.
     */
    floatingCollision(elementA: string, elementB: string): void {
        this.log(SHELL_EVENTS.FLOATING_ACTION_COLLISION, { elementA, elementB });
    },

    /**
     * Log immersive mode entry.
     */
    immersiveEnter(mode: string, route: string): void {
        this.log(SHELL_EVENTS.IMMERSIVE_MODE_ENTER, { mode, route });
    },

    /**
     * Log sheet open event.
     */
    sheetOpen(sheetId: string, stackDepth: number): void {
        this.log(SHELL_EVENTS.SHEET_OPEN, { sheetId, stackDepth });
    },

    /**
     * Log sheet close event.
     */
    sheetClose(sheetId: string, stackDepth: number): void {
        this.log(SHELL_EVENTS.SHEET_CLOSE, { sheetId, stackDepth });
    },

    /**
     * Log gesture conflict.
     */
    gestureConflict(gestureA: string, gestureB: string): void {
        this.log(SHELL_EVENTS.GESTURE_CONFLICT, { gestureA, gestureB });
    },

    /**
     * Log viewport change.
     */
    viewportChange(width: number, height: number): void {
        this.log(SHELL_EVENTS.VIEWPORT_CHANGE, { width, height });
    },

    /**
     * Get all logged telemetry entries (for debugging/reporting).
     */
    getLog(): ReadonlyArray<ShellTelemetryEntry> {
        return telemetryLog;
    },

    /**
     * Clear the telemetry log.
     */
    clear(): void {
        telemetryLog.length = 0;
    },
};
