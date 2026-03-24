/**
 * API Client Utility
 * Handles API requests with proper URL resolution for development and production
 * 
 * SECURITY: 
 * - Access tokens stored EXCLUSIVELY in httpOnly cookies (XSS safe)
 * - Cookies automatically included via credentials: 'include'
 * - NO localStorage tokens - relies entirely on server-side session verification
 * - District isolation via x-district-slug header (configurable via env vars)
 */

const SANITIZE_URL = (url: string) => url.replace(/(:\d+|:undefined|:null|:nan)(\/?\?|$)/g, '$2');
const reservedSlugs = [
  "marketplace-stores",
  "schools",
  "school",
  "school-inquiry",
  "bus",
  "hospitals",
  "services",
];
const RESERVED_DISTRICT_SLUGS = new Set(reservedSlugs);

/**
 * Get the API base URL
 * - In production: Uses same origin (API routes are on same domain)
 * - In development: Uses VITE_API_URL or defaults to localhost:5001 (backend server)
 */
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const Default = API_BASE;

export function getApiBaseUrl(): string {
  return API_BASE;
}

function sanitizeDistrictSlug(raw: string | null | undefined): string {
  if (!raw) return "shahdol";
  const normalized = raw.trim().toLowerCase().split(":")[0].replace(/[^a-z0-9-]/g, "");
  return normalized || "shahdol";
}

function sanitizeApiPathSuffixes(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => segment.replace(/:(?:\d+|undefined|null|nan)$/i, ""))
    .join("/");
}

function normalizeApiUrl(inputUrl: string): string {
  if (typeof window === "undefined") return inputUrl;

  try {
    const parsed = new URL(SANITIZE_URL(inputUrl), window.location.origin);
    if (!parsed.pathname.startsWith("/api/")) {
      return SANITIZE_URL(parsed.toString());
    }

    parsed.pathname = sanitizeApiPathSuffixes(parsed.pathname);
    if (parsed.pathname.startsWith("/api/districts/")) {
      const parts = parsed.pathname.split("/");
      if (parts[3]) {
        const normalizedSlug = sanitizeDistrictSlug(parts[3]);
        parts[3] = RESERVED_DISTRICT_SLUGS.has(normalizedSlug) ? "shahdol" : normalizedSlug;
        parsed.pathname = parts.join("/");
      }
    }
    return SANITIZE_URL(parsed.toString());
  } catch {
    return SANITIZE_URL(inputUrl);
  }
}

function getTenantHeaders(): Record<string, string> {
  // SSR mode: use environment variable defaults
  if (typeof window === "undefined") {
    return { 
      "x-district-id": String(import.meta.env.VITE_DEFAULT_DISTRICT_ID || 3), 
      "x-district-slug": import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol",
      "x-requested-with": "shahdol-bazaar"
    };
  }

  // Browser mode - try sessionStorage first, fallback to localStorage
  // District sync: sessionStorage (tab-specific) -> localStorage (persistent)
  let districtSlug = sessionStorage.getItem("districtSlug") || localStorage.getItem("districtSlug");
  let storedId = sessionStorage.getItem("districtId") || localStorage.getItem("districtId");
  
  // If no district context, use environment variable defaults
  if (!districtSlug && !storedId) {
    return { 
      "x-district-id": String(import.meta.env.VITE_DEFAULT_DISTRICT_ID || 3), 
      "x-district-slug": import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol",
      "x-requested-with": "shahdol-bazaar"
    };
  }
  
  // Validate stored ID
  const numericId = storedId ? Number(storedId) : null;
  if (storedId && (!Number.isInteger(numericId) || (numericId as number) <= 0)) {
    return { 
      "x-district-id": String(import.meta.env.VITE_DEFAULT_DISTRICT_ID || 3), 
      "x-district-slug": import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol",
      "x-requested-with": "shahdol-bazaar"
    };
  }
  
  // Validate slug
  const sanitizedSlug = districtSlug ? sanitizeDistrictSlug(districtSlug) : null;
  if (districtSlug && !sanitizedSlug) {
    return { 
      "x-district-id": String(import.meta.env.VITE_DEFAULT_DISTRICT_ID || 3), 
      "x-district-slug": import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol",
      "x-requested-with": "shahdol-bazaar"
    };
  }
  
  return {
    "x-district-id": storedId || String(numericId) || String(import.meta.env.VITE_DEFAULT_DISTRICT_ID || 3),
    "x-district-slug": sanitizedSlug || import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol",
    "x-requested-with": "shahdol-bazaar", // CSRF protection - custom header
  };
}

/**
 * Get stored access token from localStorage
 * DEPRECATED: This function is kept for backward compatibility but should NOT be used.
 * The frontend now relies EXCLUSIVELY on httpOnly cookies for authentication.
 * Use /api/auth/verify endpoint for session state verification.
 * @deprecated Remove all localStorage token usage
 */
function getStoredAccessToken(): string | null {
  // SECURITY: We no longer use localStorage for tokens
  // This function returns null to enforce cookie-only authentication
  return null;
}

/**
 * Make an API request with proper error handling
 * 
 * SECURITY: Uses httpOnly cookies exclusively for authentication (credentials: 'include')
 * No localStorage tokens - relies entirely on server-side session
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const rawUrl = SANITIZE_URL(endpoint.startsWith('http') 
    ? endpoint 
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  const url = SANITIZE_URL(normalizeApiUrl(rawUrl));
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // NO localStorage tokens - rely exclusively on httpOnly cookies
      ...getTenantHeaders(),
      ...(options?.headers as Record<string, string>),
    };
    
    const response = await fetch(SANITIZE_URL(url), {
      ...options,
      credentials: 'include', // CRITICAL: Send httpOnly cookies only
      headers,
    });
    
    if (!response.ok) {
      // Handle 401 - token expired or invalid
      if (response.status === 401) {
        // Clear district context from sessionStorage (auth state handled by AuthContext via /api/auth/verify)
        sessionStorage.removeItem("districtSlug");
        sessionStorage.removeItem("districtId");
        window.dispatchEvent(new StorageEvent("auth-update", { key: "user", newValue: null }));
      }
      const error = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(error.message || 'API request failed');
    }
    
    return await response.json();
  } catch (error: any) {
    console.error(`[API] Request failed: ${url}`, error);
    throw error;
  }
}

/**
 * Get full API URL for a given endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const rawUrl = SANITIZE_URL(endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  return SANITIZE_URL(normalizeApiUrl(rawUrl));
}
