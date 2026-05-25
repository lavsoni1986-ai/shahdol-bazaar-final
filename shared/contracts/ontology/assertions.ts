// shared/contracts/ontology/assertions.ts
// Runtime assertions for ontology enforcement

import { CanonicalDomain, CANONICAL_DOMAINS } from './domains';
import { CanonicalEntityType, CANONICAL_ENTITY_TYPES } from './entity-types';
import { CanonicalCategory, CANONICAL_CATEGORIES } from './categories';
import { CanonicalSignal, UserIntentSignal, OperationalSignalType, SignalProvenance, CANONICAL_SIGNALS } from './signals';
import { CanonicalIntentType, CANONICAL_INTENT_TYPES } from './intent-types';

export function assertCanonicalDomain(domain: string): asserts domain is CanonicalDomain {
  if (!CANONICAL_DOMAINS.includes(domain as CanonicalDomain)) {
    throw new Error(`Invalid domain: ${domain}. Must be one of: ${CANONICAL_DOMAINS.join(', ')}`);
  }
}

export function assertCanonicalEntity(entity: string): asserts entity is CanonicalEntityType {
  if (!CANONICAL_ENTITY_TYPES.includes(entity as CanonicalEntityType)) {
    throw new Error(`Invalid entity type: ${entity}. Must be one of: ${CANONICAL_ENTITY_TYPES.join(', ')}`);
  }
}

export function assertCanonicalCategory(category: string): asserts category is CanonicalCategory {
  if (!CANONICAL_CATEGORIES.includes(category as CanonicalCategory)) {
    throw new Error(`Invalid category: ${category}. Must be one of: ${CANONICAL_CATEGORIES.join(', ')}`);
  }
}

export function assertCanonicalSignal(signal: string): asserts signal is CanonicalSignal {
  if (!CANONICAL_SIGNALS.includes(signal as CanonicalSignal)) {
    throw new Error(`Invalid signal: ${signal}. Must be one of: ${CANONICAL_SIGNALS.join(', ')}`);
  }
}

export function assertCanonicalIntent(intent: string): asserts intent is CanonicalIntentType {
  if (!CANONICAL_INTENT_TYPES.includes(intent as CanonicalIntentType)) {
    throw new Error(`Invalid intent type: ${intent}. Must be one of: ${CANONICAL_INTENT_TYPES.join(', ')}`);
  }
}

// Deep signal integrity assertion with type authority validation
export function assertSignalIntegrity(signal: any): void {
  // Type authority validation
  if (!signal.type) {
    throw new Error('Missing signal type');
  }

  // Check if it's a valid operational or user context signal type
  const isCanonicalOperational = Object.values(CanonicalSignal).includes(signal.type as CanonicalSignal);
  const isExtendedOperational = Object.values(OperationalSignalType).includes(signal.type as OperationalSignalType);
  const isOperational = isCanonicalOperational || isExtendedOperational;
  const isUserContext = Object.values(UserIntentSignal).includes(signal.type as UserIntentSignal);

  if (!isOperational && !isUserContext) {
    throw new Error(`Invalid signal type authority: ${signal.type} - not recognized as operational or user context signal`);
  }

  // Epistemic timestamp validation
  const requiredTimestamps = ['createdAt', 'observedAt', 'refreshedAt', 'evaluatedAt'];
  for (const ts of requiredTimestamps) {
    if (typeof signal[ts] !== 'number' || signal[ts] > Date.now() + 1000) { // Small future tolerance
      throw new Error(`Invalid ${ts}: ${signal[ts]} - must be valid timestamp`);
    }
  }

  // Chronological order validation
  if (signal.createdAt > signal.observedAt ||
      signal.observedAt > signal.refreshedAt ||
      signal.refreshedAt > signal.evaluatedAt) {
    throw new Error('Invalid timestamp chronology - must follow: createdAt ≤ observedAt ≤ refreshedAt ≤ evaluatedAt');
  }

  // Confidence bounds
  if (typeof signal.confidence !== 'number' || signal.confidence < 0 || signal.confidence > 1) {
    throw new Error(`Invalid signal confidence: ${signal.confidence} (must be 0-1)`);
  }

  // TTL sanity
  if (typeof signal.ttl !== 'number' || signal.ttl <= 0 || signal.ttl > 86400 * 7) {
    throw new Error(`Invalid signal TTL: ${signal.ttl} seconds (must be 0-7days)`);
  }

  // Lineage validation
  if (!Array.isArray(signal.lineage) || signal.lineage.length === 0) {
    throw new Error('Missing signal lineage');
  }

  if (signal.lineage.length > 20) {
    throw new Error(`Excessive lineage length: ${signal.lineage.length}`);
  }

  // Decay rate validation
  if (typeof signal.decayRate !== 'number' || signal.decayRate < 0 || signal.decayRate > 1) {
    throw new Error(`Invalid decay rate: ${signal.decayRate} (must be 0-1)`);
  }

  // Provenance validation
  if (!signal.provenance || !Object.values(SignalProvenance).includes(signal.provenance)) {
    throw new Error(`Invalid signal provenance: ${signal.provenance} - must be valid SignalProvenance enum`);
  }

  // Version validation
  if (typeof signal.signalVersion !== 'number' || signal.signalVersion < 1) {
    throw new Error(`Invalid signal version: ${signal.signalVersion} - must be positive integer`);
  }
}

// Batch assertion for ResolverResult
export function assertCanonicalResult(result: any): void {
  assertCanonicalIntent(result.intent);
  assertCanonicalDomain(result.domain);
  assertCanonicalEntity(result.entity);
  assertCanonicalCategory(result.category);

  // Deep signal integrity checks
  result.operationalSignals?.forEach(assertSignalIntegrity);
  result.userIntentSignals?.forEach(assertSignalIntegrity);
}