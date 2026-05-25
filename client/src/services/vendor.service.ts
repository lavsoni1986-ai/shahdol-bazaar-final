// Sovereign Vendor Service Layer
// Ensures all vendor operations go through standardized API contracts

import { apiRequest } from '@/lib/api-client';

// Canonical Vendor Entity Type
export interface CanonicalVendorEntity {
  id: number;
  name: string;
  slug: string;
  description?: string;
  category: string;
  businessType?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  logo?: string;
  images?: string[];
  isVerified: boolean;
  dsslScore?: number;
  rating?: number;
  reviewCount?: number;
  isSponsored?: boolean;
  isTrending?: boolean;
  products?: any[];
  meta?: any;
}

// Helper to extract data from apiRequest response
function extractData(result: any): any {
  if (result && result.data !== undefined) return result.data;
  if (result && result.success !== undefined) return result;
  return result;
}

// Vendor fetching operations - throw on error for useQuery compatibility
export async function fetchVendorBySlug(slug: string): Promise<CanonicalVendorEntity> {
  const result = await apiRequest('GET', `marketplace/stores/${slug}`);
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch vendor");
  }
  if (!result.data) {
    throw new Error("Missing vendor data");
  }
  return result.data;
}

export async function fetchVendorById(id: string): Promise<CanonicalVendorEntity> {
  const result = await apiRequest('GET', `marketplace/vendors/id/${id}`);
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch vendor");
  }
  if (!result.data) {
    throw new Error("Missing vendor data");
  }
  return result.data;
}

export async function fetchVendorProducts(vendorId: number): Promise<any[]> {
  if (
    !Number.isFinite(vendorId) ||
    vendorId <= 0
  ) {
    console.warn('[VENDOR.SERVICE] fetchVendorProducts called with invalid vendorId:', vendorId);
    return [];
  }
  const result = await apiRequest('GET', `marketplace/products?vendorId=${vendorId}`);
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch products");
  }
  return result.data || [];
}

// Analytics operations
export async function trackAnalytics(data: {
  vendorId: number;
  eventType: string;
  source: string;
  action: string;
  value?: any;
}): Promise<void> {
  await apiRequest('POST', 'analytics/track', { body: data });
}

// Lead operations
export async function captureLead(data: {
  vendorId: number;
  vendorName: string;
  customerName?: string;
  message: string;
}): Promise<void> {
  await apiRequest('POST', 'leads', { body: data });
}
