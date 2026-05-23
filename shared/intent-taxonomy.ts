// DEPRECATED - Use CanonicalDomain from ontology
export enum IntentDomain {
  HEALTHCARE = "HEALTHCARE",
  COMMERCE = "COMMERCE",
  TRANSPORT = "TRANSPORT",
  EMERGENCY = "EMERGENCY",
  PUBLIC_SERVICE = "PUBLIC_SERVICE",
}

export enum IntentAction {
  FIND = "FIND",
  BOOK = "BOOK",
  CALL = "CALL",
  NAVIGATE = "NAVIGATE",
}

export enum IntentTarget {
  DOCTOR = "DOCTOR",
  HOSPITAL = "HOSPITAL",
  PHARMACY = "PHARMACY",
  BUS = "BUS",
  POLICE = "POLICE",
}

import { CanonicalDomain } from './contracts/ontology/index';

export interface StructuredIntent {
  domain: CanonicalDomain; // Unified with ontology
  action: IntentAction;
  target: IntentTarget;
  confidence: number;
  rawQuery: string;
}

