// 📁 client/src/hooks/useLoadMore.ts
import { useState, useCallback, useMemo } from "react";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { legacyApiRequest } from "@/lib/api-compat";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginatedMeta;
}

interface UseLoadMoreOptions<T> {
  key: any[];
  endpoint: string;
  initialPage?: number;
  initialLimit?: number;
  enabled?: boolean;
}

export function useLoadMore<T>({
  key,
  endpoint,
  initialPage = 1,
  initialLimit = 20,
  enabled = true,
}: UseLoadMoreOptions<T>) {
  const [page, setPage] = useState(initialPage);

  const queryKey = useMemo(
    () => [...key, page],
    [key, page]
  );

  const queryEndpoint = useMemo(
    () => `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&limit=${initialLimit}`,
    [endpoint, page, initialLimit]
  );

  const queryResult = useQuery<PaginatedResult<T>>({
    queryKey,
    queryFn: async () => {
      const res = await legacyApiRequest("GET", queryEndpoint);
      
      if (!res || res.success === false) {
        throw new Error(res?.error || "Failed to fetch data");
      }

      const data = res.data ?? [];
      const items = Array.isArray(data) ? data : [];
      
      return {
        items: items as T[],
        meta: res?.meta ?? { page, limit: initialLimit, total: items.length, totalPages: 1 },
      };
    },
    enabled: enabled && !!key[0],
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData ?? undefined,
  });

  const hasNextPage = queryResult.data 
    ? queryResult.data.meta.page < queryResult.data.meta.totalPages 
    : false;

  const loadMore = useCallback(() => {
    if (hasNextPage && !queryResult.isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasNextPage, queryResult.isFetching]);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  }, []);

  return {
    ...queryResult,
    items: queryResult.data?.items ?? [],
    meta: queryResult.data?.meta ?? { page: 1, limit: initialLimit, total: 0, totalPages: 1 },
    page,
    setPage: goToPage,
    loadMore,
    reset,
    hasNextPage,
    isLoadingMore: queryResult.isFetching && page > 1,
  };
}
