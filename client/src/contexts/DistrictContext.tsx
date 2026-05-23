// Sovereign District Context Provider
// Matches existing component contracts for seamless migration
// Governed by central contract definitions

import React, { createContext, useContext, useEffect, useState } from 'react';
import { District, DistrictContextContract, validateContract, CONTRACT_VALIDATION_RULES } from '@shared/contracts';

const DistrictContext = createContext<DistrictContextContract | undefined>(undefined);

export function DistrictProvider({ children }: { children: React.ReactNode }) {
  const [currentDistrict, setDistrict] = useState<District | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/([^\/]+)/);
    const slug = match ? match[1] : "shahdol";

    // Create district object matching existing contracts
    setDistrict({
      id: 1, // Default ID - TODO: Fetch from API
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
    });

    setIsLoading(false);
  }, []);

  return (
    <DistrictContext.Provider
      value={{
        currentDistrict,
        setDistrict,
        isLoading,
        isReady: !isLoading && !!currentDistrict,
      }}
    >
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict(): DistrictContextContract {
  const context = useContext(DistrictContext);
  if (context === undefined) {
    throw new Error('useDistrict must be used within DistrictProvider');
  }

  // Validate contract compliance
  if (context.currentDistrict !== null) {
    validateContract('district', context.currentDistrict, CONTRACT_VALIDATION_RULES.district);
  }

  return context;
}

export function getDistrictFromContext(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)/);
  return match ? match[1] : 'shahdol';
}
