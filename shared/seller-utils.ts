/**
 * ============================================
 * SELLER UTILITIES - Data Normalization
 * ============================================
 * BharatOS - Shahdol Bazaar
 * 
 * This utility provides consistent handling of seller/vendor IDs
 * across the application to prevent NaN errors during API calls.
 */

/**
 * Normalize seller/vendor ID to prevent NaN during API calls
 * Handles both shopId and vendorId from different API responses
 * 
 * @param item - Object containing shopId and/or vendorId
 * @returns Normalized number or null if invalid
 * 
 * @example
 * normalizeSellerId({ shopId: 123 })        // returns 123
 * normalizeSellerId({ vendorId: 456 })       // returns 456 (prefers vendorId)
 * normalizeSellerId({ shopId: 1, vendorId: 2 }) // returns 2 (vendorId takes priority)
 * normalizeSellerId({ shopId: null })         // returns null
 * normalizeSellerId({})                       // returns null
 */
export function normalizeSellerId(item: { shopId?: number | null | undefined; vendorId?: number | null | undefined }): number | null {
  // Prefer vendorId (new API), fallback to shopId (legacy)
  const vendorId = item.vendorId;
  const shopId = item.shopId;
  
  // Determine the primary ID
  const id = vendorId !== null && vendorId !== undefined ? vendorId : shopId;
  
  // Handle invalid values
  if (id === null || id === undefined) return null;
  if (typeof id === 'string') {
    if (id === '' || id === 'undefined' || id === 'null') return null;
    const parsed = Number(id);
    if (isNaN(parsed)) return null;
    return parsed;
  }
  
  if (typeof id === 'number') {
    if (isNaN(id)) return null;
    return id;
  }
  
  return null;
}

/**
 * Type guard to check if a value is a valid seller ID
 */
export function isValidSellerId(id: unknown): id is number {
  if (typeof id !== 'number') return false;
  if (isNaN(id)) return false;
  if (id <= 0) return false;
  return true;
}

/**
 * Extract seller ID safely from any item type
 * Returns a safe number for use in API calls
 */
export function getSellerIdSafe(item: { shopId?: number | null; vendorId?: number | null }): number {
  const normalized = normalizeSellerId(item);
  return normalized ?? 0; // Default to 0 if invalid (will fail validation on server)
}
