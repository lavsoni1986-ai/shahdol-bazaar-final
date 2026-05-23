/**
 * SHARED COGNITION TYPES
 * BharatOS Phase 3 - Cognition Extraction Foundation
 *
 * Centralized type definitions for cognition components
 */

export interface CognitionResult {
  query: string;
  normalizedQuery: string;
  intent: 'search' | 'route' | 'command' | 'unknown';
  entities: Entity[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface GroundingResult {
  vendorId?: number;
  productId?: number;
  category?: string;
  location?: string;
  grounded: boolean;
  confidence: number;
  sources: string[];
  alternatives?: GroundingResult[];
}

export interface RankingResult {
  itemId: number;
  score: number;
  components: {
    dssl: number;
    relevance: number;
    context: number;
    trust: number;
  };
  rank: number;
}

export interface DemandSignal {
  type: 'view' | 'click' | 'search' | 'order' | 'add_to_cart' | 'wishlist';
  productId?: number;
  vendorId?: number;
  query?: string;
  category?: string;
  timestamp: number;
  userId?: string;
  districtSlug: string;
  weight: number;
}

export interface ActionSignal {
  type: 'call' | 'whatsapp' | 'map' | 'order' | 'visit';
  vendorId: number;
  productId?: number;
  query: string;
  timestamp: number;
  userId?: string;
  districtSlug: string;
  metadata?: Record<string, any>;
}

export interface Entity {
  type: 'vendor' | 'product' | 'category' | 'location' | 'service';
  value: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

export interface TaxonomyNode {
  id: string;
  name: string;
  parentId?: string;
  synonyms: string[];
  category: string;
  weight: number;
}