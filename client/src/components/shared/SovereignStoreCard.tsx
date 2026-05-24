// 🛡️ BHARAT-OS: CANONICAL SOVEREIGN STORE CARD
// Single source of truth for ALL store/vendor card variants across BharatOS commerce surfaces.
// Every store card — homepage, marketplace, featured, compact, search, feed — must use this.
// Integrates trust badge + district intelligence primitives.
// NO fragmented store rendering allowed.
//
// 🏛️ Design Token Compliance:
//   - All radii use `rounded-xl`/`rounded-2xl`/`rounded-3xl` (NO arbitrary `rounded-[...]`)
//   - All text sizes use semantic Tailwind classes (NO arbitrary `text-[...]`)
//   - All shadows use `shadow-lg`/`shadow-xl`/`shadow-2xl` (NO arbitrary `shadow-[...]`)

import { memo } from "react";
import { MapPin, PhoneCall, Store, Navigation } from "lucide-react";
import { Link } from "wouter";
import { partnerRoutes, getCurrentDistrictSlug } from "@/shared/routing/sovereign-routes";
import { SovereignTrustBadge, resolveTrustLevel, type TrustLevel } from "./SovereignTrustBadge";
import {
    DistrictTrustLabel,
    DistrictPopularitySignal,
    LocalityBadge,
    type DistrictBadgeSize,
} from "./DistrictIntelligencePrimitives";
import { resolveEntityExperience, resolveEntityCTAs } from "@/governance";
import { trackEvent } from "@/lib/analytics";

// ─── TYPES ────────────────────────────────────────────────

export type StoreCardVariant = "marketplace" | "featured" | "compact" | "search" | "feed";

export interface StoreCardData {
    id: number | string;
    name: string;
    slug?: string | null;
    shopName?: string;
    imageUrl?: string | null;
    image?: string | null;
    logo?: string | null;
    category?: string | { name: string } | null;
    businessType?: string;
    isSponsored?: boolean;
    isTrending?: boolean;
    isVerified?: boolean;
    dsslScore?: number | null;
    distance?: string | number | null;
    distanceKm?: string | number | null;
    isOpen?: boolean;
    closingTime?: string;
    phone?: string | null;
    address?: string | null;
    district?: string;
    rating?: number | null;
    reviewCount?: number | null;
    reason?: string;
    deliveryInfo?: string;
}

interface SovereignStoreCardProps {
    data: StoreCardData;
    variant?: StoreCardVariant;
    onTrack?: (action: string, id: string | number) => void;
    className?: string;
}

// ─── HELPERS ──────────────────────────────────────────────

function getStoreName(data: StoreCardData): string {
    return data.name || data.shopName || "Store";
}

function getStoreImage(data: StoreCardData): string | null {
    return data.logo || data.imageUrl || data.image || null;
}

function getCategoryLabel(category: string | { name: string } | undefined | null, businessType?: string): string {
    if (category) {
        if (typeof category === "string") return category;
        return category.name || "Store";
    }
    return businessType || "Store";
}

function getDistance(data: StoreCardData): string | null {
    if (data.distance) return `${data.distance}`;
    if (data.distanceKm) return `${data.distanceKm}`;
    return null;
}

function isStoreOpen(data: StoreCardData): boolean {
    if (data.isOpen !== undefined) return data.isOpen;
    if (data.closingTime) {
        const now = new Date();
        const [hours, minutes] = data.closingTime.split(":").map(Number);
        const closing = new Date();
        closing.setHours(hours, minutes, 0);
        return now < closing;
    }
    return true;
}

// ─── SKELETON ─────────────────────────────────────────────

function StoreCardSkeleton({ variant }: { variant: StoreCardVariant }) {
    if (variant === "compact") {
        return (
            <div className="animate-pulse bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 bg-white/5 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/5 rounded w-2/3" />
                        <div className="h-2 bg-white/5 rounded w-1/3" />
                    </div>
                </div>
            </div>
        );
    }

    if (variant === "search") {
        return (
            <div className="animate-pulse bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                <div className="flex items-center gap-4 p-4">
                    <div className="w-14 h-14 bg-white/5 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-2 bg-white/5 rounded w-1/4" />
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                        <div className="h-2 bg-white/5 rounded w-1/2" />
                    </div>
                </div>
            </div>
        );
    }

    // default (marketplace, featured, feed)
    return (
        <div className="animate-pulse bg-white/5 rounded-2xl overflow-hidden border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-2/3" />
                    <div className="h-2 bg-white/5 rounded w-1/3" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-2 bg-white/5 rounded w-1/3" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-white/5 rounded-xl" />
                <div className="h-10 bg-white/5 rounded-xl" />
            </div>
        </div>
    );
}

export { StoreCardSkeleton };

// ─── IMAGE COMPONENT ─────────────────────────────────────

const StoreImage = memo(function StoreImage({
    src,
    alt,
}: {
    src: string | null;
    alt: string;
}) {
    if (!src) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/10 to-zinc-800/50">
                <span className="text-orange-400 font-black text-xl">{alt[0]}</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.classList.add("flex", "items-center", "justify-center");
                const span = document.createElement("span");
                span.className = "text-orange-400 font-black text-xl";
                span.textContent = alt[0];
                (e.target as HTMLImageElement).parentElement!.appendChild(span);
            }}
        />
    );
});

// ─── MAIN CARD COMPONENT ──────────────────────────────────

export const SovereignStoreCard = memo(function SovereignStoreCard({
    data,
    variant = "marketplace",
    onTrack,
    className = "",
}: SovereignStoreCardProps) {
    const name = getStoreName(data);
    const imageSrc = getStoreImage(data);
    const categoryName = getCategoryLabel(data.category, data.businessType);
    const open = isStoreOpen(data);
    const distance = getDistance(data);
    const trustLevel: TrustLevel = resolveTrustLevel({ isVerified: data.isVerified, dsslScore: data.dsslScore });
    const district = data.district || getCurrentDistrictSlug();

    const href = data.slug
        ? partnerRoutes.profile(getCurrentDistrictSlug(), data.slug)
        : null;

    // 🏛️ Governance — derive experience and CTAs for store/vendor surfaces
    const experience = resolveEntityExperience({ entityKind: "marketplace" });
    const ctas = resolveEntityCTAs({ kind: "marketplace" });
    const ctaLabel = ctas.primaryCTA.label;

    const handleClick = () => {
        trackEvent("VENDOR_VIEW", {
            source: variant,
            value: { entityType: "store", entityId: data.id, district },
        });
        onTrack?.("click", data.id);
    };

    const handleCall = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (data.phone) {
            window.location.href = `tel:${data.phone}`;
        }
        trackEvent("CALL_CLICK", {
            value: { entityType: "store", entityId: data.id, district },
        });
        onTrack?.("call", data.id);
    };

    // ── SEARCH VARIANT ──
    if (variant === "search") {
        if (!href) {
            return (
                <div className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 opacity-50 cursor-not-allowed ${className}`}>
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-zinc-800">
                        <StoreImage src={imageSrc} alt={name} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-label font-black uppercase tracking-[0.2em] text-orange-400/70">{categoryName}</p>
                        <h3 className="text-sm font-bold text-white line-clamp-1">{name}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Coming Soon</p>
                    </div>
                </div>
            );
        }

        return (
            <Link
                href={href}
                className={`group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-orange-500/40 hover:bg-white/10 ${className}`}
                onClick={handleClick}
            >
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-zinc-800">
                    <StoreImage src={imageSrc} alt={name} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-label font-black uppercase tracking-[0.2em] text-orange-400/70">{categoryName}</p>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {open ? (
                            <span className="flex items-center gap-1 text-label text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Open
                            </span>
                        ) : (
                            <span className="text-label text-zinc-500">Closed</span>
                        )}
                        {distance && <span className="text-label text-zinc-500">{distance} away</span>}
                    </div>
                </div>
                <SovereignTrustBadge level={trustLevel} size="sm" />
            </Link>
        );
    }

    // ── COMPACT VARIANT ──
    if (variant === "compact") {
        if (!href) {
            return (
                <div className={`group block rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-4 opacity-50 cursor-not-allowed ${className}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                            <StoreImage src={imageSrc} alt={name} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate">{name}</h3>
                            <p className="text-label text-zinc-500">Coming Soon</p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <Link
                href={href}
                className={`group block rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-4 transition hover:border-orange-500/40 hover:bg-white/10 ${className}`}
                onClick={handleClick}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                        <StoreImage src={imageSrc} alt={name} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-caption font-black uppercase tracking-[0.15em] text-orange-400/70 truncate">{categoryName}</p>
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">{name}</h3>
                    </div>
                    {trustLevel !== "none" && <SovereignTrustBadge level={trustLevel} size="sm" />}
                </div>
            </Link>
        );
    }

    // ── FEATURED VARIANT ──
    if (variant === "featured") {
        if (!href) {
            return (
                <div className={`group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 opacity-50 cursor-not-allowed ${className}`}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                            <StoreImage src={imageSrc} alt={name} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-white">{name}</h3>
                            <p className="text-label text-orange-400/70 font-black uppercase tracking-[0.15em]">{categoryName}</p>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500">Coming Soon</p>
                </div>
            );
        }

        return (
            <Link
                href={href}
                className={`group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 transition-all duration-500 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/20 ${className}`}
                onClick={handleClick}
            >
                {/* Sponsored badge */}
                {data.isSponsored && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-caption font-black px-2.5 py-1 rounded-full border border-yellow-300/40 shadow-lg z-10">
                        ⭐ SPONSORED
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                        <StoreImage src={imageSrc} alt={name} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white leading-snug group-hover:text-orange-400 transition-colors">{name}</h3>
                            {trustLevel !== "none" && <SovereignTrustBadge level={trustLevel} size="sm" />}
                        </div>
                        <p className="text-label font-black uppercase tracking-[0.15em] text-orange-400/70 mt-0.5">{categoryName}</p>
                    </div>
                </div>

                {/* District intelligence */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <DistrictTrustLabel district={district} isVerified={data.isVerified} dsslScore={data.dsslScore} size="sm" />
                    <DistrictPopularitySignal district={district} isTrending={data.isTrending} rating={data.rating} size="sm" />
                    <LocalityBadge address={data.address} distance={distance} size="sm" />
                </div>

                {/* Open status + reason */}
                <div className="flex items-center gap-3 text-xs">
                    <span className={`flex items-center gap-1 ${open ? "text-emerald-400" : "text-zinc-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                        {open ? "Open Now" : "Closed"}
                    </span>
                    {data.reason && <span className="text-zinc-400">{data.reason}</span>}
                </div>

                {/* CTA buttons */}
                <div className="grid grid-cols-2 gap-3 mt-5">
                    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all active:scale-[0.98]">
                        <Navigation className="w-4 h-4 text-white/70" /> Direct
                    </button>
                    <button
                        onClick={handleCall}
                        disabled={!data.phone}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/20 shadow-lg shadow-green-500/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PhoneCall className="w-4 h-4" /> Call
                    </button>
                </div>
            </Link>
        );
    }

    // ── FEED VARIANT ──
    if (variant === "feed") {
        if (!href) {
            return (
                <div className={`group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 opacity-50 cursor-not-allowed ${className}`}>
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                        <StoreImage src={imageSrc} alt={name} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white">{name}</h3>
                        <p className="text-xs text-zinc-500 mt-1">Coming Soon</p>
                    </div>
                </div>
            );
        }

        return (
            <Link
                href={href}
                className={`group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-orange-500/40 hover:bg-white/10 ${className}`}
                onClick={handleClick}
            >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                    <StoreImage src={imageSrc} alt={name} />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-caption font-black uppercase tracking-[0.15em] text-orange-400/70">{categoryName}</span>
                        {open ? (
                            <span className="flex items-center gap-1 text-caption text-emerald-400">
                                <span className="w-1 h-1 rounded-full bg-emerald-400" /> Open
                            </span>
                        ) : null}
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {data.phone && (
                            <button onClick={handleCall} className="text-label text-green-400 underline hover:text-green-300">
                                Call
                            </button>
                        )}
                        {distance && <span className="text-label text-zinc-500">{distance} away</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <SovereignTrustBadge level={trustLevel} size="sm" />
                        <DistrictTrustLabel district={district} isVerified={data.isVerified} dsslScore={data.dsslScore} size="sm" />
                    </div>
                </div>
            </Link>
        );
    }

    // ── DEFAULT: MARKETPLACE VARIANT ──
    if (!href) {
        return (
            <div className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl p-5 border border-white/[0.06] bg-white/[0.02] opacity-50 cursor-not-allowed ${className}`}>
                <div className="relative flex items-start gap-4 mb-4">
                    <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                        <StoreImage src={imageSrc} alt={name} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-black text-lg leading-tight">{name}</h3>
                        <p className="text-white/40 text-caption font-black uppercase tracking-[0.15em] mt-1 truncate">{categoryName}</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-gray-500/20 text-gray-400 text-label font-black px-2 py-1 rounded">
                        COMING SOON
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={href}
            className={`block ${className}`}
            onClick={handleClick}
        >
            <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl p-5 transition-all duration-300 group ${data.isSponsored
                ? "border-2 border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 shadow-2xl shadow-yellow-500/20 hover:shadow-2xl hover:shadow-yellow-500/30"
                : "border border-white/[0.06] bg-white/[0.02] shadow-sovereign-subtle hover:shadow-sovereign-glow hover:border-white/[0.15] hover:bg-white/[0.04]"
                }`}>
                {/* Sponsored badge */}
                {data.isSponsored && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-caption font-black px-2.5 py-1 rounded-full border border-yellow-300/40 shadow-lg z-10">
                        ⭐ SPONSORED
                    </div>
                )}

                {/* 🏛️ Header */}
                <div className="relative flex items-start gap-4 mb-4">
                    <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                        <StoreImage src={imageSrc} alt={name} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-black text-lg leading-tight group-hover:text-orange-400 transition-colors line-clamp-2">
                                {name}
                            </h3>
                            {trustLevel !== "none" && <SovereignTrustBadge level={trustLevel} size="sm" />}
                        </div>
                        <p className="text-white/40 text-caption font-black uppercase tracking-[0.15em] mt-1 truncate">
                            {categoryName}
                        </p>
                    </div>
                </div>

                {/* Middle: District intelligence layer */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <DistrictTrustLabel district={district} isVerified={data.isVerified} dsslScore={data.dsslScore} size="sm" />
                    <DistrictPopularitySignal district={district} isTrending={data.isTrending} rating={data.rating} size="sm" />
                    <LocalityBadge address={data.address} distance={distance} size="sm" />
                </div>

                {/* Status row */}
                <div className="flex items-center gap-4 mb-5 text-xs text-white/60 font-medium">
                    {distance && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-orange-500" /> {distance} away
                        </span>
                    )}
                    <span className={`flex items-center gap-1 ${open ? "text-emerald-400" : "text-zinc-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                        {open ? "Open Now" : "Closed"}
                    </span>
                </div>

                {/* Reason tagline */}
                {data.reason && (
                    <p className="text-bodySmall text-zinc-400 mb-4 -mt-2">{data.reason}</p>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all active:scale-[0.98]">
                        <Navigation className="w-4 h-4 text-white/70" /> Direct
                    </button>
                    <button
                        onClick={handleCall}
                        disabled={!data.phone}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/20 shadow-lg shadow-green-500/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PhoneCall className="w-4 h-4" /> Call
                    </button>
                </div>
            </div>
        </Link>
    );
});

export default SovereignStoreCard;
