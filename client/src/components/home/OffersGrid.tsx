import { EmptyState } from "@/components/shared/ErrorState";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";

interface OffersGridProps {
  products?: CanonicalEntity[];
}

function normalizeItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

export function OffersGrid({ products: externalProducts }: OffersGridProps) {
  const products = normalizeItems<CanonicalEntity>(externalProducts);
  const safeProducts = normalizeItems<CanonicalEntity>(products);

  if (safeProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/40">No offers available yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {safeProducts.slice(0, 6).map((entity) => (
        <SovereignEntityCard key={`product-${entity.id}`} entity={entity} variant="grid" />
      ))}
    </div>
  );
}

export default OffersGrid;
