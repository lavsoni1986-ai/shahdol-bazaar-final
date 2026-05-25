// 🛡️ BHARAT-OS: SOVEREIGN ENTITY CARD — CANONICAL MULTI-ENTITY RENDERER
// Single source of truth for ALL entity search/grid results.
// For product entities: delegates to SovereignProductCard (canonical commerce card).
// For all other entities (professional, healthcare, education, service, restaurant):
//   uses governance-driven CTA resolution — NO hardcoded "Add to Cart" on services.
// NO duplicate product rendering allowed.
// NO commerce assumptions for non-product entities.

import { Link } from "wouter";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SovereignProductCard, type ProductCardData } from "@/components/shared/SovereignProductCard";
import { GovernedImage } from "@/design/media-governance";
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
        mrp: raw.mrp ?? null,
        imageUrl: entity.imageUrl ?? null,
        image: null,
        category: entity.category ?? 'General',
        slug: entity.slug ?? null,
        isSponsored: Boolean(raw.isSponsored ?? raw.sponsored ?? false),
        isTrending: Boolean(raw.isTrending ?? raw.trending ?? false),
        discount: raw.discount ?? null,
        sellerName: entity.subtitle ?? raw.sellerName ?? null,
        sellerSlug: raw.sellerSlug ?? raw.vendorSlug ?? null,
        sellerVerified: entity.isVerified ?? (entity.dsslScore != null && entity.dsslScore >= 50),
        dsslScore: entity.dsslScore ?? null,
        district: raw.district ?? null,
        deliveryInfo: raw.deliveryInfo ?? null,
        rating: entity.rating ?? null,
        reviewCount: entity.reviewCount ?? null,
    };
}

// ─── CTA BUTTON RENDERER ─────────────────────────────────
// 🏛️ Renders the primary CTA button driven by the governance engine.
// NEVER hardcodes "Add to Cart", "Buy Now", etc.
function EntityCTAButton({ entity }: { entity: CanonicalEntity }) {
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
    };
    return mapping[rawKind] ?? rawKind;
}

export function SovereignEntityCard({ entity, variant = 'grid', onTrack }: SovereignEntityCardProps) {
    const Icon = ENTITY_ICON_MAP[entity.kind] || Store;
    const label = ENTITY_LABEL_MAP[entity.kind] || 'Entity';
    const route = buildCanonicalRoute({
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
    const priceLabel = entity.price !== undefined && entity.price !== null ? `₹${entity.price}` : null;
    const ratingLabel = entity.rating !== undefined && entity.rating !== null ? `${entity.rating.toFixed(1)} ⭐` : null;
    // 🏛️ Use canonical governance engine to check commerce eligibility
    const hasCommerce = hasCommerceDisplay(mapToCanonicalKind(entity.kind) as any);

    return (
        <Link
            href={route}
            className={
                variant === 'search'
                    ? 'group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-orange-500/40 hover:bg-white/10'
                    : 'block rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition hover:border-orange-500/30 hover:bg-white/10'
            }
            onClick={handleClick}
        >
            <GovernedImage
                src={entity.imageUrl}
                alt={entity.title}
                categoryName={entity.category}
                name={entity.title}
                aspectRatioHint="square"
                className="h-14 w-14 rounded-3xl flex-shrink-0"
            />

            <div className={variant === 'search' ? 'min-w-0 flex-1' : 'space-y-4'}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">{label}</p>
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

                {variant === 'search' && (
                    <div className="flex items-center gap-2 pt-1">
                        <EntityCTAButton entity={entity} />
                    </div>
                )}
            </div>

            {variant === 'grid' && (
                <div className="flex items-center justify-between gap-3 pt-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                        {entity.reviewCount != null && <span>{entity.reviewCount} reviews</span>}
                        {entity.dsslScore != null && <span>{entity.dsslScore}% dssl</span>}
                    </div>
                    <EntityCTAButton entity={entity} />
                </div>
            )}
        </Link>
    );
}

export default SovereignEntityCard;
