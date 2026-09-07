import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";
import { normalizeDistrictSnapshot, type CanonicalDistrictSnapshot } from "@/shared/api/response-normalizers";
import { QUERY_KEYS, QUERY_CONFIG } from "@shared/query-governance";
import { isReservedRoute, isValidDistrictSlug } from "@/shared/routing/reserved-routes";

export function useHomeSnapshot() {
  const { currentDistrict } = useDistrict();
  const [location] = useLocation();

  const isHomeRoute =
    location === "/" ||
    location === "/home" ||
    location === "" ||
    (Boolean(currentDistrict?.slug) && location === `/${currentDistrict?.slug}`);

  const hasValidDistrict = Boolean(
    currentDistrict?.id &&
    currentDistrict?.slug &&
    !isReservedRoute(currentDistrict.slug) &&
    isValidDistrictSlug(currentDistrict.slug)
  );

  return useQuery({
    queryKey: QUERY_KEYS.district.homeSnapshot(currentDistrict?.id || 0),
    queryFn: async (): Promise<CanonicalDistrictSnapshot> => {
      console.log('🏠 [HOME SNAPSHOT] Fetching district home data for:', currentDistrict?.slug);

      const response = await apiRequest("GET", "marketplace/home-snapshot", undefined, {
        headers: currentDistrict?.slug ? { "x-district-slug": currentDistrict.slug } : undefined,
      });
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
    enabled: Boolean(hasValidDistrict && isHomeRoute),
    ...QUERY_CONFIG.district,
  });
}
