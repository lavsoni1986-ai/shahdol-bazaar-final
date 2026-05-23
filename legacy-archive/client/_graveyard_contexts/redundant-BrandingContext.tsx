// BharatOS - White-Label District Branding Context
// UI Slave: Only reads from useDistrict(), no API calls

import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
import { useDistrict } from "./DistrictContext";

type BrandingContextType = {
  district: any;
  isLoading: boolean;
  primaryColor: string;
  secondaryColor: string;
  goldColor: string;
  districtName: string;
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { currentDistrict, isReady } = useDistrict();

  // 🎨 Apply colors ONLY when district is ready
  useEffect(() => {
    if (!isReady || !currentDistrict) return;

    const root = document.documentElement;
    root.style.setProperty('--primary', currentDistrict.primaryColor || '#f97316');
    root.style.setProperty('--district-gold', '#FFB800');
    root.style.setProperty('--district-dark', '#030003');
    
    document.title = `${currentDistrict.name} Bazaar | BharatOS`;
  }, [currentDistrict, isReady]);

  const value = useMemo(() => ({
    district: currentDistrict,
    isLoading: !isReady,
    primaryColor: currentDistrict?.primaryColor || '#f97316',
    secondaryColor: currentDistrict?.secondaryColor || '#22c55e',
    goldColor: '#FFB800',
    districtName: currentDistrict?.name || 'Shahdol',
  }), [currentDistrict, isReady]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
