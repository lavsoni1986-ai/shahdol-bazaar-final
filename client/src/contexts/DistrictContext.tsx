// Sovereign District Context Provider
// Matches existing component contracts for seamless migration
// Governed by central contract definitions

import React, { createContext, useContext, useEffect, useState } from 'react';
import { District, DistrictContextContract, validateContract, CONTRACT_VALIDATION_RULES } from '@shared/contracts';
import { extractDistrictSlug, isReservedRoute, isValidDistrictSlug } from '@/shared/routing/reserved-routes';

const DistrictContext = createContext<DistrictContextContract | undefined>(undefined);

export function getDistrictIdFromSlug(slug: string): number {
  switch (slug.toLowerCase()) {
    case "shahdol":
      return 1;
    case "anuppur":
      return 2;
    case "umaria":
      return 3;
    default:
      return 1;
  }
}

/**
 * Canonical district slug resolver
 * Uses centralized extractDistrictSlug() from @/shared/routing/reserved-routes.
 * Guaranteed to never return a reserved route ("auth", "login", etc.).
 * Preserves existing valid district context from localStorage or falls back to "shahdol".
 */
export function resolveDistrictSlugFromPath(path: string): string {
  // 1. Try extracting district slug from URL path (e.g. /shahdol, /anuppur, /umaria)
  const urlSlug = extractDistrictSlug(path);
  if (urlSlug && isValidDistrictSlug(urlSlug) && !isReservedRoute(urlSlug)) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("districtSlug", urlSlug);
      } catch {}
    }
    return urlSlug;
  }

  // 2. If path is a reserved route (e.g. /auth, /login) or root ("/"), preserve existing valid district
  if (typeof window !== "undefined") {
    try {
      const savedSlug = localStorage.getItem("districtSlug");
      if (savedSlug && isValidDistrictSlug(savedSlug) && !isReservedRoute(savedSlug)) {
        return savedSlug;
      }
      // Purge invalid/reserved values if present in localStorage
      if (savedSlug && (isReservedRoute(savedSlug) || !isValidDistrictSlug(savedSlug))) {
        localStorage.removeItem("districtSlug");
      }
    } catch {}
  }

  // 3. Canonical default fallback
  return "shahdol";
}

export function createDistrictObject(slug: string): District {
  return {
    id: getDistrictIdFromSlug(slug),
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
  };
}

export function DistrictProvider({ children }: { children: React.ReactNode }) {
  const [currentDistrict, setDistrict] = useState<District | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncDistrict = () => {
      const path = window.location.pathname;
      const slug = resolveDistrictSlugFromPath(path);
      const district = createDistrictObject(slug);

      setDistrict((prev) => {
        if (prev && prev.slug === district.slug && prev.id === district.id) {
          return prev;
        }
        return district;
      });

      setIsLoading(false);
    };

    syncDistrict();
    window.addEventListener("popstate", syncDistrict);
    return () => window.removeEventListener("popstate", syncDistrict);
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
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return resolveDistrictSlugFromPath(path);
}
