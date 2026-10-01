import { EmptyState } from "@/components/shared/ErrorState";
import { SovereignStoreCard, type StoreCardData } from "@/components/shared/SovereignStoreCard";
import { useDistrict } from "@/contexts/DistrictContext";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";

interface FeaturedShopsProps {
  entities?: CanonicalEntity[];
  products?: CanonicalEntity[];
  onTrack?: (action: string, entityId: number) => void;
}

function normalizeItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

const NON_RETAIL_BUSINESS_TYPES = new Set([
  "SCHOOL",
  "HEALTHCARE",
  "HOSPITAL",
  "SERVICE",
  "EDUCATION",
]);

function isRetailEntity(entity: CanonicalEntity): boolean {
  const raw = (entity.raw || {}) as Record<string, any>;
  const rawBusinessType = (
    raw.businessType ||
    raw.type ||
    raw.vendorType ||
    raw.sellerType ||
    ""
  ).toString().trim().toUpperCase();

  if (NON_RETAIL_BUSINESS_TYPES.has(rawBusinessType)) {
    return false;
  }

  const rawEntityType = (raw.entityType || "").toString().trim().toUpperCase();
  if (NON_RETAIL_BUSINESS_TYPES.has(rawEntityType)) {
    return false;
  }

  const kind = (entity.kind || "").toString().trim().toLowerCase();
  if (kind === "school" || kind === "hospital" || kind === "healthcare" || kind === "service" || kind === "education") {
    return false;
  }

  const category = (entity.category || raw.category || "").toString().trim().toUpperCase();
  if (NON_RETAIL_BUSINESS_TYPES.has(category)) {
    return false;
  }

  return true;
}

export function FeaturedShops({ entities: externalEntities, products, onTrack }: FeaturedShopsProps) {
  const { currentDistrict } = useDistrict();
  const entities = normalizeItems<CanonicalEntity>(externalEntities);
  const safeEntities = normalizeItems<CanonicalEntity>(entities);
  const safeProducts = normalizeItems<CanonicalEntity>(products);

  const retailEntities = safeEntities.filter(isRetailEntity);

  if (retailEntities.length === 0) {
    return (
      <EmptyState
        title="No featured shops available"
        description="We could not find any approved shops for this district yet."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {retailEntities.slice(0, 4).map((entity) => {
        // Cross-reference legitimate product catalog hint and high-res image fallback
        const matchingProduct = safeProducts.find((p) => {
          const slugMatch = entity.slug && (
            p.category?.toLowerCase() === entity.slug.toLowerCase() ||
            p.subtitle?.toLowerCase() === entity.slug.toLowerCase() ||
            p.raw?.category?.toLowerCase() === entity.slug.toLowerCase()
          );
          const nameMatch = entity.title && (
            p.subtitle?.toLowerCase() === entity.title.toLowerCase() ||
            p.raw?.vendorName?.toLowerCase() === entity.title.toLowerCase()
          );
          const idMatch = entity.id && (
            p.raw?.vendorId === entity.id ||
            p.raw?.sourceId === entity.id
          );
          return slugMatch || nameMatch || idMatch;
        });

        const catalogHint = matchingProduct?.title
          ? matchingProduct.price
            ? `${matchingProduct.title} (₹${matchingProduct.price})`
            : matchingProduct.title
          : null;

        const storeData: StoreCardData = {
          id: entity.id,
          name: entity.title,
          slug: entity.slug,
          shopName: entity.title,
          category: entity.category || entity.subtitle || "Store",
          imageUrl: entity.imageUrl || matchingProduct?.imageUrl || null,
          image: entity.imageUrl || matchingProduct?.imageUrl || null,
          phone: entity.phone,
          address: entity.address,
          district: currentDistrict?.name || "Shahdol",
          dsslScore: entity.dsslScore,
          isVerified: entity.isVerified ?? true,
          isSponsored: entity.raw?.isSponsored ?? false,
          rating: entity.rating,
          reviewCount: entity.reviewCount,
          reason: catalogHint ? `Featured: ${catalogHint}` : (entity.description || entity.raw?.reason || "Top verified match in your district"),
        };

        return (
          <SovereignStoreCard
            key={`featured-shop-${entity.id}`}
            data={storeData}
            variant="featured"
            onTrack={(action, id) => onTrack?.(action, Number(id) || entity.id)}
          />
        );
      })}
    </div>
  );
}

export default FeaturedShops;
