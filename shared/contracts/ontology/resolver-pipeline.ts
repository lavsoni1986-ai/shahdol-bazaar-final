// shared/contracts/ontology/resolver-pipeline.ts
// Resolver Pipeline - Raw Query → Semantic Extraction → Ontology Lookup → Canonical Resolution

import { CanonicalIntentType } from './intent-types';
import { CanonicalDomain } from './domains';
import { CanonicalEntityType } from './entity-types';
import { CanonicalCategory } from './categories';
import { CanonicalSignal, UserIntentSignal, OperationalSignalType, OperationalSignal, UserContextSignal, ConstitutedSignal, CanonicalSignalState, SignalProvenance } from './signals';
import { SignalSovereigntyEngine } from './signal-engine';
import { assertCanonicalResult } from './assertions';

export interface ResolverResult {
  intent: CanonicalIntentType;
  domain: CanonicalDomain;
  entity: CanonicalEntityType;
  category: CanonicalCategory;
  operationalSignals: OperationalSignal[]; // Strictly typed entity capability signals
  userIntentSignals: UserContextSignal[];  // Strictly typed user context signals
}

export interface RawQuery {
  text: string;
  // Add other query properties as needed
}

// Semantic Keyword Lookup - Maps keywords to canonical ontology
const SEMANTIC_LOOKUP = {
  // Domains
  domains: {
    [CanonicalDomain.HEALTHCARE]: ['hospital', 'doctor', 'clinic', 'pharmacy', 'medical', 'health', 'patient', 'treatment'],
    [CanonicalDomain.COMMERCE]: ['shop', 'store', 'buy', 'purchase', 'grocery', 'market', 'mall'],
    [CanonicalDomain.EDUCATION]: ['school', 'college', 'education', 'coaching', 'teacher', 'student'],
    [CanonicalDomain.TRANSPORT]: ['bus', 'taxi', 'transport', 'travel', 'ride'],
    [CanonicalDomain.GOVERNANCE]: ['police', 'government', 'office', 'court', 'administration'],
    [CanonicalDomain.SERVICES]: ['service', 'repair', 'emergency', 'help', 'support']
  },

  // Entity Types
  entities: {
    [CanonicalEntityType.PROVIDER]: ['hospital', 'doctor', 'clinic', 'pharmacy', 'school', 'bus', 'police'],
    [CanonicalEntityType.PRODUCT]: ['grocery', 'medicine', 'book', 'food'],
    [CanonicalEntityType.SERVICE]: ['repair', 'service', 'consultation', 'treatment'],
    [CanonicalEntityType.INSTITUTION]: ['school', 'college', 'hospital', 'government'],
    [CanonicalEntityType.PERSON]: ['doctor', 'teacher', 'police'],
    [CanonicalEntityType.EVENT]: ['emergency', 'accident']
  },

  // Categories
  categories: {
    [CanonicalCategory.HOSPITAL]: ['hospital', 'clinic', 'medical'],
    [CanonicalCategory.PHARMACY]: ['pharmacy', 'chemist', 'medicine'],
    [CanonicalCategory.GROCERY]: ['grocery', 'kirana', 'store'],
    [CanonicalCategory.SCHOOL]: ['school', 'education'],
    [CanonicalCategory.BUS]: ['bus', 'transport']
  },

  // Intents
  intents: {
    [CanonicalIntentType.SEARCH]: ['find', 'search', 'look', 'show'],
    [CanonicalIntentType.DISCOVERY]: ['near', 'around', 'available'],
    [CanonicalIntentType.EMERGENCY]: ['emergency', 'urgent', 'help', 'accident'],
    [CanonicalIntentType.NAVIGATION]: ['directions', 'route', 'location'],
    [CanonicalIntentType.CONTACT]: ['call', 'contact', 'phone'],
    [CanonicalIntentType.BOOKING]: ['book', 'reserve', 'appointment']
  }
};

// Helper function to find canonical from keywords
function findCanonical<T extends Record<string, string[]>>(
  lookup: T,
  query: string
): keyof T | null {
  const text = query.toLowerCase();
  for (const [canonical, keywords] of Object.entries(lookup)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return canonical as keyof T;
    }
  }
  return null;
}

// Resolver functions - Ontology-driven resolution
function resolveIntent(rawQuery: RawQuery): CanonicalIntentType {
  const canonical = findCanonical(SEMANTIC_LOOKUP.intents, rawQuery.text);
  return canonical || CanonicalIntentType.DISCOVERY;
}

function resolveDomain(rawQuery: RawQuery, intent: CanonicalIntentType): CanonicalDomain {
  const canonical = findCanonical(SEMANTIC_LOOKUP.domains, rawQuery.text);
  return canonical || CanonicalDomain.SERVICES;
}

function resolveEntity(rawQuery: RawQuery, intent: CanonicalIntentType, domain: CanonicalDomain): CanonicalEntityType {
  const canonical = findCanonical(SEMANTIC_LOOKUP.entities, rawQuery.text);
  if (canonical) return canonical;

  // Domain-based defaults
  switch (domain) {
    case CanonicalDomain.HEALTHCARE:
    case CanonicalDomain.EDUCATION:
    case CanonicalDomain.GOVERNANCE:
      return CanonicalEntityType.INSTITUTION;
    case CanonicalDomain.TRANSPORT:
      return CanonicalEntityType.SERVICE;
    default:
      return CanonicalEntityType.PROVIDER;
  }
}

function resolveCategory(rawQuery: RawQuery, intent: CanonicalIntentType, domain: CanonicalDomain, entity: CanonicalEntityType): CanonicalCategory {
  const canonical = findCanonical(SEMANTIC_LOOKUP.categories, rawQuery.text);
  return canonical || CanonicalCategory.GROCERY;
}

function resolveSignals(rawQuery: RawQuery, intent: CanonicalIntentType, domain: CanonicalDomain, entity: CanonicalEntityType, category: CanonicalCategory): {
  operationalSignals: OperationalSignal[];
  userIntentSignals: UserContextSignal[];
} {
  const operationalSignals: ConstitutedSignal[] = [];
  const userIntentSignals: ConstitutedSignal[] = [];
  const text = rawQuery.text.toLowerCase();

  // Operational Signals (inferred expectations from query - NOT verified truth)
  if (text.includes('open') || text.includes('now')) {
    operationalSignals.push(SignalSovereigntyEngine.constituteOperationalSignal(
      OperationalSignalType.EXPECTED_OPEN_NOW,
      CanonicalSignalState.UNKNOWN, // Query-derived expectation, not verified operational truth
      SignalProvenance.ML_INFERENCE, // Inferred from query intent
      'query_inference',
      undefined, // observedAt = now (query time)
      ['resolver_pipeline', 'operational_expectation']
    ));
  }

  if (text.includes('available')) {
    operationalSignals.push(SignalSovereigntyEngine.constituteOperationalSignal(
      OperationalSignalType.EXPECTED_AVAILABLE,
      CanonicalSignalState.UNKNOWN,
      SignalProvenance.ML_INFERENCE,
      'query_inference',
      undefined,
      ['resolver_pipeline', 'operational_expectation']
    ));
  }

  if (text.includes('delivery')) {
    operationalSignals.push(SignalSovereigntyEngine.constituteOperationalSignal(
      OperationalSignalType.EXPECTED_DELIVERY_ACTIVE,
      CanonicalSignalState.UNKNOWN,
      SignalProvenance.ML_INFERENCE,
      'query_inference',
      undefined,
      ['resolver_pipeline', 'operational_expectation']
    ));
  }

  // User Intent Signals (user context/needs)
  if (intent === CanonicalIntentType.EMERGENCY) {
    userIntentSignals.push(SignalSovereigntyEngine.constituteUserContextSignal(
      UserIntentSignal.URGENT_NEED,
      CanonicalSignalState.TRUE, // User intent is urgent
      SignalProvenance.ML_INFERENCE,
      'intent_analysis',
      undefined,
      ['resolver_pipeline', 'emergency_intent']
    ));
  }

  return { operationalSignals, userIntentSignals };
}

// Main resolver pipeline
export function resolveQuery(rawQuery: RawQuery): ResolverResult {
  const intent = resolveIntent(rawQuery);
  const domain = resolveDomain(rawQuery, intent);
  const entity = resolveEntity(rawQuery, intent, domain);
  const category = resolveCategory(rawQuery, intent, domain, entity);
  const { operationalSignals, userIntentSignals } = resolveSignals(rawQuery, intent, domain, entity, category);

  const result = {
    intent,
    domain,
    entity,
    category,
    operationalSignals,
    userIntentSignals
  };

  // Runtime assertion enforcement - fail-fast on canonical violations
  assertCanonicalResult(result);

  return result;
}