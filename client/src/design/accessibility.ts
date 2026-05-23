// 🏛️ BHARAT-OS: ACCESSIBILITY HARDENING
// District-scale usability for non-technical users, older merchants,
// weak devices, poor lighting, and budget Android phones.
// ALL touch targets, contrast ratios, and readability must meet these baselines.

import { spacingValues, radii } from "./tokens";

// ─── TOUCH TARGET SIZES ─────────────────────────────────
// Minimum 44x44dp for touch targets (Android Material Design guideline)

export const touchTarget = {
    /** Minimum touch target for critical CTAs (Add to Cart, Buy, Submit) */
    critical: "min-h-[48px] min-w-[48px]",
    /** Standard touch target for buttons, links, taps */
    standard: "min-h-[44px] min-w-[44px]",
    /** Compact touch target for icon buttons (with sufficient padding) */
    compact: "min-h-[36px] min-w-[36px]",
    /** Minimum padding around touchable content */
    padding: "p-3",
    /** Touchable area for inline links/text */
    inlinePadding: "px-2 py-1",
} as const;

// ─── SPACING AROUND TOUCH TARGETS ──────────────────────
export const touchSpacing = {
    /** Minimum gap between touchable elements */
    betweenElements: `gap-${spacingValues.tight / 4}`,
    /** Padding inside touchable area to ensure 44px */
    inner: "p-3",
    /** Minimum margin from screen edges */
    edgeMargin: "mx-auto max-w-[calc(100vw-16px)]",
} as const;

// ─── CONTRAST RATIOS ────────────────────────────────────
// WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text
// Our dark theme provides naturally good contrast with orange accent.

export const contrast = {
    /** Primary text on dark background — white #fff on #030005 */
    primaryText: "text-white",
    /** Secondary text — muted gray */
    secondaryText: "text-zinc-400",
    /** Accent text — orange for emphasis */
    accentText: "text-orange-400",
    /** CTA text — white on orange background */
    ctaText: "text-white",
    /** Disabled text — dimmed but still readable */
    disabledText: "text-zinc-600",
    /** Labels — always high contrast */
    labelText: "text-zinc-300",
    /** Error text — high contrast red */
    errorText: "text-red-400",
    /** Success text — high contrast green */
    successText: "text-emerald-400",
} as const;

// ─── BUTTON HEIGHT GUIDELINES ───────────────────────────
export const buttonHeights = {
    /** Primary action (Add to Cart, Buy Now) */
    primary: "h-12 md:h-14",
    /** Secondary action (View Details, Learn More) */
    secondary: "h-10 md:h-12",
    /** Small action (icon buttons, compact CTAs) */
    small: "h-9 md:h-10",
    /** Pill/stretched link button */
    pill: "h-11 md:h-12",
} as const;

// ─── FOCUS INDICATORS ───────────────────────────────────
export const focusStyles = {
    /** Visible focus ring for keyboard navigation */
    ring: "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-black",
    /** Subtle focus for inputs */
    input: "focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30",
    /** No visible focus (for custom components with their own state) */
    none: "focus:outline-none",
} as const;

// ─── READABILITY FOR OLDER USERS ────────────────────────
export const readability = {
    /** Minimum font size for body text — never below this */
    minBodySize: "text-sm",
    /** Line height for paragraphs — generous for dyslexic readers */
    bodyLeading: "leading-relaxed",
    /** Paragraph spacing for clarity */
    paragraphGap: "space-y-3",
    /** Maximum line length for readability */
    maxLineLength: "max-w-prose",
    /** Text should never be too small */
    minLabelSize: "text-[10px]",
} as const;

// ─── LOW-LIGHT USABILITY ────────────────────────────────
export const lowLight = {
    /** Buttons need sufficient contrast in dark environments */
    buttonContrast: "shadow-lg",
    /** Cards should have visible borders */
    cardBorder: "border border-white/10",
    /** Text on glass surfaces needs backdrop blur */
    glassText: "backdrop-blur-sm",
} as const;

// ─── ANIMATION REDUCED MOTION ───────────────────────────
export const reducedMotion = {
    /** Respect user's OS-level reduced motion preference */
    mediaQuery: "@media (prefers-reduced-motion: reduce)",
    /** Disable animations when reduced motion is preferred */
    disableAnimations: "motion-reduce:animate-none motion-reduce:transition-none",
    /** Still show subtle transitions */
    safeTransition: "motion-reduce:transition-opacity",
} as const;

// ─── LOADING STATE READABILITY ──────────────────────────
export const loadingAccessibility = {
    /** Skeleton elements must have aria-hidden */
    skeletonAria: "aria-hidden='true'",
    /** Loading spinners need visible labels */
    spinnerLabel: "sr-only",
    /** Loading text needs sufficient size */
    loadingText: "text-sm text-zinc-400",
} as const;

// ─── ANDROID VIEWPORT SAFETY ────────────────────────────
export const androidSafety = {
    /** Prevent text size inflation on Android */
    textAdjust: "[-webkit-text-size-adjust:100%]",
    /** Safe bottom padding for navigation bar */
    safeBottom: "pb-[max(env(safe-area-inset-bottom),16px)]",
    /** Safe top padding for status bar */
    safeTop: "pt-[max(env(safe-area-inset-top),16px)]",
    /** Prevent tap highlight on Android */
    tapHighlight: "[-webkit-tap-highlight-color:transparent]",
} as const;

// ─── SEMANTIC HTML HELPERS ──────────────────────────────
export const semanticRoles = {
    /** Product cards should be articles */
    productCard: "article",
    /** Navigation should be nav */
    navigation: "nav",
    /** Main content should be main */
    main: "main",
    /** Complementary content (sidebar, related) */
    complementary: "complementary",
    /** Live region for dynamic content */
    liveRegion: "aria-live='polite'",
} as const;

// ─── ARIA LABEL HELPERS ─────────────────────────────────
export const ariaLabels = {
    addToCart: "Add to cart",
    whatasapp: "Contact on WhatsApp",
    callSeller: "Call seller",
    productImage: (name: string) => `Image of ${name}`,
    storeLogo: (name: string) => `${name} store logo`,
    closeModal: "Close",
    searchProducts: "Search products",
    openCart: "Open shopping cart",
    viewDetails: "View details",
};

// ─── TAILWIND CLASS GENERATORS ──────────────────────────

/**
 * Get touch target minimum size classes based on button role.
 */
export function getTouchTargetClasses(importance: "critical" | "standard" | "compact"): string {
    return touchTarget[importance];
}

/**
 * Get accessible button classes combining touch target + focus + readability.
 */
export function getAccessibleButtonClasses(importance: "critical" | "standard" | "compact" = "standard"): string {
    return [
        getTouchTargetClasses(importance),
        focusStyles.ring,
        lowLight.buttonContrast,
        reducedMotion.disableAnimations,
        androidSafety.tapHighlight,
    ].join(" ");
}

/**
 * Get accessible input classes.
 */
export function getAccessibleInputClasses(): string {
    return [
        touchTarget.standard,
        focusStyles.input,
        androidSafety.tapHighlight,
    ].join(" ");
}

export default {
    touchTarget,
    touchSpacing,
    contrast,
    buttonHeights,
    focusStyles,
    readability,
    lowLight,
    reducedMotion,
    loadingAccessibility,
    androidSafety,
    semanticRoles,
    ariaLabels,
    getTouchTargetClasses,
    getAccessibleButtonClasses,
    getAccessibleInputClasses,
};
