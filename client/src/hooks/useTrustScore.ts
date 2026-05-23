import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";

export function useTrustScore(vendorId: number, districtId?: number) {
  return useQuery({
    queryKey: ["trust-score", vendorId, districtId],
    queryFn: async () => {
      if (!districtId) return null;
      return apiRequest("GET", `/marketplace/vendors/${vendorId}/trust-score`);
    },
    enabled: !!vendorId && !!districtId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useBatchTrustScores(vendorIds: number[], districtId?: number) {
  return useQuery({
    queryKey: ["trust-scores", vendorIds, districtId],
    queryFn: async () => {
      if (!districtId || vendorIds.length === 0) return {};
      const ids = vendorIds.join(',');
      return apiRequest("GET", `/marketplace/vendors/trust-scores?ids=${ids}`);
    },
    enabled: !!districtId && vendorIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}