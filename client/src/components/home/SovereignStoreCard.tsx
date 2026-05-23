// 🛡️ BHARAT-OS: BACKWARD-COMPATIBLE SOVEREIGN STORE CARD RE-EXPORT
// This file re-exports from the canonical shared SovereignStoreCard.
// Every store card should import from @/components/shared/SovereignStoreCard directly.
// This file exists only for backward compatibility during migration.

import { memo } from "react";
import { SovereignStoreCard as CanonicalStoreCard, type StoreCardData } from "@/components/shared/SovereignStoreCard";

interface LegacyProps {
  data: StoreCardData | any;
  onTrack?: (action: string, item: string) => void;
}

export const SovereignStoreCard = memo(function SovereignStoreCard({ data, onTrack }: LegacyProps) {
  return (
    <CanonicalStoreCard
      data={data as StoreCardData}
      variant="marketplace"
      onTrack={onTrack ? (action, id) => onTrack(action, `store_${id}`) : undefined}
    />
  );
});

export default SovereignStoreCard;
