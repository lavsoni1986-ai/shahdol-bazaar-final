import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";
import { normalizeDistrictSnapshot, type CanonicalDistrictSnapshot } from "@/shared/api/response-normalizers";
import { QUERY_KEYS, QUERY_CONFIG } from "@shared/query-governance";

export function useHomeSnapshot() {
  const { currentDistrict } = useDistrict();

  return useQuery({
    queryKey: QUERY_KEYS.district.homeSnapshot(currentDistrict?.id || 0),
    queryFn: async (): Promise<CanonicalDistrictSnapshot> => {
      console.log('🏠 [HOME SNAPSHOT] Fetching district home data');

      const response = await apiRequest("GET", "marketplace/home-snapshot");
      const normalized = normalizeDistrictSnapshot(response);

      console.log('🏠 [HOME SNAPSHOT] Normalized data:', {
        partners: normalized.partners?.length || 0,
        products: normalized.products?.length || 0,
        services: normalized.services?.length || 0,
        hospitals: normalized.hospitals?.length || 0,
        schools: normalized.schools?.length || 0,
        recommendations: normalized.recommendations?.length || 0
      });

      return normalized;
    },
    enabled: !!currentDistrict?.id,
    ...QUERY_CONFIG.district,
  });
}
