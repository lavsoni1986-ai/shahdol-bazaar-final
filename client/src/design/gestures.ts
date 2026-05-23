// 🏛️ BHARAT-OS: GESTURE GOVERNANCE
// Centralized gesture rules. Prevents gesture conflicts between
// bottom-sheet drag, swipe-back, horizontal card scroll, carousel, modal dismiss.
// Every gesture axis/zone must register here.

// ─── GESTURE ZONES ─────────────────────────────────────
// These define which parts of the screen own which gesture axes.
// Priority: higher priority gesture wins on overlap.

export type GestureAxis = "vertical" | "horizontal" | "free";
export type GesturePriority = 1 | 2 | 3;

export interface GestureZone {
    id: string;
    /** Where this gesture lives in the viewport */
    location: "fullscreen" | "top" | "bottom" | "center" | "edges";
    /** Primary gesture axis */
    axis: GestureAxis;
    /** Priority (1 = highest, 3 = lowest) */
    priority: GesturePriority;
    /** Whether this gesture blocks other gestures when active */
    exclusive: boolean;
    /** Distance threshold in px before gesture activates */
    activationThreshold: number;
}

// ─── GESTURE REGISTRY ─────────────────────────────────
export const GESTURE_ZONES: GestureZone[] = [
    {
        id: "page-scroll",
        location: "fullscreen",
        axis: "vertical",
        priority: 3,
        exclusive: false,
        activationThreshold: 5,
    },
    {
        id: "sheet-drag",
        location: "bottom",
        axis: "vertical",
        priority: 1,
        exclusive: true,
        activationThreshold: 10,
    },
    {
        id: "horizontal-scroll",
        location: "center",
        axis: "horizontal",
        priority: 1,
        exclusive: false,
        activationThreshold: 5,
    },
    {
        id: "swipe-back",
        location: "edges",
        axis: "horizontal",
        priority: 1,
        exclusive: true,
        activationThreshold: 20,
    },
    {
        id: "modal-dismiss",
        location: "top",
        axis: "vertical",
        priority: 2,
        exclusive: true,
        activationThreshold: 30,
    },
    {
        id: "carousel-swipe",
        location: "center",
        axis: "horizontal",
        priority: 2,
        exclusive: false,
        activationThreshold: 10,
    },
    {
        id: "pull-to-refresh",
        location: "top",
        axis: "vertical",
        priority: 2,
        exclusive: true,
        activationThreshold: 40,
    },
];

// ─── CONFLICT DETECTION ────────────────────────────────

export interface GestureConflict {
    gestureA: string;
    gestureB: string;
    /** Whether both share the same axis */
    sameAxis: boolean;
    /** Whether both could be active simultaneously */
    conflict: boolean;
    /** Recommended resolution */
    resolution: string;
}

/**
 * Detect all potential gesture conflicts in the registry.
 */
export function detectGestureConflicts(): GestureConflict[] {
    const conflicts: GestureConflict[] = [];

    for (let i = 0; i < GESTURE_ZONES.length; i++) {
        for (let j = i + 1; j < GESTURE_ZONES.length; j++) {
            const a = GESTURE_ZONES[i];
            const b = GESTURE_ZONES[j];

            const sameAxis = a.axis === b.axis || a.axis === "free" || b.axis === "free";
            const conflict = sameAxis &&
                (a.location === "fullscreen" || b.location === "fullscreen" ||
                    a.location === b.location);

            if (conflict) {
                const resolution = a.priority < b.priority
                    ? `"${a.id}" takes priority over "${b.id}"`
                    : `"${b.id}" takes priority over "${a.id}"`;

                conflicts.push({
                    gestureA: a.id,
                    gestureB: b.id,
                    sameAxis,
                    conflict,
                    resolution,
                });
            }
        }
    }

    return conflicts;
}

// ─── GESTURE GUARD ─────────────────────────────────────

/**
 * Determine if a gesture should be allowed given the current state
 * of other active gestures.
 */
export function isGestureAllowed(
    gestureId: string,
    activeGestures: string[],
): boolean {
    const gesture = GESTURE_ZONES.find((z) => z.id === gestureId);
    if (!gesture) return false;

    // Non-exclusive gestures are always allowed alongside others
    if (!gesture.exclusive) return true;

    // Check if any higher-priority exclusive gesture is active
    for (const activeId of activeGestures) {
        if (activeId === gestureId) continue;
        const active = GESTURE_ZONES.find((z) => z.id === activeId);
        if (active && active.priority < gesture.priority && active.exclusive) {
            return false;
        }
    }

    return true;
}

// ─── DERIVED CONSTANTS ─────────────────────────────────

export const GESTURE_CONFIG = {
    /** Maximum angle from vertical to be considered vertical swipe (degrees) */
    verticalThreshold: 30,
    /** Maximum angle from horizontal to be considered horizontal swipe (degrees) */
    horizontalThreshold: 30,
    /** Time window for swipe detection (ms) */
    swipeTimeWindow: 300,
    /** Minimum velocity for swipe detection (px/ms) */
    swipeMinVelocity: 0.3,
} as const;
