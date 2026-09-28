// 🛡️ BHARAT-OS: SOVEREIGN ENTITY CARD — CANONICAL MULTI-ENTITY RENDERER
// Single source of truth for ALL entity search/grid results.
// For product entities: delegates to SovereignProductCard (canonical commerce card).
// For all other entities (professional, healthcare, education, service, restaurant):
//   uses governance-driven CTA resolution — NO hardcoded "Add to Cart" on services.
// NO duplicate product rendering allowed.
// NO commerce assumptions for non-product entities.

import { useState } from "react";
import { Link } from "wouter";
import { optimizeCloudinaryUrl } from "@/design/media-governance";
import {
    ShoppingBag,
    HeartPulse,
    GraduationCap,
    Sparkles,
    Store,
    Stethoscope,
    MapPin,
    Phone,
    ArrowRight,
    UtensilsCrossed,
    Briefcase,
    Ambulance,
    Building2,
    Bus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SovereignProductCard, type ProductCardData } from "@/components/shared/SovereignProductCard";
import { SovereignTrustBadge, resolveTrustLevel } from "@/components/shared/SovereignTrustBadge";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";
import { resolveEntityCTAs, hasCommerceDisplay, resolveEntityExperience } from "@/governance";
import { trackEvent } from "@/lib/analytics";
import { buildCanonicalRoute } from "@/shared/routing/sovereign-routes";

// 🏛️ Canonical entity icon map — uses EntityKind (not old kind strings)
const ENTITY_ICON_MAP: Partial<Record<string, React.ComponentType<any>>> = {
    partner: Store,
    product: ShoppingBag,
    service: Sparkles,
    professional: Briefcase,
    healthcare: Stethoscope,
    education: GraduationCap,
    restaurant: UtensilsCrossed,
    booking: Building2,
    marketplace: Store,
    emergency: Ambulance,
    hospital: HeartPulse,
    school: GraduationCap,
    bus: Bus,
    transport: Bus,
};

const ENTITY_LABEL_MAP: Record<string, string> = {
    partner: 'Partner',
    hospital: 'Hospital',
    school: 'School',
    service: 'Service',
    product: 'Product',
    professional: 'Professional',
    healthcare: 'Healthcare',
    education: 'Education',
    restaurant: 'Restaurant',
    booking: 'Booking',
    marketplace: 'Marketplace',
    emergency: 'Emergency',
    bus: 'Bus',
    transport: 'Transport',
};

export interface SovereignEntityCardProps {
    entity: CanonicalEntity;
    variant?: 'search' | 'grid';
    onTrack?: (action: string, entityId: number) => void;
}

// ─── ADAPTER: transform CanonicalEntity to ProductCardData ───
// Extends canonical entity with raw-payload fields not on the typed interface.
function toProductCardData(entity: CanonicalEntity): ProductCardData {
    const raw = entity.raw ?? {};
    return {
        id: entity.id,
        title: entity.title,
        name: entity.title,
        price: entity.price ?? 0,
        mrp: raw.mrp ?? raw.meta?.mrp ?? null,
        imageUrl: entity.imageUrl ?? null,
        image: null,
        category: entity.category ?? 'General',
        slug: entity.slug ?? null,
        isSponsored: Boolean(raw.isSponsored ?? raw.sponsored ?? false),
        isTrending: Boolean(raw.isTrending ?? raw.trending ?? false),
        discount: raw.discount ?? null,
        sellerName: entity.subtitle ?? raw.sellerName ?? raw.meta?.vendorName ?? null,
        sellerSlug: raw.sellerSlug ?? raw.vendorSlug ?? raw.meta?.vendor?.slug ?? null,
        sellerVerified: entity.isVerified ?? (entity.dsslScore != null && entity.dsslScore >= 50),
        dsslScore: entity.dsslScore ?? null,
        district: raw.district ?? raw.meta?.district ?? null,
        deliveryInfo: raw.deliveryInfo ?? null,
        rating: entity.rating ?? null,
        reviewCount: entity.reviewCount ?? null,
    };
}

// ─── CTA BUTTON RENDERER ─────────────────────────────────
// 🏛️ Renders the primary CTA button driven by the governance engine.
// NEVER hardcodes "Add to Cart", "Buy Now", etc.
function EntityCTAButton({ entity }: { entity: CanonicalEntity }) {
    if (entity.kind === 'bus') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/90 text-white text-label font-black uppercase tracking-wider rounded-full transition-all group-hover:bg-orange-600">
                View Timetable
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        );
    }

    // Determine entity kind for CTA resolution
    const kind = mapToCanonicalKind(entity.kind) as any;
    const category = typeof entity.category === 'string' ? entity.category : '';
    const raw = entity.raw ?? {};

    // Resolve CTAs via governance engine
    const ctas = resolveEntityCTAs({ kind, category, tags: raw.tags });

    // Only render CTA for non-entity kinds that have meaningful actions
    if (ctas.policy.interactionMode === 'inquiry' && ctas.allCTAs.length <= 1) {
        return null; // Fallback inquiries don't need prominent CTA
    }

    const primary = ctas.primaryCTA;

    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/90 text-white text-label font-black uppercase tracking-wider rounded-full transition-all group-hover:bg-orange-600">
            {primary.label}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
    );
}

/**
 * Map legacy kind strings to canonical EntityKind.
 * This bridge ensures backward compatibility while the platform migrates.
 */
function mapToCanonicalKind(rawKind: string): string | undefined {
    const mapping: Record<string, string> = {
        partner: 'marketplace',
        hospital: 'healthcare',
        school: 'education',
        service: 'service',
        product: 'product',
        professional: 'professional',
        healthcare: 'healthcare',
        education: 'education',
        restaurant: 'restaurant',
        booking: 'booking',
        marketplace: 'marketplace',
        emergency: 'emergency',
        bus: 'bus',
        transport: 'bus',
    };
    return mapping[rawKind] ?? rawKind;
}

export function SovereignEntityCard({ entity, variant = 'grid', onTrack }: SovereignEntityCardProps) {
    const Icon = ENTITY_ICON_MAP[entity.kind] || Store;
    const label = ENTITY_LABEL_MAP[entity.kind] || 'Entity';
    const route = entity.route || buildCanonicalRoute({
        entityKind: entity.kind,
        slug: entity.slug,
        id: entity.id,
    });

    const handleClick = () => {
        onTrack?.('click', entity.id);
    };

    // ── PRODUCT ENTITY: DELEGATE TO CANONICAL SOVEREIGN PRODUCT CARD ──
    if (entity.kind === 'product') {
        const cardData = toProductCardData(entity);
        const productVariant = variant === 'search' ? 'search' : 'marketplace';

        return (
            <SovereignProductCard
                data={cardData}
                variant={productVariant}
                onTrack={handleClick}
            />
        );
    }

    // ── NON-PRODUCT ENTITY: STANDARD ENTITY CARD ──
    const [imageError, setImageError] = useState(false);
    const optimizedImageUrl = entity.imageUrl
        ? optimizeCloudinaryUrl(entity.imageUrl, { width: 800 }) || entity.imageUrl
        : null;
    const hasImage = Boolean(optimizedImageUrl) && !imageError;

    const priceLabel = entity.price !== undefined && entity.price !== null ? `₹${entity.price}` : null;
    const ratingLabel = entity.rating !== undefined && entity.rating !== null ? `${entity.rating.toFixed(1)} ⭐` : null;
    // 🏛️ Use canonical governance engine to check commerce eligibility
    const hasCommerce = hasCommerceDisplay(mapToCanonicalKind(entity.kind) as any);

    // ── VARIANT: SEARCH (COMPACT INLINE LIST ITEM) ──
    if (variant === 'search') {
        return (
            <Link
                href={route}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 overflow-hidden transition hover:border-orange-500/40 hover:bg-white/10"
                onClick={handleClick}
            >
                {hasImage ? (
                    <div className="flex-shrink-0 h-14 w-14 rounded-2xl overflow-hidden bg-zinc-800 border border-white/10">
                        <img
                            src={optimizedImageUrl!}
                            alt={entity.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() => setImageError(true)}
                        />
                    </div>
                ) : (
                    <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Icon className="h-6 w-6" />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">{label}</p>
                                {(entity.isVerified || (entity.dsslScore != null && entity.dsslScore >= 50)) && (
                                    <SovereignTrustBadge
                                        level={entity.isVerified ? "verified" : resolveTrustLevel({ isVerified: entity.isVerified, dsslScore: entity.dsslScore })}
                                        entityKind={entity.kind}
                                        size="sm"
                                    />
                                )}
                            </div>
                            <h3 className="text-white font-bold text-base leading-tight line-clamp-2">{entity.title}</h3>
                        </div>

                        <div className="flex flex-col items-end gap-2 text-right">
                            {priceLabel && hasCommerce && <span className="text-sm font-black text-emerald-300">{priceLabel}</span>}
                            {ratingLabel && <span className="text-xs text-slate-300">{ratingLabel}</span>}
                        </div>
                    </div>

                    {entity.subtitle && (
                        <p className="text-xs text-slate-400 line-clamp-1">{entity.subtitle}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2">
                        {entity.category && <Badge className="bg-white/5 text-slate-200 border border-white/10">{entity.category}</Badge>}
                        {entity.address && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {entity.address}
                            </span>
                        )}
                        {entity.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {entity.phone}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <EntityCTAButton entity={entity} />
                    </div>
                </div>
            </Link>
        );
    }

    // ── VARIANT: GRID (DISCOVERY CARD — HOMEPAGE / LISTING) ──
    return (
        <Link
            href={route}
            className={`group block rounded-[1.75rem] border border-white/10 bg-white/5 transition hover:border-orange-500/30 hover:bg-white/10 ${
                hasImage ? 'overflow-hidden' : 'p-5'
            }`}
            onClick={handleClick}
        >
            {hasImage ? (
                /* ── PROMINENT TOP MEDIA BANNER (~16:9 / ~h-40) ── */
                <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] max-h-48 overflow-hidden bg-zinc-950 flex items-center justify-center border-b border-white/5">
                    {/* Ambient blurred backdrop so portrait/square images don't have harsh black bars */}
                    <img
                        src={optimizedImageUrl!}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
                    />

                    {/* Foreground crisp image — object-contain ensures signboards, text, and clinic details are 100% visible and uncropped */}
                    <img
                        src={optimizedImageUrl!}
                        alt={entity.title}
                        className="relative z-10 w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                        onError={() => setImageError(true)}
                    />

                    {/* Gradient shadow at bottom of banner for seamless content transition */}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent pointer-events-none z-10" />

                    {/* Rating overlay badge if available */}
                    {ratingLabel && (
                        <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-0.5 text-xs font-semibold text-slate-200 shadow-md">
                            {ratingLabel}
                        </div>
                    )}
                </div>
            ) : null}

            {/* ── CARD BODY CONTENT ── */}
            <div className={hasImage ? 'p-5 space-y-4' : 'space-y-4'}>
                {hasImage ? (
                    /* With image: Header sits directly below the prominent banner */
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">{label}</p>
                                {(entity.isVerified || (entity.dsslScore != null && entity.dsslScore >= 50)) && (
                                    <SovereignTrustBadge
                                        level={entity.isVerified ? "verified" : resolveTrustLevel({ isVerified: entity.isVerified, dsslScore: entity.dsslScore })}
                                        entityKind={entity.kind}
                                        size="sm"
                                    />
                                )}
                            </div>
                            <h3 className="text-white font-bold text-base leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors">
                                {entity.title}
                            </h3>
                        </div>

                        {priceLabel && hasCommerce && (
                            <div className="flex flex-col items-end gap-1 text-right shrink-0">
                                <span className="text-sm font-black text-emerald-300">{priceLabel}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Without image (e.g. Apollo): Balanced header with Icon alongside Title, eliminating dead space */
                    <div className="flex items-start gap-3.5">
                        <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <Icon className="h-6 w-6" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">{label}</p>
                                {(entity.isVerified || (entity.dsslScore != null && entity.dsslScore >= 50)) && (
                                    <SovereignTrustBadge
                                        level={entity.isVerified ? "verified" : resolveTrustLevel({ isVerified: entity.isVerified, dsslScore: entity.dsslScore })}
                                        entityKind={entity.kind}
                                        size="sm"
                                    />
                                )}
                            </div>
                            <h3 className="text-white font-bold text-base leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors">
                                {entity.title}
                            </h3>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-right shrink-0">
                            {priceLabel && hasCommerce && <span className="text-sm font-black text-emerald-300">{priceLabel}</span>}
                            {ratingLabel && <span className="text-xs text-slate-300">{ratingLabel}</span>}
                        </div>
                    </div>
                )}

                {entity.subtitle && (
                    <p className="text-xs text-slate-400 line-clamp-1">{entity.subtitle}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {entity.category && <Badge className="bg-white/5 text-slate-200 border border-white/10">{entity.category}</Badge>}
                    {entity.address && (
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {entity.address}
                        </span>
                    )}
                    {entity.phone && (
                        <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {entity.phone}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                        {entity.reviewCount != null && <span>{entity.reviewCount} reviews</span>}
                        {entity.dsslScore != null && <span>{entity.dsslScore}% dssl</span>}
                    </div>
                    <EntityCTAButton entity={entity} />
                </div>
            </div>
        </Link>
    );
}

export default SovereignEntityCard;
