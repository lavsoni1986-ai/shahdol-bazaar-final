// 🛡️ BHARAT-OS: SOVEREIGN MEDIA-TYPE GOVERNANCE
// Centralized media classification, detection heuristics, and rendering rules.
// Every image in the system MUST resolve through this governance layer.
//
// 🏛️ ARCHITECTURE:
//   MediaType         → detected via aspect-ratio heuristics
//   MediaGovernance   → static rule set for each MediaType
//   useMediaDetection → hook that returns governance for a given image src
//
// ⚠️ RULES:
//   - NEVER fullscreen commerce media
//   - NEVER viewport-dominating posters
//   - NEVER layout collapse on broken uploads
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Wrench, Cpu, Shirt, Apple, HeartPulse, Sparkles, ShoppingBag, type LucideIcon } from "lucide-react";

// ─── MEDIA TYPE ───────────────────────────────────────────
export type MediaType =
    | "product"         // phones, electronics, groceries, food items
    | "poster"          // doctor posters, vertical pamphlets, announcements
    | "flyer"           // wedding flyers, promotional ads, horizontal handouts
    | "portrait"        // person/doctor portraits, headshots
    | "storefront"      // shop exteriors, clinic signage, restaurant fronts
    | "banner"          // wide promo banners, hero graphics, event banners
    | "logo"            // brand logos, store logos
    // ── SEMANTIC ENTITY-SPECIFIC TYPES ──
    | "doctor_banner"   // doctor/clinic hero images — 16:9, bounded
    | "hospital_banner" // hospital/medical facility images
    | "restaurant_cover" // restaurant/food cover images
    | "service_poster"  // service provider vertical posters
    | "education_banner" // school/college banners
    | "marketplace_card"; // generic marketplace entity card images

// ─── GOVERNANCE RULES ─────────────────────────────────────

export interface MediaGovernance {
    /** Human-readable label for debugging */
    label: string;
    /** CSS aspect ratio class */
    aspectClass: string;
    /** object-contain vs object-cover */
    containStrategy: "contain" | "cover";
    /** Maximum viewport height fraction */
    maxHeightClass: string;
    /** Minimum height to prevent collapse */
    minHeightClass: string;
    /** Inner padding for the img element */
    paddingClass: string;
    /** Container background treatment */
    backgroundClass: string;
    /** Border radius class */
    borderRadiusClass: string;
    /** Border class */
    borderClass: string;
    /** Horizontal/vertical alignment of the image within container */
    objectPositionClass: string;
}

/**
 * Canonical governance rules for each media type.
 * These are STATIC — no runtime computation.
 */
export const MEDIA_GOVERNANCE: Record<MediaType, MediaGovernance> = {
    // ── PRODUCT MODE ──────────────────────────────────────
    // Best for: phones, electronics, groceries, food items
    // Strategy: square container, contain with padding, bounded height
    product: {
        label: "product",
        aspectClass: "aspect-square",
        containStrategy: "contain",
        maxHeightClass: "max-h-[48vh]",
        minHeightClass: "min-h-[280px]",
        paddingClass: "p-2",
        backgroundClass: "bg-white/[0.03]",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── POSTER MODE ───────────────────────────────────────
    // Best for: doctor posters, vertical pamphlets, announcements
    // Strategy: 3:4 portrait container, contain with padding, darker background
    // NEVER viewport-dominating — max-height is capped lower
    poster: {
        label: "poster",
        aspectClass: "aspect-[3/4]",
        containStrategy: "contain",
        maxHeightClass: "max-h-[42vh]",
        minHeightClass: "min-h-[300px]",
        paddingClass: "p-3",
        backgroundClass: "bg-black/40",
        borderRadiusClass: "rounded-3xl",
        borderClass: "border border-white/10",
        objectPositionClass: "object-center",
    },

    // ── FLYER MODE ────────────────────────────────────────
    // Best for: wedding flyers, promotional ads, horizontal handouts
    // Strategy: 4:3 container, contain, moderate height cap
    flyer: {
        label: "flyer",
        aspectClass: "aspect-[4/3]",
        containStrategy: "contain",
        maxHeightClass: "max-h-[44vh]",
        minHeightClass: "min-h-[260px]",
        paddingClass: "p-3",
        backgroundClass: "bg-black/30",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/10",
        objectPositionClass: "object-center",
    },

    // ── PORTRAIT MODE ─────────────────────────────────────
    // Best for: person/doctor portraits, headshots
    // Strategy: 3:4 portrait, contain, vertical emphasis, lighter background
    portrait: {
        label: "portrait",
        aspectClass: "aspect-[3/4]",
        containStrategy: "contain",
        maxHeightClass: "max-h-[50vh]",
        minHeightClass: "min-h-[300px]",
        paddingClass: "p-2",
        backgroundClass: "bg-white/[0.05]",
        borderRadiusClass: "rounded-3xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-top",
    },

    // ── STOREFRONT MODE ───────────────────────────────────
    // Best for: shop exteriors, clinic signage, restaurant fronts
    // Strategy: 16:9 landscape, cover (crop to frame), lower height
    storefront: {
        label: "storefront",
        aspectClass: "aspect-video",
        containStrategy: "cover",
        maxHeightClass: "max-h-[36vh]",
        minHeightClass: "min-h-[200px]",
        paddingClass: "",
        backgroundClass: "bg-zinc-800",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── BANNER MODE ───────────────────────────────────────
    // Best for: wide promo banners, hero graphics, event banners
    // Strategy: 3.2:1 ultra-wide, contain, very short, dark background
    banner: {
        label: "banner",
        aspectClass: "aspect-[16/5]",
        containStrategy: "contain",
        maxHeightClass: "max-h-[30vh]",
        minHeightClass: "min-h-[160px]",
        paddingClass: "p-2",
        backgroundClass: "bg-black/30",
        borderRadiusClass: "rounded-xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── LOGO MODE ─────────────────────────────────────────
    // Best for: brand logos, store logos
    // Strategy: square, contain with generous padding, transparent background
    logo: {
        label: "logo",
        aspectClass: "aspect-square",
        containStrategy: "contain",
        maxHeightClass: "max-h-[32vh]",
        minHeightClass: "min-h-[200px]",
        paddingClass: "p-6",
        backgroundClass: "bg-transparent",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── DOCTOR BANNER ─────────────────────────────────────
    // Best for: doctor/clinic hero images
    // Strategy: 16:9 landscape, cover, bounded — NOT viewport-dominating
    doctor_banner: {
        label: "doctor_banner",
        aspectClass: "aspect-[16/9]",
        containStrategy: "cover",
        maxHeightClass: "max-h-[36vh]",
        minHeightClass: "min-h-[200px]",
        paddingClass: "",
        backgroundClass: "bg-zinc-800",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── HOSPITAL BANNER ───────────────────────────────────
    // Best for: hospital/medical facility images
    // Strategy: 16:9 cover, slightly taller than doctor
    hospital_banner: {
        label: "hospital_banner",
        aspectClass: "aspect-[16/9]",
        containStrategy: "cover",
        maxHeightClass: "max-h-[40vh]",
        minHeightClass: "min-h-[220px]",
        paddingClass: "",
        backgroundClass: "bg-zinc-800",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── RESTAURANT COVER ─────────────────────────────────
    // Best for: restaurant/food cover images
    // Strategy: 4:3 landscape, cover, vibrant treatment
    restaurant_cover: {
        label: "restaurant_cover",
        aspectClass: "aspect-[4/3]",
        containStrategy: "cover",
        maxHeightClass: "max-h-[38vh]",
        minHeightClass: "min-h-[220px]",
        paddingClass: "",
        backgroundClass: "bg-zinc-800",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── SERVICE POSTER ────────────────────────────────────
    // Best for: service provider vertical posters
    // Strategy: 3:4 portrait, contain, capped lower than portrait mode
    service_poster: {
        label: "service_poster",
        aspectClass: "aspect-[3/4]",
        containStrategy: "contain",
        maxHeightClass: "max-h-[40vh]",
        minHeightClass: "min-h-[240px]",
        paddingClass: "p-3",
        backgroundClass: "bg-black/30",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/10",
        objectPositionClass: "object-center",
    },

    // ── EDUCATION BANNER ──────────────────────────────────
    // Best for: school/college banners
    // Strategy: 16:9 cover, clean background
    education_banner: {
        label: "education_banner",
        aspectClass: "aspect-[16/9]",
        containStrategy: "cover",
        maxHeightClass: "max-h-[34vh]",
        minHeightClass: "min-h-[180px]",
        paddingClass: "",
        backgroundClass: "bg-zinc-800",
        borderRadiusClass: "rounded-2xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },

    // ── MARKETPLACE CARD ──────────────────────────────────
    // Best for: generic marketplace entity card images
    // Strategy: 1:1 square, contain with padding, compact
    marketplace_card: {
        label: "marketplace_card",
        aspectClass: "aspect-square",
        containStrategy: "contain",
        maxHeightClass: "max-h-[32vh]",
        minHeightClass: "min-h-[160px]",
        paddingClass: "p-1",
        backgroundClass: "bg-white/[0.03]",
        borderRadiusClass: "rounded-xl",
        borderClass: "border border-white/5",
        objectPositionClass: "object-center",
    },
};

// ─── IMAGE FALLBACK GOVERNANCE ──────────────────────────

export interface ImageFallbackConfig {
    gradient: string;
    icon: LucideIcon;
}

export const CATEGORY_FALLBACK_MAP: Record<string, ImageFallbackConfig> = {
    auto: { gradient: "from-amber-600/20 via-zinc-800/80 to-zinc-950", icon: Wrench },
    bike: { gradient: "from-amber-600/20 via-zinc-800/80 to-zinc-950", icon: Wrench },
    repair: { gradient: "from-amber-600/20 via-zinc-800/80 to-zinc-950", icon: Wrench },
    automotive: { gradient: "from-amber-600/20 via-zinc-800/80 to-zinc-950", icon: Wrench },
    vehicle: { gradient: "from-amber-600/20 via-zinc-800/80 to-zinc-950", icon: Wrench },
    motorcycle: { gradient: "from-amber-600/20 via-zinc-800/80 to-zinc-950", icon: Wrench },
    
    electronic: { gradient: "from-blue-600/20 via-zinc-800/80 to-zinc-950", icon: Cpu },
    mobile: { gradient: "from-blue-600/20 via-zinc-800/80 to-zinc-950", icon: Cpu },
    phone: { gradient: "from-blue-600/20 via-zinc-800/80 to-zinc-950", icon: Cpu },
    tv: { gradient: "from-blue-600/20 via-zinc-800/80 to-zinc-950", icon: Cpu },
    computer: { gradient: "from-blue-600/20 via-zinc-800/80 to-zinc-950", icon: Cpu },
    appliance: { gradient: "from-blue-600/20 via-zinc-800/80 to-zinc-950", icon: Cpu },
    tech: { gradient: "from-blue-600/20 via-zinc-800/80 to-zinc-950", icon: Cpu },
    
    fashion: { gradient: "from-rose-600/20 via-zinc-800/80 to-zinc-950", icon: Shirt },
    clothing: { gradient: "from-rose-600/20 via-zinc-800/80 to-zinc-950", icon: Shirt },
    shirt: { gradient: "from-rose-600/20 via-zinc-800/80 to-zinc-950", icon: Shirt },
    wear: { gradient: "from-rose-600/20 via-zinc-800/80 to-zinc-950", icon: Shirt },
    shoe: { gradient: "from-rose-600/20 via-zinc-800/80 to-zinc-950", icon: Shirt },
    apparel: { gradient: "from-rose-600/20 via-zinc-800/80 to-zinc-950", icon: Shirt },
    jewel: { gradient: "from-rose-600/20 via-zinc-800/80 to-zinc-950", icon: Shirt },
    
    grocery: { gradient: "from-emerald-600/20 via-zinc-800/80 to-zinc-950", icon: Apple },
    food: { gradient: "from-emerald-600/20 via-zinc-800/80 to-zinc-950", icon: Apple },
    vegetable: { gradient: "from-emerald-600/20 via-zinc-800/80 to-zinc-950", icon: Apple },
    fruit: { gradient: "from-emerald-600/20 via-zinc-800/80 to-zinc-950", icon: Apple },
    kirana: { gradient: "from-emerald-600/20 via-zinc-800/80 to-zinc-950", icon: Apple },
    eat: { gradient: "from-emerald-600/20 via-zinc-800/80 to-zinc-950", icon: Apple },
    drink: { gradient: "from-emerald-600/20 via-zinc-800/80 to-zinc-950", icon: Apple },
    
    health: { gradient: "from-red-600/20 via-zinc-800/80 to-zinc-950", icon: HeartPulse },
    medicine: { gradient: "from-red-600/20 via-zinc-800/80 to-zinc-950", icon: HeartPulse },
    doctor: { gradient: "from-red-600/20 via-zinc-800/80 to-zinc-950", icon: HeartPulse },
    pharmacy: { gradient: "from-red-600/20 via-zinc-800/80 to-zinc-950", icon: HeartPulse },
    hospital: { gradient: "from-red-600/20 via-zinc-800/80 to-zinc-950", icon: HeartPulse },
    medical: { gradient: "from-red-600/20 via-zinc-800/80 to-zinc-950", icon: HeartPulse },
    
    service: { gradient: "from-cyan-600/20 via-zinc-800/80 to-zinc-950", icon: Sparkles },
    consult: { gradient: "from-cyan-600/20 via-zinc-800/80 to-zinc-950", icon: Sparkles },
    clean: { gradient: "from-cyan-600/20 via-zinc-800/80 to-zinc-950", icon: Sparkles },
    pest: { gradient: "from-cyan-600/20 via-zinc-800/80 to-zinc-950", icon: Sparkles },
};

export const DEFAULT_FALLBACK: ImageFallbackConfig = {
    gradient: "from-zinc-800/80 to-zinc-950/90",
    icon: ShoppingBag,
};

export function isLowEndAndroidDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes("android");
    if (!isAndroid) return false;
    
    const lowMemory = (navigator as any).deviceMemory !== undefined && (navigator as any).deviceMemory <= 3;
    const lowCPU = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
    
    return lowMemory || lowCPU || ua.includes("mobile");
}

export function resolveCategoryFallback(categoryName?: string | null): ImageFallbackConfig {
    const isLowEnd = isLowEndAndroidDevice();

    if (!categoryName) {
        return {
            gradient: isLowEnd ? "bg-zinc-900" : DEFAULT_FALLBACK.gradient,
            icon: DEFAULT_FALLBACK.icon
        };
    }
    
    const normalized = categoryName.toLowerCase();
    const matchedKey = Object.keys(CATEGORY_FALLBACK_MAP).find(key => normalized.includes(key));
    
    if (matchedKey) {
        const config = CATEGORY_FALLBACK_MAP[matchedKey];
        if (isLowEnd) {
            let solidBg = "bg-zinc-900";
            if (matchedKey === "auto" || matchedKey === "bike" || matchedKey === "repair" || matchedKey === "automotive" || matchedKey === "vehicle" || matchedKey === "motorcycle") {
                solidBg = "bg-amber-950/40";
            } else if (matchedKey === "electronic" || matchedKey === "mobile" || matchedKey === "phone" || matchedKey === "tv" || matchedKey === "computer" || matchedKey === "appliance" || matchedKey === "tech") {
                solidBg = "bg-blue-950/40";
            } else if (matchedKey === "fashion" || matchedKey === "clothing" || matchedKey === "shirt" || matchedKey === "wear" || matchedKey === "shoe" || matchedKey === "apparel" || matchedKey === "jewel") {
                solidBg = "bg-rose-950/40";
            } else if (matchedKey === "grocery" || matchedKey === "food" || matchedKey === "vegetable" || matchedKey === "fruit" || matchedKey === "kirana" || matchedKey === "eat" || matchedKey === "drink") {
                solidBg = "bg-emerald-950/40";
            } else if (matchedKey === "health" || matchedKey === "medicine" || matchedKey === "doctor" || matchedKey === "pharmacy" || matchedKey === "hospital" || matchedKey === "medical") {
                solidBg = "bg-red-950/40";
            } else if (matchedKey === "service" || matchedKey === "consult" || matchedKey === "clean" || matchedKey === "pest") {
                solidBg = "bg-cyan-950/40";
            }
            return {
                gradient: solidBg,
                icon: config.icon
            };
        }
        return config;
    }
    
    return {
        gradient: isLowEnd ? "bg-zinc-900" : DEFAULT_FALLBACK.gradient,
        icon: DEFAULT_FALLBACK.icon
    };
}

export interface GovernedImageState {
    src: string | null;
    isFallback: boolean;
    fallbackConfig: ImageFallbackConfig;
    imgLoaded: boolean;
    imageError: boolean;
    shouldLoad: boolean;
    containerRef: (node: HTMLElement | null) => void;
    handleLoad: () => void;
    handleError: () => void;
}

export function useGovernedImage(
    initialSrc: string | null | undefined,
    categoryName?: string | null,
    options?: { lazy?: boolean; rootMargin?: string }
): GovernedImageState {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isVisible, setIsVisible] = useState(!options?.lazy);
    
    const observerRef = useRef<IntersectionObserver | null>(null);
    const elementRef = useRef<HTMLElement | null>(null);
    
    const containerRef = useCallback((node: HTMLElement | null) => {
        if (!options?.lazy) return;
        
        if (elementRef.current && observerRef.current) {
            observerRef.current.unobserve(elementRef.current);
        }
        
        elementRef.current = node;
        
        if (node) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        if (observerRef.current) {
                            observerRef.current.disconnect();
                        }
                    }
                },
                { rootMargin: options?.rootMargin || "200px" }
            );
            observer.observe(node);
            observerRef.current = observer;
        }
    }, [options?.lazy, options?.rootMargin]);
    
    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);
    
    const handleLoad = useCallback(() => {
        setImgLoaded(true);
    }, []);
    
    const handleError = useCallback(() => {
        setHasError(true);
    }, []);
    
    const isFallback = !initialSrc || hasError;
    const fallbackConfig = useMemo(() => resolveCategoryFallback(categoryName), [categoryName]);
    const src = isFallback ? null : (initialSrc ?? null);
    
    return useMemo(() => ({
        src: isVisible ? src : null,
        isFallback,
        fallbackConfig,
        imgLoaded,
        imageError: hasError,
        shouldLoad: isVisible,
        containerRef,
        handleLoad,
        handleError,
    }), [src, isFallback, fallbackConfig, imgLoaded, hasError, isVisible, containerRef, handleLoad, handleError]);
}

// ─── CANONICAL REACT COMPONENTS FOR CENTRALIZED RENDER ───

export interface GovernedFallbackProps {
    config: ImageFallbackConfig;
    name?: string | null;
    className?: string;
    iconClassName?: string;
}

export const GovernedFallback = React.memo(function GovernedFallback({
    config,
    name,
    className = "",
    iconClassName = "w-10 h-10 text-white",
}: GovernedFallbackProps) {
    const Icon = config.icon;
    const isLowEnd = isLowEndAndroidDevice();
    const bgClass = isLowEnd ? config.gradient : `bg-gradient-to-br ${config.gradient}`;
    const firstLetter = name ? name.trim().charAt(0).toUpperCase() : null;

    return React.createElement(
        "div",
        { className: `w-full h-full flex flex-col items-center justify-center ${bgClass} ${className}` },
        React.createElement(
            "div",
            { className: "flex flex-col items-center gap-1.5 opacity-60" },
            firstLetter 
                ? React.createElement("span", { className: "text-white font-black text-xl leading-none select-none" }, firstLetter)
                : React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(Icon, { className: iconClassName }),
                    React.createElement("span", { className: "text-[10px] font-black uppercase tracking-widest text-white/50 leading-none" }, "No Image")
                )
        )
    );
});

export interface GovernedImageProps {
    src: string | null | undefined;
    alt: string;
    categoryName?: string | null;
    aspectRatioHint?: "square" | "4/3" | "16/9";
    contextHint?: string;
    className?: string;
    imgClassName?: string;
    lazy?: boolean;
    name?: string | null;
}

export const GovernedImage = React.memo(function GovernedImage({
    src,
    alt,
    categoryName,
    aspectRatioHint = "square",
    contextHint,
    className = "",
    imgClassName = "",
    lazy = true,
    name,
}: GovernedImageProps) {
    const { src: imgUrl, isFallback, fallbackConfig, imgLoaded, imageError, containerRef, handleLoad, handleError } = useGovernedImage(src, categoryName, { lazy });
    const { governance } = useMediaDetection(isFallback ? null : imgUrl, aspectRatioHint, contextHint);

    const isLowEnd = isLowEndAndroidDevice();

    const containerClasses = [
        "relative w-full overflow-hidden flex items-center justify-center",
        governance.aspectClass,
        governance.minHeightClass,
        governance.maxHeightClass,
        governance.borderRadiusClass,
        governance.borderClass,
        governance.backgroundClass,
        className
    ].filter(Boolean).join(" ");

    const imageClasses = [
        "w-full h-full",
        governance.containStrategy === "contain" ? "object-contain" : "object-cover",
        governance.paddingClass,
        governance.objectPositionClass,
        !isLowEnd && "transition-all duration-300",
        imgLoaded ? "opacity-100 scale-100" : (isLowEnd ? "opacity-100" : "opacity-0 scale-95"),
        imgClassName
    ].filter(Boolean).join(" ");

    return React.createElement(
        "div",
        { ref: containerRef as any, className: containerClasses },
        isFallback
            ? React.createElement(GovernedFallback, { config: fallbackConfig, name, iconClassName: "w-8 h-8 text-white" })
            : React.createElement(
                React.Fragment,
                null,
                // 🛡️ Phase 3A Fix: Never render <img src="">.
                // When imgUrl is null (lazy + not yet in viewport), render only the
                // skeleton placeholder. The img element is created only once we have
                // a real URL, eliminating the empty-string src console warning.
                !imgUrl
                    ? React.createElement(
                        "div",
                        { className: "absolute inset-0 bg-zinc-800/60 animate-pulse flex items-center justify-center" },
                        React.createElement("div", { className: "w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" })
                    )
                    : React.createElement(
                        React.Fragment,
                        null,
                        !imgLoaded && !isLowEnd && React.createElement(
                            "div",
                            { className: "absolute inset-0 bg-zinc-800/60 animate-pulse flex items-center justify-center" },
                            React.createElement("div", { className: "w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" })
                        ),
                        React.createElement("img", {
                            src: imgUrl,
                            alt: alt,
                            loading: lazy ? "lazy" : "eager",
                            decoding: "async",
                            onLoad: handleLoad,
                            onError: handleError,
                            className: imageClasses
                        })
                    )
            ),
        import.meta.env.DEV && React.createElement(
            "span",
            { className: MEDIA_DEBUG_BADGE_CLASS },
            `${governance.label} ${isFallback ? "(fallback)" : ""}`
        )
    );
});

// ─── DEFAULT GOVERNANCE (before detection completes) ─────

/**
 * Get the default governance based on the aspectRatio hint.
 * This is used as a first-pass until the actual image loads.
 */
export function getDefaultGovernance(hint?: "square" | "4/3" | "16/9"): MediaGovernance {
    // Map hints to media types
    if (hint === "square") return MEDIA_GOVERNANCE.product;
    if (hint === "16/9") return MEDIA_GOVERNANCE.storefront;
    return MEDIA_GOVERNANCE.flyer; // 4/3 default
}

// ─── DETECTION HEURISTICS ────────────────────────────────

/**
 * Aspect ratio thresholds for deterministic media type detection.
 * Pure math — NO AI, NO unstable guessing.
 *
 * aspectRatio = width / height (natural dimensions)
 *
 * Threshold map:
 *   < 0.8        → poster/portrait (very tall)
 *   0.8 – 1.3    → product (nearly square)
 *   1.31 – 1.69  → flyer (moderate wide)
 *   1.7 – 2.4    → storefront (wide)
 *   2.41 – 6     → banner (ultra-wide)
 *   > 6          → banner (anchor as banner)
 */
const ASPECT_RATIO_THRESHOLDS = {
    POSTER_MAX: 0.79,
    PRODUCT_MIN: 0.8,
    PRODUCT_MAX: 1.3,
    FLYER_MAX: 1.69,
    STOREFRONT_MIN: 1.7,
    STOREFRONT_MAX: 2.4,
    BANNER_MAX: 6,
} as const;

/**
 * Deterministic media type detection from natural aspect ratio.
 *
 * @param aspectRatio - naturalWidth / naturalHeight
 * @param contextHint - optional hint from component context (e.g., "doctor" for portrait bias)
 * @returns detected MediaType
 */
export function detectMediaType(aspectRatio: number, contextHint?: string): MediaType {
    // If we have context that this is a doctor/clinic image, bias toward portrait/poster
    if (contextHint) {
        const hint = contextHint.toLowerCase();
        if (hint.includes("doctor") || hint.includes("clinic") || hint.includes("hospital")) {
            // For very tall doctor images → poster
            if (aspectRatio < ASPECT_RATIO_THRESHOLDS.PRODUCT_MIN) return "poster";
            // For nearly square doctor images → portrait
            if (aspectRatio <= ASPECT_RATIO_THRESHOLDS.PRODUCT_MAX) return "portrait";
            // Wider doctor images → storefront
            return "storefront";
        }
    }

    // Pure aspect-ratio-based detection
    if (aspectRatio < ASPECT_RATIO_THRESHOLDS.POSTER_MAX) {
        // Very tall → poster (could be portrait, but poster is safer bounded container)
        return "poster";
    }

    if (aspectRatio >= ASPECT_RATIO_THRESHOLDS.PRODUCT_MIN && aspectRatio <= ASPECT_RATIO_THRESHOLDS.PRODUCT_MAX) {
        // Nearly square → product
        return "product";
    }

    if (aspectRatio > ASPECT_RATIO_THRESHOLDS.PRODUCT_MAX && aspectRatio <= ASPECT_RATIO_THRESHOLDS.FLYER_MAX) {
        // Moderate wide → flyer
        return "flyer";
    }

    if (aspectRatio >= ASPECT_RATIO_THRESHOLDS.STOREFRONT_MIN && aspectRatio <= ASPECT_RATIO_THRESHOLDS.STOREFRONT_MAX) {
        // Wide → storefront
        return "storefront";
    }

    if (aspectRatio > ASPECT_RATIO_THRESHOLDS.STOREFRONT_MAX && aspectRatio <= ASPECT_RATIO_THRESHOLDS.BANNER_MAX) {
        // Ultra-wide → banner
        return "banner";
    }

    // > 6:1 — extremely wide, treat as banner
    return "banner";
}

// ─── HOOK: MEDIA DETECTION ──────────────────────────────

interface MediaDetectionResult {
    /** The detected media type */
    mediaType: MediaType;
    /** The natural aspect ratio (width/height) */
    aspectRatio: number | null;
    /** Whether detection has completed */
    isDetected: boolean;
    /** The resolved governance rules */
    governance: MediaGovernance;
}

/**
 * React hook that detects the media type of an image by loading it
 * in a background Image() and measuring its natural dimensions.
 *
 * Usage:
 *   const { mediaType, governance, isDetected } = useMediaDetection(src);
 *
 * @param src - image source URL
 * @param hint - optional aspect ratio hint for first pass
 * @param contextHint - optional contextual hint (e.g., "doctor")
 */
export function useMediaDetection(
    src: string | null | undefined,
    hint?: "square" | "4/3" | "16/9",
    contextHint?: string
): MediaDetectionResult {
    const [mediaType, setMediaType] = useState<MediaType>("product");
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const [isDetected, setIsDetected] = useState(false);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!src) {
            setIsDetected(false);
            setAspectRatio(null);
            return;
        }

        setIsDetected(false);

        const img = new Image();
        imageRef.current = img;

        img.onload = () => {
            if (!mountedRef.current) return;
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const ratio = h > 0 ? w / h : 1;
            setAspectRatio(ratio);
            const detected = detectMediaType(ratio, contextHint);
            setMediaType(detected);
            setIsDetected(true);
        };

        img.onerror = () => {
            if (!mountedRef.current) return;
            setAspectRatio(null);
            setIsDetected(false);
        };

        img.src = src;

        return () => {
            img.onload = null;
            img.onerror = null;
            imageRef.current = null;
        };
    }, [src, contextHint]);

    // Resolve governance — use detected or fall back to hint-based default
    const governance = isDetected
        ? MEDIA_GOVERNANCE[mediaType]
        : getDefaultGovernance(hint);

    return {
        mediaType: isDetected ? mediaType : (hint === "square" ? "product" : hint === "16/9" ? "storefront" : "product"),
        aspectRatio,
        isDetected,
        governance,
    };
}

// ─── CSS CLASS RESOLVER ─────────────────────────────────

/**
 * Build a complete className string from a MediaGovernance config.
 * This is the primary rendering interface — all image containers use this.
 */
export function resolveMediaClasses(governance: MediaGovernance): string {
    const { aspectClass, maxHeightClass, minHeightClass, backgroundClass, borderRadiusClass, borderClass } = governance;
    return [
        "relative w-full overflow-hidden",
        aspectClass,
        maxHeightClass,
        minHeightClass,
        backgroundClass,
        borderRadiusClass,
        borderClass,
    ].filter(Boolean).join(" ");
}

/**
 * Build the className string for the <img> element from governance.
 */
export function resolveImageClasses(governance: MediaGovernance, loaded: boolean): string {
    const { containStrategy, paddingClass, objectPositionClass } = governance;
    const objectClass = containStrategy === "contain" ? "object-contain" : "object-cover";
    const isLowEnd = isLowEndAndroidDevice();
    return [
        "w-full h-full",
        !isLowEnd && "transition-all duration-500",
        objectClass,
        paddingClass,
        objectPositionClass,
        loaded ? "opacity-100 scale-100" : (isLowEnd ? "opacity-100" : "opacity-0 scale-95"),
    ].filter(Boolean).join(" ");
}

// ─── DEV DEBUG OVERLAY CLASSES ──────────────────────────

/**
 * CSS class string for the dev-only debug badge.
 * Used by MediaDebugBadge component (in .tsx files) or directly.
 * Empty string in production.
 */
export const MEDIA_DEBUG_BADGE_CLASS = import.meta.env.DEV
    ? "absolute top-2 left-2 z-20 bg-black/80 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/10 pointer-events-none select-none"
    : "";
