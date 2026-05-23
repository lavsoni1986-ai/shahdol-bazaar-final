// CENTRAL CONTRACT GOVERNANCE
// Single source of truth for all API and UI contracts
// Prevents contract drift and migration fractures

// ============================================
// API RESPONSE CONTRACTS
// ============================================

export interface SovereignApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

// ============================================
// DISTRICT CONTRACTS
// ============================================

import type { DistrictPublicContract } from './contracts/district.contract';

export type District = DistrictPublicContract;

export interface DistrictContextContract {
  currentDistrict: District | null;
  setDistrict: (district: District | null) => void;
  isLoading: boolean;
  isReady: boolean;
  // Optional helper to refresh district data from remote
  refreshDistrict?: () => Promise<void>;
}

// ============================================
// ENTITY CONTRACTS
// ============================================

export interface CanonicalEntity {
  id: number | string;
  name: string;
  businessType: string; // Raw DB value - use normalizeBusinessType()
  category?: string;
  description?: string;
  districtId: number;
}

// ============================================
// COGNITION CONTRACTS
// ============================================

export interface CognitionQuery {
  query: string;
  districtId: number;
  intent?: string;
  entities?: any[];
}

export interface CognitionResponse {
  answer: string;
  results: any[];
  confidence: number;
  grounding: any;
  recommendations: any[];
  followUp?: string[];
}

// ============================================
// UI COMPONENT CONTRACTS
// ============================================

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  data?: any;
}

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// SERVICE LAYER CONTRACTS
// ============================================

export interface VendorServiceContract {
  fetchVendorBySlug(slug: string): Promise<CanonicalEntity>;
  fetchVendorById(id: string): Promise<CanonicalEntity>;
  fetchVendorProducts(vendorId: number): Promise<any[]>;
  trackAnalytics(data: any): Promise<SovereignApiResponse<void>>;
  captureLead(data: any): Promise<SovereignApiResponse<void>>;
}

// ============================================
// VALIDATION RULES
// ============================================

export const CONTRACT_VALIDATION_RULES = {
  apiResponse: (response: any): response is SovereignApiResponse => {
    return typeof response === 'object' &&
           response !== null &&
           typeof response.success === 'boolean';
  },

  district: (district: any): district is District => {
    return typeof district === 'object' &&
           district !== null &&
           typeof district.id === 'number' &&
           typeof district.slug === 'string' &&
           typeof district.name === 'string';
  },

  entity: (entity: any): entity is CanonicalEntity => {
    return typeof entity === 'object' &&
           entity !== null &&
           (typeof entity.id === 'number' || typeof entity.id === 'string') &&
           typeof entity.name === 'string' &&
           typeof entity.businessType === 'string' &&
           typeof entity.districtId === 'number';
  }
};

// ============================================
// MIGRATION COMPATIBILITY
// ============================================

// Legacy contracts - DO NOT USE in new code
export interface LegacyDistrictContext {
  district: string | null;
  setDistrict: (district: string | null) => void;
  isLoading: boolean;
}

// Migration helpers
export function adaptLegacyDistrict(legacy: LegacyDistrictContext): DistrictContextContract {
  return {
    currentDistrict: legacy.district ? {
      id: 1, // Default ID
      slug: legacy.district,
      name: legacy.district.charAt(0).toUpperCase() + legacy.district.slice(1)
    } : null,
    setDistrict: (district) => legacy.setDistrict(district?.slug || null),
    isLoading: legacy.isLoading,
    isReady: !legacy.isLoading && !!legacy.district
  };
}

// ============================================
// CONTRACT VERSIONING
// ============================================

export const CONTRACT_VERSIONS = {
  DISTRICT_CONTEXT: 'v2.0',
  API_RESPONSE: 'v2.0',
  ENTITY_NORMALIZATION: 'v1.0',
  COGNITION: 'v1.5',
  SERVICE_LAYER: 'v1.0'
};

// Version compatibility matrix
export const CONTRACT_COMPATIBILITY = {
  'v1.0': ['v1.0'],
  'v1.5': ['v1.5', 'v1.0'],
  'v2.0': ['v2.0', 'v1.5', 'v1.0']
};

// ============================================
// GOVERNANCE ENFORCEMENT
// ============================================

export function validateContract<T>(
  contract: string,
  data: any,
  validator: (data: any) => data is T
): asserts data is T {
  if (!validator(data)) {
    throw new Error(`Contract violation: ${contract} - invalid data structure`);
  }
}

export function enforceContractVersion(contract: string, version: string): void {
  const supportedVersions = CONTRACT_COMPATIBILITY[version as keyof typeof CONTRACT_COMPATIBILITY];
  if (!supportedVersions?.includes(CONTRACT_VERSIONS[contract as keyof typeof CONTRACT_VERSIONS])) {
    throw new Error(`Contract version mismatch: ${contract} requires ${version}`);
  }
}