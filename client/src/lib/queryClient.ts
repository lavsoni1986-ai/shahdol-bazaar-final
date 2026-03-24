import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

const ENV_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const BASE_URL = ENV_BASE || "";

function sanitizeDistrictSlug(raw: string | null | undefined): string {
  if (!raw) return "shahdol";
  const normalized = raw.trim().toLowerCase().split(":")[0].replace(/[^a-z0-9-]/g, "");
  return normalized || "shahdol";
}

function getTenantHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return { "x-district-id": "1", "x-district-slug": "shahdol" };
  }

  const storedId = Number(localStorage.getItem("districtId") || 1);
  const districtId = Number.isInteger(storedId) && storedId > 0 ? storedId : 1;
  const districtSlug = sanitizeDistrictSlug(localStorage.getItem("districtSlug"));
  return {
    "x-district-id": String(districtId),
    "x-district-slug": districtSlug,
  };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // If url is already absolute, use it, otherwise prepend BASE_URL
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...getTenantHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/");
    const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
    
    const res = await fetch(fullUrl, {
      headers: getTenantHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (was Infinity - too aggressive)
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1, // Retry once on failure
      retryDelay: 1000,
      // Enable request deduplication
      structuralSharing: true,
    },
    mutations: {
      retry: false,
    },
  },
});
