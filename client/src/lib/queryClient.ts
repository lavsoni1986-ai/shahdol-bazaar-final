import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 403 || error?.response?.status === 401) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: any) => {
        if (error?.response?.status === 403) {
          console.error("🚨 [QUERY] Sovereign Lockdown - Cross-district access denied");
          window.location.href = "/";
        }
        if (error?.response?.status === 401) {
          console.error("🚨 [QUERY] Unauthorized - Redirecting to login");
          const currentPath = window.location.pathname;
          const isPartnerContext =
            currentPath.includes("/partner") ||
            currentPath.includes("/merchant");

          window.location.href = isPartnerContext
            ? "/auth?role=partner"
            : "/auth";
        }
      },
    },
  },
});