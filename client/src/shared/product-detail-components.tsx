// 🛡️ BHARAT-OS: SOVEREIGN PRODUCT DETAIL COMPONENTS
// Shared building blocks for product detail pages across all themes.
// Ensures consistent image governance, loading states, and layout rhythm.

import { memo, useState, useCallback, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, ShieldCheck, MapPin, Star, Store, MessageCircle, Phone, Clock, Zap, Package, Calendar, CalendarCheck, GraduationCap, UtensilsCrossed, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { productRoutes, getCurrentDistrictSlug } from "@/shared/routing/sovereign-routes";
import { SovereignTrustBadge, type TrustLevel } from "@/components/shared/SovereignTrustBadge";
import { SAFE_AREAS } from "@/design/safe-area";
import {
    useMediaDetection,
    resolveMediaClasses,
    resolveImageClasses,
    MEDIA_GOVERNANCE,
    type MediaGovernance,
    type MediaType,
} from "@/design/media-governance";
import { resolveEntityCTAs, hasCommerceDisplay, CTA_METADATA } from "@/governance";

// ─── 1. PRODUCT IMAGE WITH GOVERNANCE ─────────────────────

interface ProductImageProps {
    src: string;
    alt: string;
    /** Aspect ratio hint used before media detection completes */
    aspectRatio?: "square" | "4/3" | "16/9";
    maxHeight?: number;
    onError?: () => void;
    priority?: boolean;
    /** Contextual hint for media detection bias (e.g., "doctor", "clinic", "storefront") */
    contextHint?: string;
    /** Whether to enable runtime media type detection (default: true) */
    enableDetection?: boolean;
    /** Manually override detected media type */
    forceMediaType?: MediaType;
}

export function ProductImage({
    src,
    alt,
    aspectRatio = "4/3",
    maxHeight,
    onError,
    priority = false,
    contextHint,
    enableDetection = true,
    forceMediaType,
}: ProductImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    // Media governance detection
    const {
        governance,
        mediaType,
        isDetected,
    } = useMediaDetection(enableDetection ? src : null, aspectRatio, contextHint);

    // Allow manual override — uses statically imported MEDIA_GOVERNANCE
    const activeGovernance: MediaGovernance = forceMediaType
        ? MEDIA_GOVERNANCE[forceMediaType]
        : governance;

    const containerClasses = resolveMediaClasses(activeGovernance);
    const imageClasses = resolveImageClasses(activeGovernance, loaded);

    return (
        <div className={cn(containerClasses, maxHeight ? "" : "")}>
            {/* 🛡️ Dev debug badge */}
            {import.meta.env.DEV && isDetected && (
                <span className="absolute top-2 left-2 z-20 bg-black/80 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/10 pointer-events-none select-none">
                    {mediaType}
                </span>
            )}

            {/* Loading skeleton */}
            {!loaded && !error && (
                <div className="absolute inset-0 z-10 bg-zinc-800/40 animate-pulse flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                </div>
            )}

            {/* Error fallback */}
            {error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60">
                    <div className="text-center opacity-50">
                        <Package className="w-10 h-10 text-white mx-auto mb-2" />
                        <span className="text-label font-semibold text-white/60">Image unavailable</span>
                    </div>
                </div>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    loading={priority ? "eager" : "lazy"}
                    onLoad={() => setLoaded(true)}
                    onError={() => {
                        setError(true);
                        onError?.();
                    }}
                    className={imageClasses}
                    style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
                />
            )}
        </div>
    );
}

// ─── 2. LOADING SKELETON ──────────────────────────────────

export function ProductDetailSkeleton() {
    return (
        <div className="min-h-screen bg-sovereign-bg">
            {/* 🛡️ Header skeleton removed — Layout.tsx owns the header */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                    {/* Image skeleton */}
                    <div className="space-y-4">
                        <Skeleton className="aspect-square w-full rounded-2xl bg-white/5" />
                        <div className="flex gap-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="w-16 h-16 rounded-xl bg-white/5" />
                            ))}
                        </div>
                    </div>

                    {/* Content skeleton */}
                    <div className="space-y-6">
                        <Skeleton className="h-5 w-24 bg-white/5 rounded-full" />
                        <Skeleton className="h-10 w-3/4 bg-white/5 rounded-lg" />
                        <Skeleton className="h-5 w-1/2 bg-white/5 rounded-lg" />
                        <div className="flex gap-3">
                            <Skeleton className="h-12 w-32 bg-white/5 rounded-xl" />
                            <Skeleton className="h-12 w-24 bg-white/5 rounded-xl" />
                        </div>
                        <div className="flex gap-3">
                            <Skeleton className="h-6 w-28 bg-white/5 rounded-full" />
                            <Skeleton className="h-6 w-28 bg-white/5 rounded-full" />
                            <Skeleton className="h-6 w-28 bg-white/5 rounded-full" />
                        </div>
                        <Skeleton className="h-24 w-full bg-white/5 rounded-xl" />
                        <Skeleton className="h-14 w-full bg-white/5 rounded-xl" />
                        <Skeleton className="h-32 w-full bg-white/5 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── 3. PRICING STACK ─────────────────────────────────────

interface PricingStackProps {
    price: number;
    originalPrice?: number | null;
    discountPercent?: number;
    deliveryInfo?: string | null;
    availability?: string | null;
}

export function PricingStack({
    price,
    originalPrice,
    discountPercent,
    deliveryInfo,
    availability,
}: PricingStackProps) {
    return (
        <div className="space-y-3">
            {/* Main price display */}
            <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl md:text-5xl font-black text-white">
                    ₹{price.toLocaleString("en-IN")}
                </span>
                {originalPrice && originalPrice > price && (
                    <>
                        <span className="text-lg line-through text-zinc-500">
                            ₹{originalPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                            {discountPercent || Math.round((1 - price / originalPrice) * 100)}% OFF
                        </span>
                    </>
                )}
            </div>

            {/* Delivery & availability */}
            {(deliveryInfo || availability) && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    {deliveryInfo && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/15">
                            <Zap className="w-3.5 h-3.5" />
                            {deliveryInfo}
                        </span>
                    )}
                    {availability && (
                        <span className="inline-flex items-center gap-1.5 text-zinc-400 font-medium bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Clock className="w-3.5 h-3.5" />
                            {availability}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── 4. TRUST BADGE ROW ───────────────────────────────────

interface TrustBadgeRowProps {
    trustLevel?: TrustLevel;
    dsslScore?: number | null;
    deliveryGuarantee?: boolean;
    returnGuarantee?: boolean;
    /** Entity kind for governance-driven badge rendering (default: product) */
    entityKind?: string;
}

export function TrustBadgeRow({
    trustLevel = "none",
    dsslScore,
    deliveryGuarantee = true,
    returnGuarantee = true,
    entityKind = "product",
}: TrustBadgeRowProps) {
    // 🏛️ Commerce badges only for commerce-capable entities
    const isCommerce = hasCommerceDisplay(entityKind as any) || entityKind === "product";

    return (
        <div className="flex flex-wrap items-center gap-2.5 py-2">
            {/* DSSL Sovereign Trust Badge */}
            <SovereignTrustBadge level={trustLevel} dsslScore={dsslScore ?? undefined} size="md" />

            {/* Cash on Delivery — ONLY for commerce entities */}
            {isCommerce && deliveryGuarantee && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-label font-bold text-orange-400 uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    Cash on Delivery
                </span>
            )}

            {/* Return Guarantee — ONLY for commerce entities */}
            {isCommerce && returnGuarantee && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-label font-bold text-emerald-400 uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    7-Day Return
                </span>
            )}
        </div>
    );

}

// ─── 5. PRIMARY CTA GROUP ─────────────────────────────────

interface PrimaryCTAGroupProps {
    onAddToCart: () => void;
    onWhatsApp?: () => void;
    onCall?: () => void;
    /** Entity kind for governance-driven CTA labels (default: product) */
    entityKind?: string;
    disabled?: boolean;
    stock?: number;
    sellerPhone?: string;
    productName?: string;
    productPrice?: string;
}

export function PrimaryCTAGroup({
    onAddToCart,
    onWhatsApp,
    onCall,
    entityKind = "product",
    disabled = false,
    stock,
    sellerPhone,
    productName,
    productPrice,
}: PrimaryCTAGroupProps) {
    const isOutOfStock = stock !== undefined && stock <= 0;

    // 🏛️ Governance-driven CTA labels
    const ctas = resolveEntityCTAs({ kind: entityKind as any });
    const primaryCTA = ctas.policy.primaryCTA === "add_to_cart" ? CTA_METADATA.add_to_cart.label : ctas.primaryCTA.label;
    const whatsappLabel = CTA_METADATA.whatsapp.label;
    const callLabel = CTA_METADATA.call_now.label;

    const handleWhatsApp = () => {
        if (onWhatsApp) {
            onWhatsApp();
            return;
        }
        const phone = (sellerPhone || "").replace(/\D/g, "");
        if (!phone) return;
        const message = encodeURIComponent(
            `Hi, I'm interested in ${productName || "this product"} - ₹${productPrice || ""}. Please confirm availability.`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    };

    const handleCall = () => {
        if (onCall) {
            onCall();
            return;
        }
        const phone = (sellerPhone || "").replace(/\D/g, "");
        if (phone) window.open(`tel:${phone}`, "_blank");
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Main actions grid */}
            <div className="grid grid-cols-3 gap-2.5">
                {/* 🏛️ Primary CTA — governance-driven */}
                {isOutOfStock ? (
                    <Button
                        disabled
                        className="col-span-1 border border-zinc-600 text-zinc-500 bg-transparent cursor-not-allowed py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                        Out of Stock
                    </Button>
                ) : (
                    <Button
                        onClick={onAddToCart}
                        disabled={disabled}
                        className="col-span-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98]"
                    >
                        <ShoppingCart className="w-4 h-4 mr-1.5" />
                        {primaryCTA}
                    </Button>
                )}

                {/* WhatsApp */}
                <Button
                    onClick={handleWhatsApp}
                    disabled={!sellerPhone}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all active:scale-[0.98]"
                >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    {whatsappLabel}
                </Button>

                {/* Call */}
                <Button
                    onClick={handleCall}
                    disabled={!sellerPhone}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98]"
                >
                    <Phone className="w-4 h-4 mr-1.5" />
                    {callLabel}
                </Button>
            </div>
        </div>
    );
}


// ─── 6. SELLER INFO CARD ──────────────────────────────────

interface SellerInfoCardProps {
    name: string;
    address?: string | null;
    phone?: string | null;
    mapsLink?: string | null;
    trustLevel?: TrustLevel;
    dsslScore?: number | null;
    onViewMap?: () => void;
}

export function SellerInfoCard({
    name,
    address,
    phone,
    mapsLink,
    trustLevel = "none",
    dsslScore,
    onViewMap,
}: SellerInfoCardProps) {
    const handleMap = () => {
        if (onViewMap) {
            onViewMap();
            return;
        }
        const url = mapsLink || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null);
        if (url) window.open(url, "_blank");
    };

    return (
        <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 space-y-3 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{name}</h3>
                    <SovereignTrustBadge level={trustLevel} dsslScore={dsslScore ?? undefined} size="sm" />
                </div>
            </div>

            {address && (
                <div className="flex items-start gap-2 text-sm text-zinc-400">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" />
                    <span className="leading-relaxed">{address}</span>
                </div>
            )}

            <div className="flex gap-2 pt-1">
                {(address || mapsLink) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMap}
                        className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs rounded-xl"
                    >
                        <MapPin className="w-3.5 h-3.5 mr-1.5" />
                        View on Map
                    </Button>
                )}
                {phone && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`tel:${phone.replace(/\D/g, "")}`, "_blank")}
                        className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs rounded-xl"
                    >
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        Call
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─── 7. SECTION WRAPPER ──────────────────────────────────

export function DetailSection({
    title,
    icon,
    children,
    className,
}: {
    title?: string;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("p-5 bg-white/[0.03] rounded-2xl border border-white/5 space-y-3", className)}>
            {title && (
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
                    {icon && <span className="text-orange-400">{icon}</span>}
                    {title}
                </h3>
            )}
            {children}
        </div>
    );
}

// ─── 8. RELATED PRODUCTS ──────────────────────────────────

interface RelatedProduct {
    id: number | string;
    title: string;
    name?: string;
    price: number | string;
    imageUrl?: string | null;
    image?: string | null;
    slug?: string | null;
    category?: string | { name: string } | null;
    discount?: number | null;
}

interface RelatedProductsProps {
    products: RelatedProduct[];
    title?: string;
}

export function RelatedProducts({
    products,
    title = "Related Products",
}: RelatedProductsProps) {
    if (!products || products.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-black text-white">{title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.slice(0, 8).map((product) => {
                    const imageSrc = product.imageUrl || product.image || null;
                    const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
                    const categoryName = typeof product.category === "object" && product.category
                        ? (product.category as { name: string }).name || "General"
                        : product.category || "General";

                    return (
                        <Link
                            key={product.id}
                            href={productRoutes.detail(getCurrentDistrictSlug(), product.slug || product.id.toString())}
                            className="group flex flex-col rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] hover:border-orange-500/30 transition-all hover:bg-white/[0.04]"
                        >
                            <div className="aspect-square relative overflow-hidden bg-zinc-900/60">
                                {imageSrc ? (
                                    <img
                                        src={imageSrc}
                                        alt={product.title || product.name || "Product"}
                                        loading="lazy"
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 p-2"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-30">
                                        <Package className="w-8 h-8 text-white" />
                                    </div>
                                )}
                                {product.discount && product.discount > 0 && (
                                    <span className="absolute top-1.5 left-1.5 bg-gradient-to-r from-rose-600 to-orange-500 text-white text-caption font-black px-1.5 py-0.5 rounded-md">
                                        -{product.discount}%
                                    </span>
                                )}
                            </div>
                            <div className="p-2.5 space-y-1">
                                <p className="text-caption font-black uppercase tracking-[0.15em] text-orange-400/60 truncate">
                                    {categoryName}
                                </p>
                                <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-orange-400 transition-colors">
                                    {product.title || product.name || "Product"}
                                </h3>
                                <span className="text-sm font-black text-white">
                                    ₹{price.toLocaleString("en-IN")}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// ─── 9. STICKY MOBILE CTA ────────────────────────────────

interface StickyMobileCTAProps {
    price: number;
    onAddToCart: () => void;
    onWhatsApp: () => void;
    showWhatsApp?: boolean;
    disabled?: boolean;
    stock?: number;
    /** Entity kind for governance-driven label (default: product) */
    entityKind?: string;
}

export function StickyMobileCTA({
    price,
    onAddToCart,
    onWhatsApp,
    showWhatsApp = true,
    disabled = false,
    stock,
    entityKind = "product",
}: StickyMobileCTAProps) {
    const isOutOfStock = stock !== undefined && stock <= 0;

    // 🏛️ Governance-driven CTA label — no longer hardcoded to "Add to Cart"
    // Resolves correctly for ALL entity kinds: product → "Add to Cart", service → "Book Service", etc.
    const ctas = resolveEntityCTAs({ kind: entityKind as any });
    const ctaLabel = ctas.primaryCTA.label;
    const ctaIcon = ctas.primaryCTA.icon;

    return (
        <div
            className="fixed md:hidden left-0 right-0 z-[70] bg-black/95 backdrop-blur-xl border-t border-white/10 p-3"
            style={{ bottom: `${SAFE_AREAS.bottomNav + 12}px` }}
        >
            <div className="flex items-center gap-3">
                <div className="flex flex-col shrink-0">
                    <span className="text-xs text-zinc-400 font-medium">Total</span>
                    <span className="text-lg font-black text-white">₹{price.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex-1 flex gap-2">
                    {showWhatsApp && !isOutOfStock && (
                        <Button
                            onClick={onWhatsApp}
                            disabled={disabled}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg"
                        >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            WhatsApp
                        </Button>
                    )}
                    {isOutOfStock ? (
                        <Button
                            disabled
                            className="flex-1 border border-zinc-600 text-zinc-500 bg-transparent cursor-not-allowed py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
                        >
                            Out of Stock
                        </Button>
                    ) : (
                        <Button
                            onClick={onAddToCart}
                            disabled={disabled}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98]"
                        >
                            <ShoppingCart className="w-4 h-4 mr-1.5" />
                            {ctaLabel}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}


