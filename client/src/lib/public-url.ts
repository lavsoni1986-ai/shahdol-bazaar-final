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
    (typeof process !== 'undefined' && process.env?.VERCEL_URL) ? `https://${process.env.VERCEL_URL}` : 
    import.meta.env.VITE_PUBLIC_URL || "";
  
  return envUrl;
}

/**
 * Get the full public URL for a given path
 * @param path - The path to append (e.g., '/shop/123' or 'shop/123')
 * @returns Full URL (e.g., https://shahdolbazaar.com/shop/123)
 */
export function getPublicUrlFor(path: string): string {
  const baseUrl = getPublicUrl();
  if (!baseUrl) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get API base URL
 * In production, API routes are on same domain
 * In development, use VITE_API_URL or relative origin
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}
