// BharatOS - White-Label District Branding Context
// Supports dynamic theming for any district in India
// Lav Digital Style: #FFB800 Gold highlights, #030303 deep backgrounds

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";

export type District = {
  id: number;
  name: string;
  slug: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  goldColor?: string;  // Lav's Gold: #FFB800
  darkBg?: string;      // Lav's Deep: #030303
  logoUrl?: string;
  faviconUrl?: string;
  dsslContact?: string;
  dsslEmail?: string;
  isActive: boolean;
  isDefault: boolean;
  metaTitle?: string;
  metaDescription?: string;
};

// Default Shahdol district configuration with Lav Digital Style
const DEFAULT_DISTRICT: District = {
  id: 1,
  name: "Shahdol",
  slug: "shahdol",
  state: "Madhya Pradesh",
  primaryColor: "#f97316", // Orange
  secondaryColor: "#22c55e", // Green
  goldColor: "#FFB800",      // Lav's Gold
  darkBg: "#030303",         // Lav's Deep Background
  logoUrl: "/logo.webp",
  faviconUrl: "/maskable_icon_x192.png",
  dsslContact: "919753239303",
  dsslEmail: "dssl@shahdolbazaar.com",
  isActive: true,
  isDefault: true,
  metaTitle: "Shahdol Bazaar - Shahdol ki Apni Digital Dukaan",
  metaDescription: "Shahdol ke sabse bade online marketplace se judeye aur ghar baithe shopping kaiye.",
};

function sanitizeDistrictSlug(raw: string | null | undefined): string {
  if (!raw) return "shahdol";
  const normalized = raw.trim().toLowerCase().split(":")[0].replace(/[^a-z0-9-]/g, "");
  return normalized || "shahdol";
}

const reservedSlugs = [
  "api",
  "auth",
  "admin",
  "login",
  "marketplace",
  "marketplace-stores",
  "school",
  "schools",
  "school-inquiry",
  "bus",
  "shop",
  "cart",
  "checkout",
  "orders",
  "customer-dashboard",
  "partner",
  "vendor",
  "merchant-signup",
  "merchant-onboarding",
  "merchant-store-setup",
];
const RESERVED_APP_ROUTES = new Set(reservedSlugs);

// 🚨 CRITICAL: Super Admin route detector
const isAdminOrPartnerRoute = (path: string): boolean => {
  const p = path.toLowerCase();
  return p.startsWith('/admin') || p.startsWith('/partner') || p.startsWith('/merchant');
};

type BrandingContextType = {
  district: District;
  setDistrict: (district: District) => void;
  switchDistrict: (districtId: number) => Promise<void>;  // For Super Admin district switching
  isLoading: boolean;
  primaryColor: string;
  secondaryColor: string;
  goldColor: string;    // Lav's Gold
  darkBg: string;        // Lav's Deep Background
  districtName: string;
  formatDistrictName: (suffix: string) => string;
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  // ============================================================
  // SYNCHRONOUS RESERVED ROUTE CHECK - Prevents 404 API leaks
  // Runs BEFORE useEffect to avoid fetching district for app routes
  // ============================================================
  // ✅ Combined & Clean version - Single getInitialDistrict function
  const getInitialDistrict = (): District => {
    if (typeof window === 'undefined') return DEFAULT_DISTRICT;
    
    try {
      // 🚩 Super Admin के लिए Null/Undefined चेक करें
      const path = window.location?.pathname || window.location?.href || '';
      const lowerPath = path.toLowerCase();
      
      // 🚨 CRITICAL: Check for admin/partner routes FIRST - handle any sub-paths
      const isAdminOrPartner = lowerPath.startsWith('/admin') || 
                               lowerPath.startsWith('/partner') || 
                               lowerPath.startsWith('/merchant') ||
                               lowerPath.includes('/admin/') ||
                               lowerPath.includes('/partner/') ||
                               lowerPath.includes('/merchant/');
      
      if (isAdminOrPartner) {
        console.log("🛡️ [BRANDING-SYNC] Admin/Partner route detected:", path);
        return DEFAULT_DISTRICT; 
      }

      const pathParts = path.split('/').filter(Boolean);
      const firstSegment = pathParts[0]?.toLowerCase();

      // अगर कोई स्लग नहीं मिलता, तो 'shahdol' (Orange) को डिफ़ॉल्ट मानें
      if (!firstSegment) {
        return DEFAULT_DISTRICT; 
      }

      // Check localStorage for districtId - if null/undefined, default to Shahdol
      const storedDistrictId = localStorage.getItem('districtId');
      const districtIdNum = storedDistrictId ? parseInt(storedDistrictId, 10) : null;
      
      // If no valid districtId (null, undefined, 0, or NaN), default to Shahdol
      if (!districtIdNum || districtIdNum <= 0 || isNaN(districtIdNum)) {
        console.log("🛡️ [BRANDING-SYNC] No valid districtId, using DEFAULT_DISTRICT (Shahdol)");
        localStorage.setItem('districtId', String(DEFAULT_DISTRICT.id));
        localStorage.setItem('district', JSON.stringify(DEFAULT_DISTRICT));
        return DEFAULT_DISTRICT;
      }
      
      // Check localStorage for stored district
      try {
        const stored = localStorage.getItem('district');
        if (stored) return JSON.parse(stored);
      } catch {}
      return DEFAULT_DISTRICT;
    } catch (e) {
      console.warn("🚨 [BRANDING] Error in getInitialDistrict:", e);
      return DEFAULT_DISTRICT;
    }
  };

  // Check if we should skip loading for admin/partner routes
  // This runs during initial state initialization
  const shouldSkipLoading = (): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      const path = window.location?.pathname || window.location?.href || '';
      // Check for /admin, /partner, /merchant routes - handle any sub-paths
      const lowerPath = path.toLowerCase();
      return lowerPath.startsWith('/admin') || 
             lowerPath.startsWith('/partner') || 
             lowerPath.startsWith('/merchant') ||
             lowerPath.includes('/admin/') ||
             lowerPath.includes('/partner/') ||
             lowerPath.includes('/merchant/');
    } catch (e) {
      console.warn("🚨 [BRANDING] Error in shouldSkipLoading:", e);
      return false;
    }
  };

  // Lazy initialization from localStorage to prevent re-initialization on navigation
  const [district, setDistrict] = useState<District>(getInitialDistrict);
  // 🚨 CRITICAL: Set isLoading to false immediately for admin/partner routes
  const [isLoading, setIsLoading] = useState(!shouldSkipLoading());

  const setDistrictCallback = useCallback((d: District) => setDistrict(d), []);

  // 🗺️ Switch District - For Super Admin multi-district management
  const switchDistrict = useCallback(async (districtId: number) => {
    try {
      console.log(`[BRANDING] Switching to district ID: ${districtId}`);
      
      // Fetch the district by ID
      const res = await fetch(`/api/districts/id/${districtId}`);
      if (res.ok) {
        const newDistrict = await res.json();
        setDistrict(newDistrict);
        localStorage.setItem('districtId', String(districtId));
        localStorage.setItem('district', JSON.stringify(newDistrict));
        localStorage.setItem('districtSlug', newDistrict.slug);
        console.log(`[BRANDING] Switched to district: ${newDistrict.name}`);
      } else {
        console.error(`[BRANDING] Failed to fetch district ${districtId}`);
      }
    } catch (error) {
      console.error('[BRANDING] Error switching district:', error);
    }
  }, []);

  useEffect(() => {
    // 🚩 Synchronous Bypass - Admin/Partner/Root के लिए लोडिंग तुरंत बंद करें
    const path = window.location.pathname;
    if (path === '/' || path.startsWith('/admin') || path.startsWith('/partner')) {
      // 🚩 CRITICAL: Supply default Shahdol data so Layout doesn't crash
      setDistrict(DEFAULT_DISTRICT);
      setIsLoading(false); // 🚩 Root/Admin/Partner के लिए लोडिंग तुरंत बंद करें
      return; 
    }
    
    // Detect district from URL
    const detectDistrict = async () => {
      // 🚨 CRITICAL: Check for admin/partner routes FIRST - resolve immediately BEFORE any fetch
      const path = window.location?.pathname || '';
      const lowerPath = path.toLowerCase();
      
      // Check for /admin, /partner, /merchant routes - handle any sub-paths
      if (lowerPath.startsWith('/admin') || lowerPath.startsWith('/partner')) {
        console.log("🛡️ [BRANDING] Admin/Partner route detected, using DEFAULT immediately:", path);
        setDistrict(DEFAULT_DISTRICT);
        setIsLoading(false);
        return; 
      }
      
      // Check if this is an admin/partner route - resolve synchronously
      const isAdminOrPartner = lowerPath.startsWith('/admin') || 
                               lowerPath.startsWith('/partner') || 
                               lowerPath.startsWith('/merchant') ||
                               lowerPath.includes('/admin/') ||
                               lowerPath.includes('/partner/') ||
                               lowerPath.includes('/merchant/');
      
      // Check if this is an admin/partner route - resolve synchronously
      if (isAdminOrPartner) {
        console.log("🛡️ [BRANDING] Admin/Partner route detected:", path);
        setDistrict(DEFAULT_DISTRICT);
        setIsLoading(false);
        return;
      }
      
      // 🚨 SUPER ADMIN FALLBACK: Check if user is Super Admin with NULL districtId
      // If districtId is null/undefined/0, default to Shahdol instantly
      const storedDistrictId = localStorage.getItem('districtId');
      const districtIdNum = storedDistrictId ? parseInt(storedDistrictId, 10) : null;
      
      if (!districtIdNum || districtIdNum <= 0 || isNaN(districtIdNum)) {
        console.log("🛡️ [BRANDING] Super Admin / No valid districtId - using Shahdol defaults");
        localStorage.setItem("districtSlug", "shahdol");
        localStorage.setItem("districtId", String(DEFAULT_DISTRICT.id));
        setDistrict(DEFAULT_DISTRICT);
        localStorage.setItem("district", JSON.stringify(DEFAULT_DISTRICT));
        setIsLoading(false);
        return;
      }

      try {
        const hostname = window.location.hostname;
        const pathParts = path.split('/').filter(Boolean);
        const firstSegment = pathParts[0]?.toLowerCase();
        
        // Extract district slug from subdomain or path
        // Example: shahdol.bharatos.in or bharatos.in/shahdol
        let districtSlug = "shahdol"; // Default
        
        // Check for subdomain (e.g., shahdol.bharatos.in)
        const subdomain = hostname.split('.')[0];
        if (subdomain !== "www" && subdomain !== "bharatos" && subdomain !== "localhost") {
          districtSlug = sanitizeDistrictSlug(subdomain);
        }
        
        // Override with path segment if not reserved
        if (firstSegment && !RESERVED_APP_ROUTES.has(firstSegment)) {
          districtSlug = firstSegment;
        }

        localStorage.setItem("districtSlug", districtSlug);
        localStorage.setItem("districtId", String(DEFAULT_DISTRICT.id));
        let res = await fetch(`/api/districts/${districtSlug}`);
        if (!res.ok && districtSlug !== "shahdol") {
          districtSlug = "shahdol";
          localStorage.setItem("districtSlug", districtSlug);
          res = await fetch(`/api/districts/${districtSlug}`);
        }

        if (res.ok) {
          const data = await res.json();
          setDistrict(data);
          localStorage.setItem("district", JSON.stringify(data));
          localStorage.setItem("districtSlug", sanitizeDistrictSlug(data?.slug || districtSlug));
          localStorage.setItem("districtId", String(data?.id || DEFAULT_DISTRICT.id));
        } else {
          setDistrict(DEFAULT_DISTRICT);
          localStorage.setItem("district", JSON.stringify(DEFAULT_DISTRICT));
          localStorage.setItem("districtSlug", DEFAULT_DISTRICT.slug);
          localStorage.setItem("districtId", String(DEFAULT_DISTRICT.id));
        }
      } catch (e) {
        console.log("Using default district configuration");
        setDistrict(DEFAULT_DISTRICT);
        localStorage.setItem("district", JSON.stringify(DEFAULT_DISTRICT));
        localStorage.setItem("districtSlug", DEFAULT_DISTRICT.slug);
        localStorage.setItem("districtId", String(DEFAULT_DISTRICT.id));
      } finally {
        setIsLoading(false);
      }
    };

    detectDistrict();
    
    // 🚨 EMERGENCY FALLBACK: If loading gets stuck for > 5 seconds, force it to false
    // This is a safety net for any edge cases, but admin/partner routes now resolve instantly
    const loadingTimeout = setTimeout(() => {
      console.warn("🚨 [BRANDING] Loading timeout - forcing isLoading to false");
      setDistrict(DEFAULT_DISTRICT);
      setIsLoading(false);
    }, 5000);
    
    return () => clearTimeout(loadingTimeout);
  }, []);

  // Apply dynamic CSS variables based on district colors
  useEffect(() => {
    if (district.primaryColor) {
      document.documentElement.style.setProperty('--district-primary', district.primaryColor);
    }
    if (district.secondaryColor) {
      document.documentElement.style.setProperty('--district-secondary', district.secondaryColor);
    }
    // Lav Digital Style: Gold highlights
    if (district.goldColor) {
      document.documentElement.style.setProperty('--district-gold', district.goldColor);
    }
    // Lav Digital Style: Deep background
    if (district.darkBg) {
      document.documentElement.style.setProperty('--district-dark', district.darkBg);
    }
    
    // Update document title and meta
    if (district.metaTitle) {
      document.title = district.metaTitle;
    }
  }, [district]);

  const formatDistrictName = useCallback((suffix: string) => {
    return `${district.name} ${suffix}`;
  }, [district.name]);

  const value = useMemo(() => ({
    district,
    setDistrict: setDistrictCallback,
    switchDistrict,
    isLoading,
    primaryColor: district.primaryColor,
    secondaryColor: district.secondaryColor,
    goldColor: district.goldColor || '#FFB800',
    darkBg: district.darkBg || '#030303',
    districtName: district.name,
    formatDistrictName,
  }), [district, setDistrictCallback, switchDistrict, isLoading, formatDistrictName]);

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

// Helper to get district from slug
export async function getDistrictBySlug(slug: string): Promise<District | null> {
  try {
    const safeSlug = sanitizeDistrictSlug(slug);
    const res = await fetch(`/api/districts/${safeSlug}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch district:", e);
  }
  return null;
}
