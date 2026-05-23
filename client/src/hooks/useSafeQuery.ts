// 🛡️ Standard API Response Contract
export interface SovereignResponse<T> {
  success: boolean;
  data: T | T[] | null;
  error: string | null;
  meta: {
    timestamp: string;
    districtId: number;
    requestId: string;
  };
}

// 📁 client/src/hooks/useSafeQuery.ts
import { useQuery, UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { legacyApiRequest } from "@/lib/api-compat";

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getDefaultMeta(): PaginatedResponse<any>["meta"] {
  return { page: 1, limit: 20, total: 0, totalPages: 1 };
}

function normalizeResponseData<T>(raw: unknown): PaginatedResponse<T> {
  const meta = getDefaultMeta();

  if (Array.isArray(raw)) {
    return { items: raw as T[], meta };
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid API response shape");
  }

  const candidate = raw as {
    items?: T[];
    data?: T[];
    meta?: Partial<PaginatedResponse<T>["meta"]>;
  };

  const items = Array.isArray(candidate.items)
    ? candidate.items
    : Array.isArray(candidate.data)
      ? candidate.data
      : null;

  if (!items) {
    throw new Error("Invalid API response shape");
  }

  return {
    items,
    meta: candidate.meta ? { ...meta, ...candidate.meta } : meta,
  };
}

interface SafeQueryOptions<T> extends Partial<UseQueryOptions<PaginatedResponse<T>>> {
  endpoint: string;
  key: any[];
}

export function useSafeQuery<T>({
  key,
  endpoint,
  ...options
}: SafeQueryOptions<T>) {
  return useQuery<PaginatedResponse<T>>({
    queryKey: key,
    queryFn: async () => {
      const res = await legacyApiRequest("GET", endpoint);
      
      if (!res || res.success === false) {
        const errorMsg = res?.error || "Unknown Sovereign Error";
        console.error(`🚨 [API ERROR] ${endpoint}:`, errorMsg);
        throw new Error(errorMsg);
      }

      const normalized = normalizeResponseData<T>(res.data);
      return {
        items: normalized.items,
        meta: normalized.meta,
      };
    },
    ...options,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateQuery(...keys: any[]) {
  const queryClient = useQueryClient();
  return () => {
    keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  };
}
