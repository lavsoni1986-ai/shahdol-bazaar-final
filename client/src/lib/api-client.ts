/**
 * API Client Utility
 * Handles API requests with proper URL resolution for development and production
 */

/**
 * Get the API base URL
 * - In production: Uses same origin (API routes are on same domain)
 * - In development: Uses VITE_API_URL or defaults to localhost:5000
 */
export function getApiBaseUrl(): string {
  // Browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    if (isProduction) {
      // Production: API is on same domain (Vercel serverless functions)
      return window.location.origin;
    }
  }
  
  // Development or SSR: use environment variable or default
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Default to localhost for development
  return 'http://localhost:5000';
}

/**
 * Make an API request with proper error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
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
  return endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}
