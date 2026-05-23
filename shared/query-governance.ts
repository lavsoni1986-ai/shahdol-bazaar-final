// Sovereign Query Key Governance
// Single source of truth for all React Query keys
// Prevents cache fragmentation and duplicate requests

export const QUERY_KEYS = {
  // District-scoped queries
  district: {
    homeSnapshot: (districtId: number) => ["district", districtId, "home-snapshot"] as const,
    stores: (districtId: number, filters?: any) => ["district", districtId, "stores", filters] as const,
    products: (districtId: number, filters?: any) => ["district", districtId, "products", filters] as const,
    services: (districtId: number, filters?: any) => ["district", districtId, "services", filters] as const,
  },

  // Global queries (district-agnostic)
  global: {
    districts: () => ["global", "districts"] as const,
    health: () => ["global", "system-health"] as const,
    stats: () => ["global", "stats"] as const,
  },

  // User-scoped queries
  user: {
    balance: (userId: number) => ["user", userId, "balance"] as const,
    preferences: (userId: number) => ["user", userId, "preferences"] as const,
    history: (userId: number) => ["user", userId, "history"] as const,
  },

  // Legacy keys (to be migrated)
  legacy: {
    home: ["home"],
    snapshot: ["snapshot"],
    marketplace: ["marketplace"],
    trending: ["trending"],
    pulse: ["pulse"],
  }
} as const;

// Query configuration presets
export const QUERY_CONFIG = {
  // District data - cached for 5 minutes
  district: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  // Real-time data - cached for 30 seconds
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60 * 1000, // 1 minute
  },

  // Static data - cached for 1 hour
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },

  // User data - cached for 2 minutes
  user: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  }
} as const;