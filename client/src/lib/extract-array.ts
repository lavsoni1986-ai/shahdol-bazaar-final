/**
 * ============================================
 * EXTRACT ARRAY - BharatOS
 * ============================================
 * Universal data extraction from API responses
 * Handles all possible response formats:
 * - [...array]
 * - { data: [...array] }
 * - { data: { data: [...] } }
 * - { success: true, data: [...] }
 */

export const extractArray = (response: any): any[] => {
  if (!response) return [];

  // Direct array
  if (Array.isArray(response)) return response;

  // { data: [...] } - most common format
  if (Array.isArray(response.data)) return response.data;

  // { success: true, data: { data: [...] } } - double wrapped
  if (Array.isArray(response.data?.data)) return response.data.data;

  // { success: true, data: [...] }
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data.data)) return response.data.data;
  }

  return [];
};