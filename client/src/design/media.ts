// 🏛️ BHARAT-OS: MEDIA INTELLIGENCE LAYER
// Intelligent image rendering — detect image type and apply proper strategy.
// No image explosions. No awkward crops. Preserve merchant uploads safely.
// Commerce-first presentation for ALL image types.

// ─── IMAGE TYPE DETECTION ───────────────────────────────

export type ImageOrientation = "square" | "portrait" | "landscape" | "unknown";
export type ImageContent = "product" | "logo" | "banner" | "poster" | "unknown";

export interface ImageAnalysis {
    orientation: ImageOrientation;
    aspectRatio: number;
    width: number;
    height: number;
    isSquare: boolean;
    isPortrait: boolean;
    isLandscape: boolean;
}

/**
 * Analyze image dimensions and orientation.
 * Use this BEFORE rendering to choose the best display strategy.
 */
export function analyzeImage(
    width: number,
    height: number
): ImageAnalysis {
    const aspectRatio = width / height;
    const threshold = 0.15; // tolerance for "square"

    return {
        orientation:
            Math.abs(aspectRatio - 1) < threshold
                ? "square"
                : aspectRatio > 1
                    ? "landscape"
                    : "portrait",
        aspectRatio,
        width,
        height,
        isSquare: Math.abs(aspectRatio - 1) < threshold,
        isPortrait: aspectRatio < 1 - threshold,
        isLandscape: aspectRatio > 1 + threshold,
    };
}

// ─── RENDER STRATEGIES ──────────────────────────────────

export type RenderStrategy = "contain" | "cover" | "fill";

/**
 * Get the optimal CSS object-fit strategy for a given image type and context.
 *
 * - products: contain (show full product, no crop)
 * - logos: contain (show full logo)
 * - banners: cover (fill space, crop edges)
 * - posters: contain (show full poster)
 * - default: contain (safe fallback)
 */
export function getRenderStrategy(
    content: ImageContent = "unknown",
    orientation: ImageOrientation = "unknown"
): RenderStrategy {
    if (content === "banner") return "cover";
    if (content === "product" && orientation === "landscape") return "contain";
    if (content === "logo") return "contain";
    return "contain"; // safe default — no awkward crops
}

// ─── ASPECT RATIO HELPERS ───────────────────────────────

export type AspectRatioPreset = "1/1" | "4/3" | "3/2" | "16/9" | "2/1" | "auto";

/**
 * Get the optimal aspect ratio class for an image.
 * - Products: 1/1 (square) for consistency
 * - Banners: 16/9 or 2/1
 * - Logos: auto (respect original)
 * - Default: 1/1 (safe commerce grid)
 */
export function getAspectRatioClass(
    content: ImageContent = "unknown",
    variant: "card" | "hero" | "thumbnail" | "detail" = "card"
): string {
    if (variant === "hero") return "aspect-[16/9] md:aspect-[2/1]";
    if (variant === "thumbnail") return "aspect-square";
    if (variant === "detail") return "aspect-square max-h-[320px]";

    // card default
    if (content === "banner") return "aspect-[16/9]";
    if (content === "logo") return "aspect-auto";
    return "aspect-square"; // commerce default
}

// ─── SIZING CONSTRAINTS ─────────────────────────────────

export interface SizingConstraints {
    /** Max height on mobile */
    mobileMaxHeight: string;
    /** Max height on desktop */
    desktopMaxHeight: string;
    /** Width should fill container? */
    fullWidth: boolean;
    /** Object fit strategy */
    objectFit: RenderStrategy;
    /** Padding to prevent edge-to-edge */
    padding: string;
}

/**
 * Get sizing constraints for an image variant.
 * Prevents image explosions while preserving content.
 */
export function getSizingConstraints(
    variant: "card" | "hero" | "thumbnail" | "detail"
): SizingConstraints {
    const constraints: Record<string, SizingConstraints> = {
        card: {
            mobileMaxHeight: "200px",
            desktopMaxHeight: "320px",
            fullWidth: true,
            objectFit: "contain",
            padding: "p-1",
        },
        hero: {
            mobileMaxHeight: "300px",
            desktopMaxHeight: "500px",
            fullWidth: true,
            objectFit: "contain",
            padding: "p-2",
        },
        thumbnail: {
            mobileMaxHeight: "80px",
            desktopMaxHeight: "100px",
            fullWidth: false,
            objectFit: "contain",
            padding: "p-0.5",
        },
        detail: {
            mobileMaxHeight: "320px",
            desktopMaxHeight: "480px",
            fullWidth: true,
            objectFit: "contain",
            padding: "p-2",
        },
    };
    return constraints[variant] || constraints.card;
}

// ─── FALLBACK HANDLING ──────────────────────────────────

/**
 * Get fallback display for broken/missing images.
 * Returns Tailwind classes for graceful degradation.
 */
export function getImageFallbackClasses(
    content: ImageContent = "unknown"
): string {
    const fallbacks: Record<ImageContent, string> = {
        product: "bg-gradient-to-br from-orange-500/10 to-zinc-800/50",
        logo: "bg-gradient-to-br from-zinc-800 to-zinc-900",
        banner: "bg-gradient-to-br from-orange-500/5 to-zinc-800/30",
        poster: "bg-gradient-to-br from-zinc-800 to-zinc-900",
        unknown: "bg-gradient-to-br from-orange-500/10 to-zinc-800/50",
    };
    return fallbacks[content] || fallbacks.unknown;
}

// ─── RESPONSIVE IMAGE SIZES ─────────────────────────────

/**
 * Generate srcSet-compatible sizes string for responsive images.
 */
export function getResponsiveSizes(
    variant: "card" | "hero" | "thumbnail" | "detail"
): string {
    const sizes: Record<string, string> = {
        card: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
        hero: "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 75vw",
        thumbnail: "80px",
        detail: "(max-width: 640px) 100vw, 50vw",
    };
    return sizes[variant];
}

// ─── LOADING STRATEGY ───────────────────────────────────

export type LoadingStrategy = "lazy" | "eager";

/**
 * Determine loading strategy based on image position.
 * Above-fold = eager, below-fold = lazy.
 */
export function getLoadingStrategy(
    isAboveFold: boolean = false,
    variant: "card" | "hero" | "thumbnail" | "detail" = "card"
): LoadingStrategy {
    if (isAboveFold) return "eager";
    if (variant === "hero") return "eager";
    return "lazy";
}

// ─── TAILWIND CLASS GENERATORS ──────────────────────────

/**
 * Generate complete Tailwind class string for an image container.
 * This is the primary API for image rendering across all components.
 */
export function getImageContainerClasses(
    variant: "card" | "hero" | "thumbnail" | "detail" = "card",
    content: ImageContent = "unknown"
): string {
    const constraints = getSizingConstraints(variant);
    const aspectClass = getAspectRatioClass(content, variant);
    const fallbackClass = getImageFallbackClasses(content);

    return [
        "relative overflow-hidden",
        aspectClass,
        constraints.fullWidth ? "w-full" : "",
        fallbackClass,
        constraints.padding,
    ]
        .filter(Boolean)
        .join(" ");
}

/**
 * Generate Tailwind classes for the actual <img> element.
 */
export function getImageElementClasses(
    variant: "card" | "hero" | "thumbnail" | "detail" = "card"
): string {
    const constraints = getSizingConstraints(variant);

    return [
        "w-full h-full",
        `object-${constraints.objectFit}`,
        "transition-transform duration-500 group-hover:scale-105",
    ].join(" ");
}

export default {
    analyzeImage,
    getRenderStrategy,
    getAspectRatioClass,
    getSizingConstraints,
    getImageFallbackClasses,
    getResponsiveSizes,
    getLoadingStrategy,
    getImageContainerClasses,
    getImageElementClasses,
};
