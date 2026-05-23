// 🏛️ BHARAT-OS: SOVEREIGN DESIGN SYSTEM — PUBLIC API
// Single import for ALL design governance.
// Usage: import { tokens, typography, motion, grid } from "@/design";

export * from "./tokens";
export * from "./typography";
export * from "./motion";
export * from "./media";
export * from "./accessibility";
export * from "./breakpoints";
export * from "./grid";
export * from "./surfaces";

// ─── DESIGN SYSTEM VERSION ──────────────────────────────
export const DESIGN_SYSTEM_VERSION = "1.0.0";
export const DESIGN_SYSTEM_NAME = "BharatOS Sovereign Design System";

// ─── CONVENIENCE RE-EXPORTS ─────────────────────────────
// Most commonly used items lifted to top level for ergonomic imports.

import { spacing, radii, shadows, colors, fontWeights, zIndex } from "./tokens";
export { spacing, radii, shadows, colors, fontWeights, zIndex };

import { typography as type, getTypographyClasses, type TypographyLevel } from "./typography";
export { type as typography, getTypographyClasses, type TypographyLevel };

import { duration, easing, skeleton, interaction, getTransitionClass, getHoverClass } from "./motion";
export { duration, easing, skeleton, interaction, getTransitionClass, getHoverClass };

import media from "./media";
import { getImageContainerClasses, getImageElementClasses, getSizingConstraints } from "./media";
import type { ImageOrientation, ImageContent } from "./media";
export { media, getImageContainerClasses, getImageElementClasses, getSizingConstraints };
export type { ImageOrientation, ImageContent };

import { getAccessibleButtonClasses, getAccessibleInputClasses, touchTarget, contrast, buttonHeights, focusStyles } from "./accessibility";
export { getAccessibleButtonClasses, getAccessibleInputClasses, touchTarget, contrast, buttonHeights, focusStyles };

import { getGridContainerClasses, getGridColumns, getEqualHeightClasses, getSectionWrapperClasses, type GridPreset } from "./grid";
export { getGridContainerClasses, getGridColumns, getEqualHeightClasses, getSectionWrapperClasses, type GridPreset };

import { getSurfaceClasses, getElevationClasses, getDividerClasses, type SurfacePreset } from "./surfaces";
export { getSurfaceClasses, getElevationClasses, getDividerClasses, type SurfacePreset };
