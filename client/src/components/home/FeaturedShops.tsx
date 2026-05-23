import { EmptyState } from "@/components/shared/ErrorState";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";

interface FeaturedShopsProps {
  entities?: CanonicalEntity[];
  onTrack?: (action: string, entityId: number) => void;
}

function normalizeItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

export function FeaturedShops({ entities: externalEntities, onTrack }: FeaturedShopsProps) {
  const entities = normalizeItems<CanonicalEntity>(externalEntities);
  const safeEntities = normalizeItems<CanonicalEntity>(entities);

  if (safeEntities.length === 0) {
    return (
      <EmptyState
        title="No featured shops available"
        description="We could not find any approved shops for this district yet."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {safeEntities.slice(0, 4).map((entity) => (
        <SovereignEntityCard
          key={`partner-${entity.id}`}
          entity={entity}
          variant="grid"
          onTrack={onTrack}
        />
      ))}
    </div>
  );
}

export default FeaturedShops;
