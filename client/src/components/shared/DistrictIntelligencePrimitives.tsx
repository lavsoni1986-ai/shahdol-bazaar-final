// 🛡️ BHARAT-OS: SOVEREIGN DISTRICT INTELLIGENCE PRIMITIVES
// Reusable district-aware badges and signals for all commerce surfaces.
// These primitives convey trusted local district commerce identity.
// NO duplicate district rendering logic allowed across entity cards.

import { Clock, MapPin, ShieldCheck, TrendingUp, Zap, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────

export type DistrictBadgeSize = "sm" | "md" | "lg";

interface DistrictPrimitiveProps {
    district?: string | null;
    size?: DistrictBadgeSize;
    className?: string;
}

// ─── SIZE HELPERS ─────────────────────────────────────────

const sizeStyles = {
    sm: "text-[9px] px-1.5 py-0.5 gap-1",
    md: "text-[10px] px-2 py-1 gap-1.5",
    lg: "text-xs px-3 py-1.5 gap-2",
} as const;

const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
} as const;

// ─── 1. DISTRICT DELIVERY BADGE ──────────────────────────
// "Same Day Delivery in Shahdol" | "Available in Burhar"

export function DistrictDeliveryBadge({
    district,
    deliveryInfo,
    size = "sm",
    className = "",
}: DistrictPrimitiveProps & { deliveryInfo?: string | null }) {
    if (!district && !deliveryInfo) return null;

    return (
        <span
            className={`inline-flex items-center ${sizeStyles[size]} rounded-full bg-emerald-500/10 text-emerald-400/80 font-medium border border-emerald-500/15 ${className}`}
        >
            <Zap className={iconSizes[size]} />
            {deliveryInfo || `Available in ${district}`}
        </span>
    );
}

// ─── 2. DISTRICT TRUST LABEL ─────────────────────────────
// "Trusted in Shahdol" | "Trusted Seller" | "Verified in District"

export function DistrictTrustLabel({
    district,
    isVerified,
    dsslScore,
    size = "sm",
    className = "",
}: DistrictPrimitiveProps & { isVerified?: boolean; dsslScore?: number | null }) {
    if (!isVerified && !dsslScore) return null;

    const label = district
        ? isVerified
            ? `Trusted in ${district}`
            : `Serving ${district}`
        : isVerified
            ? "Trusted Seller"
            : null;

    if (!label) return null;

    return (
        <span
            className={`inline-flex items-center ${sizeStyles[size]} rounded-full bg-orange-500/10 text-orange-400/80 font-medium border border-orange-500/15 ${className}`}
        >
            <ShieldCheck className={iconSizes[size]} />
            {label}
        </span>
    );
}

// ─── 3. DISTRICT POPULARITY SIGNAL ───────────────────────
// "Popular in Burhar" | "Trending in Shahdol" | "Top in District"

export function DistrictPopularitySignal({
    district,
    isTrending,
    rating,
    size = "sm",
    className = "",
}: DistrictPrimitiveProps & { isTrending?: boolean; rating?: number | null }) {
    if (!district) return null;

    const Icon: LucideIcon = isTrending || (rating != null && rating >= 4) ? TrendingUp : MapPin;
    const label = isTrending
        ? `Popular in ${district}`
        : rating != null && rating >= 4
            ? `Top Rated in ${district}`
            : `In ${district}`;

    return (
        <span
            className={`inline-flex items-center ${sizeStyles[size]} rounded-full bg-white/5 text-zinc-400 font-medium border border-white/5 ${className}`}
        >
            <Icon className={iconSizes[size]} />
            {label}
        </span>
    );
}

// ─── 4. DELIVERY ESTIMATE ────────────────────────────────
// "Same Day" | "2-3 Days" | "Express"

export function DeliveryEstimate({
    info,
    size = "sm",
    className = "",
}: {
    info?: string | null;
    size?: DistrictBadgeSize;
    className?: string;
}) {
    if (!info) return null;

    const isExpress = /same|express|today/i.test(info);
    const isFast = /2-3|quick|fast/i.test(info);

    return (
        <span
            className={`inline-flex items-center ${sizeStyles[size]} rounded-full ${isExpress
                ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20"
                : isFast
                    ? "bg-blue-500/10 text-blue-400 font-medium border border-blue-500/15"
                    : "bg-white/5 text-zinc-400 border border-white/5"
                } ${className}`}
        >
            <Clock className={iconSizes[size]} />
            {info}
        </span>
    );
}

// ─── 5. SOVEREIGN LOCALITY BADGE ─────────────────────────
// "Serving Near Railway Colony" | "In Shahdol City Center"

export function LocalityBadge({
    address,
    distance,
    size = "sm",
    className = "",
}: {
    address?: string | null;
    distance?: string | null;
    size?: DistrictBadgeSize;
    className?: string;
}) {
    if (!address && !distance) return null;

    const label = distance
        ? `${distance} away`
        : address
            ? address
            : null;

    if (!label) return null;

    return (
        <span
            className={`inline-flex items-center ${sizeStyles[size]} rounded-full bg-white/5 text-zinc-400 font-medium border border-white/5 ${className}`}
        >
            <MapPin className={iconSizes[size]} />
            {label}
        </span>
    );
}

// ─── EXPORT ALL ──────────────────────────────────────────

export {
    sizeStyles as districtIconSizes,
    iconSizes as districtIconSizeMap,
};
