// DistrictContext - White-Label Multi-district SaaS
// Centralized district fetching to prevent repeated API calls

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";

export interface DistrictInfo {
  id: number;
  name: string;
  slug: string;
  state?: string;
  description?: string;
  imageUrl?: string;
}

interface DistrictContextType {
  currentDistrict: DistrictInfo | null;
  isLoading: boolean;
  error: string | null;
  setCurrentDistrict: (district: DistrictInfo | null) => void;
  refreshDistrict: () => Promise<void>;
}

const DistrictContext = createContext<DistrictContextType | undefined>(undefined);

// Default to Shahdol (ID: 2)
const DEFAULT_DISTRICT: DistrictInfo = {
  id: 2,
  name: "Shahdol",
  slug: "shahdol",
  state: "Madhya Pradesh",
};

export function DistrictProvider({ children }: { children: ReactNode }) {
  const [currentDistrict, setCurrentDistrict] = useState<DistrictInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDistrict = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get district slug from URL or localStorage
      const pathParts = window.location.pathname.split("/");
      
      // Explicitly ignore marketplace routes - these are not districts
      const urlDistrictSlug = pathParts.find(
        (part, index) => {
          if (index === 0 || !part) return false;
          // Skip marketplace and related routes
          if (part === 'marketplace' || part.startsWith('marketplace')) return false;
          // Skip API, auth, admin paths
          if (["api", "auth", "admin"].includes(part)) return false;
          return true;
        }
      );
      
      const districtSlug = urlDistrictSlug || localStorage.getItem("districtSlug") || "shahdol";

      // Fetch district from API - ONCE at app start
      const res = await fetch(`/api/districts/${districtSlug}`);
      
      if (res.ok) {
        const data = await res.json();
        setCurrentDistrict(data);
        localStorage.setItem("districtSlug", data.slug);
        localStorage.setItem("districtId", String(data.id));
      } else {
        // Fallback to default Shahdol
        console.warn(`[DistrictContext] Failed to fetch district: ${res.status}, using default`);
        setCurrentDistrict(DEFAULT_DISTRICT);
        localStorage.setItem("districtSlug", "shahdol");
        localStorage.setItem("districtId", "2");
      }
    } catch (err) {
      console.error("[DistrictContext] Error fetching district:", err);
      // Fallback to default Shahdol on error
      setCurrentDistrict(DEFAULT_DISTRICT);
      localStorage.setItem("districtSlug", "shahdol");
      localStorage.setItem("districtId", "2");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch district ONCE on mount
  useEffect(() => {
    fetchDistrict();
  }, []);

  const refreshDistrict = useCallback(async () => {
    await fetchDistrict();
  }, []);

  const setCurrentDistrictCallback = useCallback((district: DistrictInfo | null) => {
    setCurrentDistrict(district);
  }, []);

  const value = useMemo(() => ({
    currentDistrict,
    isLoading,
    error,
    setCurrentDistrict: setCurrentDistrictCallback,
    refreshDistrict,
  }), [currentDistrict, isLoading, error, setCurrentDistrictCallback, refreshDistrict]);

  return (
    <DistrictContext.Provider value={value}>
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict() {
  const context = useContext(DistrictContext);
  if (context === undefined) {
    throw new Error("useDistrict must be used within a DistrictProvider");
  }
  return context;
}

// Hook to get district ID for API calls
export function useDistrictId() {
  const { currentDistrict } = useDistrict();
  return currentDistrict?.id || 3; // Default to Shahdol (ID: 3)
}

export default DistrictContext;
