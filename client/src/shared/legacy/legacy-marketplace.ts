// shared/legacy/legacy-marketplace.ts
// ============================================
// LEGACY MARKETPLACE ISOLATION ZONE
// BharatOS Deprecated Marketplace Logic
//
// ⚠️ ARCHITECTURAL QUARANTINE ZONE ⚠️
// This file contains DEPRECATED MARKETPLACE LOGIC.
// DO NOT BUILD NEW FEATURES ON THIS LOGIC.
// DO NOT EXPAND THIS LOGIC.
//
// Isolated legacy systems:
// - Home snapshot discovery
// - Featured shops/stores logic
// - Store feeds and listings
// - Legacy marketplace contracts
//
// This will be replaced by:
// - District cognition engine
// - Canonical partner discovery
// - Sovereign marketplace contracts
//
// For new marketplace features: Use canonical contracts
// ============================================

import { normalizeMarketplaceSnapshot, type CanonicalMarketplaceSnapshot } from "../api/response-normalizers";
import { legacyContractWarning } from "./legacy-contracts";

/**
 * @deprecated
 * LEGACY HOME SNAPSHOT CONTRACT
 * Old marketplace discovery payload - DO NOT EXPAND
 */
export interface LegacyHomeSnapshot {
  /** @deprecated Use partners */
  stores: any[];
  /** @deprecated Use partners */
  vendors: any[];
  /** @deprecated Use partners */
  shops: any[];
  /** @deprecated Use services */
  workers: any[];
  products: any[];
  hospitals: any[];
  schools: any[];
  buses: any[];
}

/**
 * @deprecated
 * LEGACY STORE DISCOVERY LOGIC
 * Old featured shops algorithm - DO NOT USE
 */
export class LegacyStoreDiscovery {
  /**
   * @deprecated
   * Legacy algorithm for selecting featured stores
   * Based on hardcoded business rules - DO NOT USE
   */
  static selectFeaturedStores(stores: any[]): any[] {
    legacyContractWarning('LegacyStoreDiscovery.selectFeaturedStores', 'Canonical partner ranking');

    // Legacy hardcoded logic
    return stores
      .filter(store => store.isVerified && store.rating >= 4.0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6); // Top 6 only
  }

  /**
   * @deprecated
   * Legacy store categorization logic
   * Hardcoded category mappings - DO NOT USE
   */
  static categorizeStores(stores: any[]): Record<string, any[]> {
    legacyContractWarning('LegacyStoreDiscovery.categorizeStores', 'Canonical partner categorization');

    const categories: Record<string, any[]> = {
      healthcare: [],
      food: [],
      services: [],
      retail: [],
    };

    stores.forEach(store => {
      const category = store.category?.toLowerCase() || 'retail';

      if (category.includes('hospital') || category.includes('clinic')) {
        categories.healthcare.push(store);
      } else if (category.includes('food') || category.includes('restaurant')) {
        categories.food.push(store);
      } else if (category.includes('service') || category.includes('repair')) {
        categories.services.push(store);
      } else {
        categories.retail.push(store);
      }
    });

    return categories;
  }
}

/**
 * @deprecated
 * LEGACY MARKETPLACE FEEDS
 * Old store/product feed logic - DO NOT EXPAND
 */
export class LegacyMarketplaceFeeds {
  /**
   * @deprecated
   * Legacy trending products algorithm
   * Based on hardcoded popularity metrics - DO NOT USE
   */
  static getTrendingProducts(products: any[]): any[] {
    legacyContractWarning('LegacyMarketplaceFeeds.getTrendingProducts', 'Canonical product ranking');

    return products
      .filter(product => product.isAvailable !== false)
      .sort((a, b) => {
        // Legacy scoring: price + rating + random boost
        const scoreA = (a.price || 0) + (a.rating || 0) * 10 + Math.random() * 5;
        const scoreB = (b.price || 0) + (b.rating || 0) * 10 + Math.random() * 5;
        return scoreB - scoreA;
      })
      .slice(0, 12);
  }

  /**
   * @deprecated
   * Legacy store recommendations
   * Basic collaborative filtering mockup - DO NOT USE
   */
  static getRecommendedStores(stores: any[], userPreferences?: any): any[] {
    legacyContractWarning('LegacyMarketplaceFeeds.getRecommendedStores', 'Canonical partner recommendations');

    // Legacy mock: just return top rated stores
    return stores
      .filter(store => store.rating >= 4.0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 8);
  }
}

/**
 * @deprecated
 * LEGACY MARKETPLACE SNAPSHOT BUILDER
 * Old home page data composition - DO NOT USE
 */
export class LegacyMarketplaceSnapshot {
  /**
   * @deprecated
   * Builds legacy home snapshot payload
   * Hardcoded data composition - DO NOT USE
   */
  static async buildHomeSnapshot(districtId: number): Promise<LegacyHomeSnapshot> {
    legacyContractWarning('LegacyMarketplaceSnapshot.buildHomeSnapshot', 'Canonical marketplace snapshot');

    // This would be the old logic that fetched from various endpoints
    // and composed the legacy payload structure
    // Now isolated here for quarantine

    return {
      stores: [], // Would fetch featured stores
      vendors: [], // Would fetch top vendors
      shops: [], // Would fetch local shops
      workers: [], // Would fetch service workers
      products: [], // Would fetch trending products
      hospitals: [], // Would fetch hospitals
      schools: [], // Would fetch schools
      buses: [], // Would fetch bus routes
    };
  }

  /**
   * @deprecated
   * Legacy snapshot data transformation
   * For backward compatibility only
   */
  static transformToCanonical(legacySnapshot: LegacyHomeSnapshot): CanonicalMarketplaceSnapshot {
    legacyContractWarning('LegacyMarketplaceSnapshot.transformToCanonical', 'Direct canonical snapshot usage');

    // Use the canonical normalizer
    const canonicalPayload = {
      data: {
        stores: legacySnapshot.stores,
        vendors: legacySnapshot.vendors,
        shops: legacySnapshot.shops,
        workers: legacySnapshot.workers,
        products: legacySnapshot.products,
        hospitals: legacySnapshot.hospitals,
        schools: legacySnapshot.schools,
        buses: legacySnapshot.buses,
      }
    };

    return normalizeMarketplaceSnapshot(canonicalPayload);
  }
}

/**
 * @deprecated
 * LEGACY DISCOVERY ENGINE
 * Old marketplace search and discovery - DO NOT USE
 */
export class LegacyDiscoveryEngine {
  /**
   * @deprecated
   * Legacy search algorithm
   * Basic keyword matching - DO NOT USE
   */
  static search(query: string, items: any[]): any[] {
    legacyContractWarning('LegacyDiscoveryEngine.search', 'Canonical search engine');

    const keywords = query.toLowerCase().split(' ');

    return items.filter(item => {
      const searchableText = `${item.name} ${item.category} ${item.description || ''}`.toLowerCase();
      return keywords.some(keyword => searchableText.includes(keyword));
    });
  }

  /**
   * @deprecated
   * Legacy location-based discovery
   * Simple distance mockup - DO NOT USE
   */
  static findNearby(items: any[], userLocation?: any): any[] {
    legacyContractWarning('LegacyDiscoveryEngine.findNearby', 'Canonical location services');

    // Legacy mock: just return first 10 items
    return items.slice(0, 10);
  }
}

// ============================================
// LEGACY MARKETPLACE METADATA
// ============================================

export const LEGACY_MARKETPLACE_METADATA = {
  STATUS: 'DEPRECATED',
  QUARANTINE_LEVEL: 'CRITICAL',
  REPLACEMENT: 'District cognition engine + Canonical partner discovery',
  LEGACY_SYSTEMS: [
    'Home snapshot composition',
    'Featured stores algorithm',
    'Store categorization logic',
    'Trending products selection',
    'Basic search and discovery',
    'Location-based recommendations'
  ],
  MIGRATION_PATH: 'Canonical marketplace contracts in shared/canonical/',
  REMOVAL_TIMELINE: 'After district cognition engine deployment',
  MAINTAINER: 'BharatOS Sovereign Architecture Council',
  ENFORCEMENT: 'MANDATORY - No new marketplace features in legacy zone',
} as const;