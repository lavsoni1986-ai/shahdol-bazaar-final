// Cognition Grounding Engine
// BharatOS Phase 4 - Entity Discovery & Semantic Expansion

export const ENGINE_VERSION = "1.0.0";

import { findFuzzyMatches, getUnifiedGroundingIndex } from '../../services/district-memory.service';
import { knowledgeGraph } from '../../services/district-memory.service';
import { getUnifiedDiscoveryFeed } from '../../services/discovery.service';
import { bharatOSLogger, LogComponent } from '../logging/structured-logger';

export interface GroundingContext {
  query: string;
  districtId: number;
  cognition: any;
}

export interface GroundingResult {
  searchTerms: string[];
  allEntities: any[];
  domainFilteredEntities: any[];
  semanticExpansions: {
    entityBased: string[];
    graphBased: string[];
    combined: string[];
  };
}

export async function groundQuery(context: GroundingContext): Promise<GroundingResult> {
  const { query, districtId, cognition } = context;

  // Start with base search terms
  let searchTerms = cognition.searchTerms || [];

  // ============================================
  // SEMANTIC EXPANSION WITH ENTITY CONTEXT
  // ============================================
  let expandedTerms: string[] = [];

  if (cognition.entity && SEMANTIC_EXPANSIONS[cognition.entity]) {
    expandedTerms = SEMANTIC_EXPANSIONS[cognition.entity];
    searchTerms = [...searchTerms, ...expandedTerms];

    bharatOSLogger.info(LogComponent.GROUNDING, 'semantic_expansion', 'Expanded search terms for entity', {
      entity: cognition.entity,
      originalTerms: searchTerms.slice(0, -expandedTerms.length),
      expandedTerms
    });
  }

  // ============================================
  // ENHANCED SEMANTIC EXPANSION WITH KNOWLEDGE GRAPH
  // ============================================

  // Replace simple term expansion with graph traversal
  const graphExpandedTerms = knowledgeGraph.traverseSemanticGraph(query, cognition);

  // Combine semantic expansions (existing) with graph traversal
  const allExpandedTerms = [...new Set([
    ...expandedTerms, // From existing semantic expansion
    ...graphExpandedTerms // From knowledge graph traversal
  ])];

  // Add graph expansion terms to search terms
  for (const term of graphExpandedTerms) {
    if (!searchTerms.some(st => st.toLowerCase().includes(term.toLowerCase()))) {
      searchTerms.push(term);
      bharatOSLogger.info(LogComponent.GROUNDING, 'graph_expansion', 'Added term from knowledge graph', {
        term,
        source: 'graph_traversal'
      });
    }
  }

  // ============================================
  // DISCOVERY FEED FETCHING
  // ============================================
  bharatOSLogger.info(LogComponent.GROUNDING, 'discovery_feed_fetch', 'Fetching unified discovery feed for domain isolation', {
    districtId,
    searchTermsCount: searchTerms.length
  });

  // Get entities from unified discovery feed (with error handling)
  let allEntities = [];
  try {
    allEntities = await getUnifiedDiscoveryFeed(districtId);
  } catch (error) {
    console.error('Discovery feed failed for domain isolation:', error);
    allEntities = [];
  }

  // ============================================
  // DOMAIN ISOLATION
  // ============================================
  let domainFilteredEntities = allEntities;

  if (cognition.domain && cognition.domain !== 'GENERAL') {
    const healthcareEntityHint = typeof cognition.entity === 'string' ? cognition.entity.toLowerCase() : '';

    const domainMappings = {
      // Default healthcare set; refined below using entity hints (doctor vs hospital etc.)
      'HEALTHCARE': ['HOSPITAL', 'DOCTOR'],
      'EDUCATION': ['SCHOOL'],
      'TRANSPORT': ['BUS'],
      'FOOD': ['SHOP', 'PRODUCT'], // Food can be shops or products
      'SERVICE': ['SHOP'], // Services are typically shops
      'GROCERY': ['SHOP', 'PRODUCT']
    };

    let allowedEntityTypes = domainMappings[cognition.domain as keyof typeof domainMappings];

    // Canonical ontology enforcement (strict separation)
    if (cognition.domain === 'HEALTHCARE' && healthcareEntityHint) {
      if (healthcareEntityHint.includes('doctor') || healthcareEntityHint.includes('physician')) {
        allowedEntityTypes = ['DOCTOR'];
      } else if (healthcareEntityHint.includes('hospital') || healthcareEntityHint.includes('clinic')) {
        allowedEntityTypes = ['HOSPITAL'];
      }
    }

    if (allowedEntityTypes) {
      domainFilteredEntities = allEntities.filter(entity =>
        allowedEntityTypes.includes(entity.entityType)
      );

      bharatOSLogger.info(LogComponent.GROUNDING, 'domain_isolation', 'Applied domain filtering', {
        domain: cognition.domain,
        originalEntities: allEntities.length,
        filteredEntities: domainFilteredEntities.length,
        allowedTypes: allowedEntityTypes
      });
    }
  }

  return {
    searchTerms,
    allEntities,
    domainFilteredEntities,
    semanticExpansions: {
      entityBased: expandedTerms,
      graphBased: graphExpandedTerms,
      combined: allExpandedTerms
    }
  };
}

// Semantic expansions database
const SEMANTIC_EXPANSIONS: Record<string, string[]> = {
  "hospital": ["medical", "clinic", "healthcare", "doctor", "treatment", "emergency", "care"],
  "doctor": ["physician", "medical", "clinic", "healthcare", "consultation", "treatment"],
  "school": ["education", "college", "university", "learning", "students", "teachers"],
  "restaurant": ["food", "dining", "eat", "cafe", "hotel", "dhaba", "kitchen"],
  "hotel": ["lodging", "stay", "accommodation", "resort", "guesthouse", "motel"],
  "bank": ["finance", "money", "loan", "account", "atm", "financial", "savings"],
  "supermarket": ["grocery", "shopping", "store", "market", "retail", "shop"],
  "pharmacy": ["medicine", "medical", "drugs", "chemist", "healthcare"],
  "bus": ["transport", "travel", "public transport", "rtc", "travel", "journey"],
  "taxi": ["cab", "ride", "transport", "auto", "car rental", "vehicle"],
  "blood bank": ["blood", "donation", "medical", "emergency", "healthcare", "transfusion"]
};
