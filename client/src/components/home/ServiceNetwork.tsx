import { useMemo } from "react";
import { useDistrict } from "@/contexts/DistrictContext";
import { normalizeCanonicalEntities, type CanonicalEntity } from "@/shared/api/response-normalizers";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";

interface ServiceNetworkProps {
  workers?: any[];
  isLoading?: boolean;
}

export default function ServiceNetwork({ workers = [], isLoading = false }: ServiceNetworkProps) {
  const { currentDistrict, isReady: districtReady } = useDistrict();

  const canonicalServices = useMemo<CanonicalEntity[]>(() => {
    if (!currentDistrict?.slug || !Array.isArray(workers)) return [];
    return normalizeCanonicalEntities(workers, currentDistrict.slug, "service");
  }, [workers, currentDistrict?.slug]);

  // Loading state
  if (!districtReady || isLoading) {
    return (
      <div className="text-white/40 text-center py-8">Loading service network...</div>
    );
  }

  // Empty state
  if (!canonicalServices || canonicalServices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-white/40">No service providers found</div>
      </div>
    );
  }

  // Success state
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {canonicalServices.map((service, index) => (
        <SovereignEntityCard key={`service-${service.slug || service.id}-${index}`} entity={service} variant="grid" />
      ))}
    </div>
  );
}
