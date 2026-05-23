// Cognition Intent Engine
// BharatOS Phase 4 - Query Intent Analysis & Classification

export const ENGINE_VERSION = "1.0.0";
import { IntentAction, IntentDomain, IntentTarget, StructuredIntent } from '../../../shared/intent-taxonomy';

import { CanonicalDomain } from '../../../shared/contracts/ontology/index';

export interface IntentClassification {
  primaryIntent: string;
  confidence: number;
  intentReasons: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  temporalContext: 'immediate' | 'scheduled' | 'general';
  geographicScope: 'nearby' | 'district' | 'broad';

  // Sovereign structured intent (new contract)
  structuredIntent: StructuredIntent;
}

export enum QueryIntent {
  DISCOVERY = 'DISCOVERY',
  TRANSACTIONAL = 'TRANSACTIONAL',
  EMERGENCY = 'EMERGENCY',
  NAVIGATIONAL = 'NAVIGATIONAL',
  INFORMATIONAL = 'INFORMATIONAL',
  COMPARATIVE = 'COMPARATIVE'
}

export function classifyQueryIntent(query: string, cognition: any): IntentClassification {
  const queryLower = query.toLowerCase();
  const intentReasons: string[] = [];
  let primaryIntent = QueryIntent.DISCOVERY;
  let confidence = 0.5;
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let temporalContext: 'immediate' | 'scheduled' | 'general' = 'general';
  let geographicScope: 'nearby' | 'district' | 'broad' = 'district';

  // Transactional indicators
  const transactionalWords = ['book', 'order', 'buy', 'purchase', 'reserve', 'appointment', 'schedule'];
  if (transactionalWords.some(word => queryLower.includes(word))) {
    primaryIntent = QueryIntent.TRANSACTIONAL;
    confidence = 0.8;
    intentReasons.push('transactional_keywords');
  }

  // Emergency indicators
  const emergencyWords = ['emergency', 'urgent', 'blood', 'accident', 'help', 'critical'];
  if (emergencyWords.some(word => queryLower.includes(word))) {
    primaryIntent = QueryIntent.EMERGENCY;
    confidence = 0.9;
    urgencyLevel = 'critical';
    intentReasons.push('emergency_keywords');
  }

  // Navigational indicators
  const navigationalWords = ['near', 'closest', 'direction', 'location', 'bus stand', 'hospital location'];
  if (navigationalWords.some(word => queryLower.includes(word))) {
    primaryIntent = QueryIntent.NAVIGATIONAL;
    confidence = 0.7;
    geographicScope = 'nearby';
    intentReasons.push('navigational_keywords');
  }

  // Informational indicators
  const informationalWords = ['timing', 'hours', 'fee', 'cost', 'contact', 'phone', 'when'];
  if (informationalWords.some(word => queryLower.includes(word))) {
    primaryIntent = QueryIntent.INFORMATIONAL;
    confidence = 0.6;
    intentReasons.push('informational_keywords');
  }

  // Comparative indicators
  const comparativeWords = ['best', 'cheapest', 'top', 'rated', 'compare', 'vs', 'versus'];
  if (comparativeWords.some(word => queryLower.includes(word))) {
    primaryIntent = QueryIntent.COMPARATIVE;
    confidence = 0.7;
    intentReasons.push('comparative_keywords');
  }

  // Temporal context
  const immediateWords = ['now', 'today', 'urgent', 'asap', 'immediately'];
  if (immediateWords.some(word => queryLower.includes(word))) {
    temporalContext = 'immediate';
    if (urgencyLevel === 'low') urgencyLevel = 'medium';
  }

  const scheduledWords = ['tomorrow', 'next week', 'appointment', 'book'];
  if (scheduledWords.some(word => queryLower.includes(word))) {
    temporalContext = 'scheduled';
  }

  // ============================
  // Sovereign structured intent
  // ============================
  const action: IntentAction =
    transactionalWords.some(word => queryLower.includes(word)) ? IntentAction.BOOK :
    ['call', 'phone', 'contact', 'number'].some(word => queryLower.includes(word)) ? IntentAction.CALL :
    navigationalWords.some(word => queryLower.includes(word)) ? IntentAction.NAVIGATE :
    IntentAction.FIND;

  const entityHint = typeof cognition?.entity === 'string' ? cognition.entity.toLowerCase() : '';
  const target: IntentTarget =
    entityHint.includes('doctor') || queryLower.includes('doctor') ? IntentTarget.DOCTOR :
    entityHint.includes('hospital') || entityHint.includes('clinic') || queryLower.includes('hospital') ? IntentTarget.HOSPITAL :
    entityHint.includes('pharmacy') || entityHint.includes('chemist') || queryLower.includes('pharmacy') ? IntentTarget.PHARMACY :
    entityHint.includes('bus') || queryLower.includes('bus') ? IntentTarget.BUS :
    queryLower.includes('police') ? IntentTarget.POLICE :
    // Default target stays discoverable; keep it conservative
    IntentTarget.HOSPITAL;

  const domain: CanonicalDomain =
    emergencyWords.some(word => queryLower.includes(word)) ? CanonicalDomain.SERVICES :
    target === IntentTarget.BUS ? CanonicalDomain.TRANSPORT :
    [IntentTarget.DOCTOR, IntentTarget.HOSPITAL, IntentTarget.PHARMACY].includes(target) ? CanonicalDomain.HEALTHCARE :
    queryLower.includes('police') || queryLower.includes('government') ? CanonicalDomain.GOVERNANCE :
    CanonicalDomain.COMMERCE;

  const structuredIntent: StructuredIntent = {
    domain,
    action,
    target,
    confidence,
    rawQuery: query,
  };

  return {
    primaryIntent,
    confidence,
    intentReasons,
    urgencyLevel,
    temporalContext,
    geographicScope,
    structuredIntent,
  };
}
