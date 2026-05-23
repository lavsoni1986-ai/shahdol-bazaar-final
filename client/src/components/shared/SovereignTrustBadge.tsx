// 🛡️ BHARAT-OS: SOVEREIGN TRUST BADGE (CANONICAL PRIMITIVE)
// Single source of truth for all trust visuals across BharatOS commerce surfaces.

import { ShieldCheck, Verified, Award } from "lucide-react";

export type TrustLevel = "verified" | "dssl_high" | "dssl_medium" | "dssl_low" | "none";

interface TrustBadgePrimitiveProps {
    level: TrustLevel;
    dsslScore?: number;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string;
}

const TRUST_CONFIG: Record<TrustLevel, { label: string; icon: typeof ShieldCheck; bg: string; text: string; border: string }> = {
    verified: {
        label: "Verified Local Seller",
        icon: Verified,
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
    },
    dssl_high: {
        label: "DSSL Verified",
        icon: ShieldCheck,
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/20",
    },
    dssl_medium: {
        label: "DSSL Scored",
        icon: Award,
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/20",
    },
    dssl_low: {
        label: "Local Seller",
        icon: ShieldCheck,
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        border: "border-zinc-500/20",
    },
    none: {
        label: "Local Seller",
        icon: ShieldCheck,
        bg: "bg-zinc-500/5",
        text: "text-zinc-500",
        border: "border-zinc-500/10",
    },
};

export function SovereignTrustBadge({ level, dsslScore, size = "sm", showLabel = true, className = "" }: TrustBadgePrimitiveProps) {
    const config = TRUST_CONFIG[level];
    const Icon = config.icon;

    const sizeClasses = size === "lg"
        ? "px-3 py-1.5 text-xs gap-1.5"
        : size === "md"
            ? "px-2.5 py-1 text-[10px] gap-1"
            : "px-2 py-0.5 text-[9px] gap-1";

    return (
        <span className={`inline-flex items-center rounded-full border ${config.bg} ${config.border} ${config.text} ${sizeClasses} font-semibold ${className}`}>
            <Icon className={size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} />
            {showLabel && <span>{dsslScore ? `DSSL ${dsslScore}` : config.label}</span>}
        </span>
    );
}

// 🧠 Resolve trust level from vendor data
export function resolveTrustLevel(vendor?: { isVerified?: boolean; dsslScore?: number | null } | null): TrustLevel {
    if (!vendor) return "none";
    if (vendor.isVerified) return "verified";
    if (vendor.dsslScore && vendor.dsslScore >= 80) return "dssl_high";
    if (vendor.dsslScore && vendor.dsslScore >= 50) return "dssl_medium";
    if (vendor.dsslScore && vendor.dsslScore > 0) return "dssl_low";
    return "none";
}
