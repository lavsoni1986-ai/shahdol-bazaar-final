// 🛡️ BHARAT-OS: CANONICAL SOVEREIGN PRODUCT CARD
// Single source of truth for ALL product card variants across BharatOS commerce surfaces.
// Every product card — homepage, marketplace, search, feed, featured — must use this.
// NO fragmented card systems allowed.
//
// 🏛️ Design Token Compliance:
//   - All radii use `rounded-xl`/`rounded-2xl`/`rounded-3xl` (NO arbitrary `rounded-[...]`)
//   - All text sizes use semantic Tailwind classes (NO arbitrary `text-[...]`)
//   - All shadows use `shadow-lg`/`shadow-xl`/`shadow-2xl` (NO arbitrary `shadow-[...]`)
//   - All spacing uses consistent Tailwind scale

import { memo, useState, useCallback } from "react";
import { ShoppingCart, Star, Clock, Phone, MessageCircle, Calendar, Navigation } from "lucide-react";
import { Link } from "wouter";
import { productRoutes, getCurrentDistrictSlug } from "@/shared/routing/sovereign-routes";
import { SovereignTrustBadge, resolveTrustLevel, type TrustLevel } from "./SovereignTrustBadge";
import { GovernedImage } from "@/design/media-governance";
import { resolveEntityExperience, resolveEntityCTAs, type InteractionMode } from "@/governance";
import { trackEvent } from "@/lib/analytics";

// ─── TYPES ───────────────────────────────────────────────

export type ProductCardVariant = "compact" | "marketplace" | "featured" | "search" | "feed";

export interface ProductCardData {
    id: number | string;
    title: string;
    name?: string;
    price: number | string;
    mrp?: number | string | null;
    imageUrl?: string | null;
    image?: string | null;
    category?: string | { name: string } | null;
    slug?: string | null;
    isTrending?: boolean;
    isSponsored?: boolean;
    discount?: number | null;
    sellerName?: string;
    sellerSlug?: string;
    sellerVerified?: boolean;
    dsslScore?: number | null;
    district?: string;
    deliveryInfo?: string;
    rating?: number | null;
    reviewCount?: number | null;
}

interface SovereignProductCardProps {
    data: ProductCardData;
    variant?: ProductCardVariant;
    vendor?: { isVerified?: boolean; dsslScore?: number | null } | null;
    onTrack?: (action: string, id: string | number) => void;
    className?: string;
}

// ─── HELPERS ─────────────────────────────────────────────

function computeDiscount(price: number, mrp: number): number {
    if (mrp <= 0 || price >= mrp) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
}

function formatPrice(val: string | number): string {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-IN");
}

function getCategoryLabel(category: string | { name: string } | undefined | null): string {
    if (!category) return "General";
    if (typeof category === "string") return category;
    return category.name || "General";
}

function getTitle(data: ProductCardData): string {
    return data.title || data.name || "Product";
}

function getPrimaryImage(data: ProductCardData): string | null {
    return data.imageUrl || data.image || null;
}

// ─── IMAGE COMPONENT & FALLBACKS CENTRALIZED IN MEDIA-GOVERNANCE ───

// ─── BADGE HELPERS ───────────────────────────────────────

function DiscountBadge({ percent }: { percent: number }) {
    if (percent <= 0) return null;
    return (
        <span className="absolute top-3 left-3 bg-gradient-to-r from-rose-600 to-orange-500 text-white text-label font-black px-2.5 py-1 rounded-xl shadow-lg border border-white/10">
            -{percent}%
        </span>
    );
}

function TrendingBadge() {
    return (
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-orange-500/90 text-white text-caption font-black px-2 py-1 rounded-xl backdrop-blur-sm border border-orange-400/30 shadow-lg">
            <Star className="w-2.5 h-2.5 fill-white" /> TRENDING
        </span>
    );
}

// ─── SKELETON ─────────────────────────────────────────────

function ProductCardSkeleton({ variant }: { variant: ProductCardVariant }) {
    if (variant === "compact") {
        return (
            <div className="animate-pulse bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                <div className="aspect-[4/3] bg-white/5" />
                <div className="p-3 space-y-2">
                    <div className="h-2 bg-white/5 rounded w-1/3" />
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-pulse bg-white/5 rounded-3xl overflow-hidden border border-white/5">
            <div className="aspect-square bg-white/5" />
            <div className="p-4 space-y-3">
                <div className="h-2 bg-white/5 rounded w-1/4" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-9 bg-white/5 rounded-xl" />
            </div>
        </div>
    );
}

export { ProductCardSkeleton };

// ─── MAIN CARD COMPONENT ─────────────────────────────────

export const SovereignProductCard = memo(function SovereignProductCard({
    data,
    variant = "marketplace",
    vendor,
    onTrack,
    className = "",
}: SovereignProductCardProps) {
    const title = getTitle(data);
    const categoryName = getCategoryLabel(data.category);


    const price = typeof data.price === "string" ? parseFloat(data.price) : data.price;
    const mrp = data.mrp ? (typeof data.mrp === "string" ? parseFloat(data.mrp) : data.mrp) : null;
    const discount = data.discount ?? (mrp && mrp > price ? computeDiscount(price, mrp) : 0);
    const trustLevel: TrustLevel = resolveTrustLevel(vendor ?? { isVerified: data.sellerVerified, dsslScore: data.dsslScore });
    const route = productRoutes.detail(getCurrentDistrictSlug(), data.slug || data.id.toString());

    // 🏛️ Governance-driven CTA resolution — product entity
    const ctaCTX = resolveEntityCTAs({ kind: "product" });
    const ctaLabel = ctaCTX.primaryCTA.label; // "Add to Cart"
    const ctaIcon = ctaCTX.primaryCTA.icon;   // "ShoppingCart"

    const handleClick = () => {
        onTrack?.("click", data.id);
    };


    // ── SEARCH VARIANT ──
    if (variant === "search") {
        return (
            <Link
                href={route}
                className={`group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-orange-500/40 hover:bg-white/10 ${className}`}
                onClick={handleClick}
            >
                <GovernedImage
                    src={getPrimaryImage(data)}
                    alt={title}
                    categoryName={categoryName}
                    aspectRatioHint="square"
                    className="w-16 h-16 rounded-xl flex-shrink-0"
                    imgClassName="p-0.5"
                />

                <div className="min-w-0 flex-1">
                    <p className="text-label font-black uppercase tracking-[0.2em] text-orange-400/70">
                        {categoryName}
                    </p>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">
                        {title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-black text-white">₹{formatPrice(price)}</span>
                        {mrp && mrp > price && (
                            <span className="text-xs text-zinc-500 line-through">₹{formatPrice(mrp)}</span>
                        )}
                    </div>
                </div>

                <SovereignTrustBadge level={trustLevel} size="sm" className="flex-shrink-0" />
            </Link>
        );
    }

    // ── COMPACT VARIANT ──
    if (variant === "compact") {
        return (
            <Link
                href={route}
                className={`group block relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 transition hover:border-orange-500/40 hover:bg-white/10 ${className}`}
                onClick={handleClick}
            >
                <div className="relative">
                    <GovernedImage
                        src={getPrimaryImage(data)}
                        alt={title}
                        categoryName={categoryName}
                        aspectRatioHint="4/3"
                        className="w-full"
                    />
                    {discount > 0 && <DiscountBadge percent={discount} />}
                </div>

                <div className="p-3 space-y-1">
                    <p className="text-caption font-black uppercase tracking-[0.15em] text-orange-400/70 truncate">
                        {categoryName}
                    </p>
                    <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {title}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-white">₹{formatPrice(price)}</span>
                        {mrp && mrp > price && (
                            <span className="text-label text-zinc-500 line-through">₹{formatPrice(mrp)}</span>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    // ── FEATURED VARIANT ──
    if (variant === "featured") {
        return (
            <Link
                href={route}
                className={`group relative flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] transition-all duration-300 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20 ${className}`}
                onClick={handleClick}
            >
                {/* Image section — dominant */}
                <div className="relative">
                    <GovernedImage
                        src={getPrimaryImage(data)}
                        alt={title}
                        categoryName={categoryName}
                        aspectRatioHint="4/3"
                        className="w-full rounded-t-3xl border-0"
                    />

                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                        {discount > 0 && <DiscountBadge percent={discount} />}
                        {data.isTrending && <TrendingBadge />}
                    </div>

                    {/* Gradient fade to content */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 gap-2">
                    {/* Category */}
                    <div className="flex items-center justify-between">
                        <span className="text-label font-black uppercase tracking-[0.2em] text-orange-500/80">
                            {categoryName}
                        </span>
                        <SovereignTrustBadge level={trustLevel} size="sm" />
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
                        {title}
                    </h3>

                    {/* Seller */}
                    {data.sellerName && (
                        <p className="text-bodySmall text-zinc-400">
                            by <span className="text-zinc-300 font-semibold">{data.sellerName}</span>
                        </p>
                    )}

                    {/* District intelligence */}
                    {data.district && (
                        <p className="flex items-center gap-1 text-label text-emerald-400/70 font-medium">
                            <Clock className="w-3 h-3" />
                            {data.deliveryInfo || `Available in ${data.district}`}
                        </p>
                    )}

                    {/* Pricing stack */}
                    <div className="mt-auto flex items-baseline gap-2 pt-2">
                        <span className="text-xl font-black text-white">₹{formatPrice(price)}</span>
                        {mrp && mrp > price && (
                            <>
                                <span className="text-sm text-zinc-500 line-through">₹{formatPrice(mrp)}</span>
                                <span className="text-xs font-bold text-emerald-400">{discount}% off</span>
                            </>
                        )}
                    </div>

                    {/* Rating */}
                    {data.rating != null && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <div className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span className="font-semibold text-white">{data.rating.toFixed(1)}</span>
                            </div>
                            {data.reviewCount != null && (
                                <span className="text-zinc-500">({data.reviewCount})</span>
                            )}
                        </div>
                    )}

                    {/* 🏛️ CTA — governed by canonical resolver */}
                    <button className="mt-2 w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-bodySmall font-black uppercase tracking-[0.1em] transition-all active:scale-[0.98] shadow-lg shadow-orange-600/20">
                        {ctaLabel}
                    </button>

                </div>
            </Link>
        );
    }

    // ── FEED VARIANT ──
    if (variant === "feed") {
        return (
            <Link
                href={route}
                className={`group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-orange-500/40 hover:bg-white/10 ${className}`}
                onClick={handleClick}
            >
                <GovernedImage
                    src={getPrimaryImage(data)}
                    alt={title}
                    categoryName={categoryName}
                    aspectRatioHint="square"
                    className="w-24 h-24 rounded-2xl flex-shrink-0"
                />

                <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-caption font-black uppercase tracking-[0.15em] text-orange-400/70">
                            {categoryName}
                        </span>
                        {discount > 0 && (
                            <span className="text-caption font-black text-emerald-400">{discount}% off</span>
                        )}
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-orange-400 transition-colors">
                        {title}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-base font-black text-white">₹{formatPrice(price)}</span>
                        {mrp && mrp > price && (
                            <span className="text-xs text-zinc-500 line-through">₹{formatPrice(mrp)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <SovereignTrustBadge level={trustLevel} size="sm" />
                        {data.district && (
                            <span className="text-caption text-emerald-400/60 font-medium">{data.deliveryInfo || data.district}</span>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    // ── DEFAULT: MARKETPLACE VARIANT ──
    return (
        <Link
            href={route}
            className={`group relative flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-orange-500/50 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-orange-500/10 ${className}`}
            onClick={handleClick}
        >
            {/* 🖼️ IMAGE — primary commerce anchor */}
            <div className="relative">
                <GovernedImage
                    src={getPrimaryImage(data)}
                    alt={title}
                    categoryName={categoryName}
                    aspectRatioHint="square"
                    className="w-full max-h-[260px] sm:max-h-none rounded-t-3xl border-0"
                />

                {/* Badge layer */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none z-10">
                    {discount > 0 && <DiscountBadge percent={discount} />}
                    {data.isTrending && <TrendingBadge />}
                </div>

                {/* Bottom gradient for readability */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
            </div>

            {/* 📝 CONTENT */}
            <div className="p-4 flex flex-col flex-1 gap-1.5">
                {/* Category + Trust */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-caption font-black uppercase tracking-[0.2em] text-orange-500/70 truncate">
                        {categoryName}
                    </span>
                    {trustLevel !== "none" && (
                        <SovereignTrustBadge level={trustLevel} size="sm" />
                    )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
                    {title}
                </h3>

                {/* Seller name */}
                {data.sellerName && (
                    <p className="text-label text-zinc-500">
                        by <span className="text-zinc-400 font-medium">{data.sellerName}</span>
                    </p>
                )}

                {/* District intelligence */}
                {data.district && !data.sellerName && (
                    <p className="flex items-center gap-1 text-caption text-emerald-400/60 font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        {data.deliveryInfo || `In ${data.district}`}
                    </p>
                )}

                {/* 🏷️ PRICING STACK */}
                <div className="mt-auto flex items-baseline gap-2 pt-2 flex-wrap">
                    <span className="text-lg font-black text-white">₹{formatPrice(price)}</span>
                    {mrp != null && mrp > price && (
                        <>
                            <span className="text-xs text-zinc-500 line-through">₹{formatPrice(mrp)}</span>
                            <span className="text-label font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                -{discount}%
                            </span>
                        </>
                    )}
                </div>

                {/* Rating row */}
                {data.rating != null && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center gap-0.5 text-amber-400">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            <span className="text-label font-semibold text-zinc-300">{data.rating.toFixed(1)}</span>
                        </div>
                        {data.reviewCount != null && (
                            <span className="text-label text-zinc-500">({data.reviewCount})</span>
                        )}
                    </div>
                )}

                {/* 🛒 CTA — governed by canonical resolver */}
                <button className="mt-2 w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-label font-black uppercase tracking-[0.1em] transition-all active:scale-[0.97] shadow-lg shadow-orange-600/15">
                    {ctaLabel}
                </button>

            </div>

            {/* 🌌 Sovereign glow accent */}
            <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-orange-500/8 blur-3xl pointer-events-none rounded-full" />
        </Link>
    );
});

export default SovereignProductCard;
