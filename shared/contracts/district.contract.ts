// Sovereign District Contract - constitutional truth for district identity and branding

export interface DistrictContract {
  // Civic branding primitives
  primaryColor?: string; // hex or css color
  secondaryColor?: string;
  faviconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  logoUrl?: string;
  ogImageUrl?: string;
  twitterImageUrl?: string;

  // Contact & description
  contactNumber?: string;
  description?: string;

  // Operational state - intentionally permissive to support future governance
  state?: 'active' | 'disabled' | 'archived' | 'preview' | string;

  // Free-form metadata for future sovereign fields
  metadata?: Record<string, any>;
}

// Public-safe shape for frontend and external APIs
export interface DistrictPublicContract {
  id: number;
  slug: string;
  name: string;

  // Branding primitives (subset)
  primaryColor?: string;
  secondaryColor?: string;
  faviconUrl?: string;
  logoUrl?: string;
  imageUrl?: string;
  ogImageUrl?: string;
  twitterImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  contactNumber?: string;
  description?: string;
  state?: 'active' | 'disabled' | 'archived' | 'preview' | string;

  // Minimal meta for consumers
  meta?: Record<string, any>;
}

// Runtime enriched shape used inside server runtime (derived from canonical contract)
export interface DistrictRuntimeContext extends DistrictPublicContract, DistrictContract {
  // System fields
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Deprecated: legacy config (must be migrated away from)
  // Keep optional to allow gradual reconciliation; consumers should NOT rely on this.
  config?: Record<string, any> | undefined;
}
