/**
 * Public URL Utility
 * Detects the current public URL dynamically (for QR codes, sharing, etc.)
 * Works in development (localhost) and production (any domain)
 */

/**
 * Get the current public URL
 * @returns The public URL (e.g., https://shahdolbazaar.com or http://localhost:5173)
 */
export function getPublicUrl(): string {
  // In production (browser), use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for SSR/Node environments
  // Check environment variables
  const envUrl = 
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
    process.env.VITE_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_URL ||
    process.env.PUBLIC_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Last resort: assume localhost in development
  return 'http://localhost:5173';
}

/**
 * Get the full public URL for a given path
 * @param path - The path to append (e.g., '/shop/123' or 'shop/123')
 * @returns Full URL (e.g., https://shahdolbazaar.com/shop/123)
 */
export function getPublicUrlFor(path: string): string {
  const baseUrl = getPublicUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get API base URL
 * In production, API routes are on same domain
 * In development, use VITE_API_URL or default to localhost:5000
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // In browser, check if we're in production
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
      // Production: API is on same domain
      return window.location.origin;
    }
  }
  
  // Development: use environment variable or default
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}
