import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { useState, useEffect } from "react";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { answer: "", results: [] };
      const response = await apiRequest("POST", "/ai/concierge", { message: debouncedQuery });
      return response.data;
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: false, // Disable automatic retries to prevent spam
  });
}

export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ["search-suggestions", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      return apiRequest("GET", `/search/suggestions?q=${encodeURIComponent(query)}`);
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}