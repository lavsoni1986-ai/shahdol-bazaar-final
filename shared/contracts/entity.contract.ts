// Sovereign Entity Contracts - canonical explainable entity ontology

export interface TrustLabelContract {
  label: 'Highly Trusted' | 'Verified' | 'Local Listing' | 'Unknown' | string;
  confidence?: number; // 0-1
  rationale?: string[]; // reasons for label
}

export interface SafetyBadgeContract {
  id: string;
  name: string;
  description?: string;
}

export interface CanonicalVendorEntityV2 {
  canonicalId: string; // stable canonical identifier across systems
  title: string;
  subtitle?: string;
  description?: string;
  logoUrl?: string;
  contactNumber?: string;
  address?: string;
  rating?: number; // 0-5
  trustScore?: number; // 0-100
  trustLabel?: TrustLabelContract | string;
  safetyBadges?: SafetyBadgeContract[];
  processingSteps?: string[]; // traceable processing steps
  performanceMetrics?: Record<string, number>;
  meta?: Record<string, any>;
}

export interface CanonicalEntityV2 {
  canonicalId: string;
  title: string;
  subtitle?: string;
  entityType?: string;
  description?: string;
  images?: string[];
  tags?: string[];
  rating?: number;
  trustScore?: number;
  trustLabel?: TrustLabelContract | string;
  processingSteps?: string[];
  performanceMetrics?: Record<string, number>;
  meta?: Record<string, any>;
}

export interface AISearchResultContract {
  id: string;
  canonicalId?: string;
  title: string;
  snippet?: string;
  source: string;
  score?: number;
  trustLabel?: TrustLabelContract | string;

  // Explainability & grounding
  groundingConfidence?: number; // 0-1
  trustSignals?: TrustLabelContract[] | string[];
  reasoningTrace?: string[];
  processingSteps?: string[];
  performanceMetrics?: Record<string, number>;
  entityLineage?: string[]; // upstream entity IDs / canonicalIds
}
