import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { useDistrict } from "@/contexts/DistrictContext";

type QueryKey = (string | number | undefined | null)[];

export function useDistrictQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey" | "queryFn">
) {
  const { currentDistrict, isReady } = useDistrict();

  const districtId = currentDistrict?.id;
  const districtSlug = currentDistrict?.slug;

  return useQuery<TQueryFnData, TError, TData, TQueryKey>(
    {
      queryKey: [...queryKey, { districtId, districtSlug }] as any,
      queryFn,
      enabled: isReady && !!districtId,
      staleTime: 1000 * 60 * 5,
      ...options,
    }
  );
}

export function useDistrictMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn">
) {
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables) => {
      if (!districtId) {
        throw new Error("District not ready");
      }
      return mutationFn(variables);
    },
    ...options,
  });
}

export function createDistrictQueryKey(...keys: (string | number | undefined | null)[]) {
  return keys;
}