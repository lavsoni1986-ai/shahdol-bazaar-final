// 🛡️ Sovereign Type Guards - Centralized Validation Layer
// Ensures type safety for JSON fields and complex data structures

import { Prisma } from "@prisma/client";

// Weight Configuration Guard
export interface WeightConfig {
  dssl: number;
  ml: number;
  behavior: number;
  context: number;
}

export function isWeightConfig(obj: any): obj is WeightConfig {
  return obj &&
         typeof obj.dssl === 'number' &&
         typeof obj.ml === 'number' &&
         typeof obj.behavior === 'number' &&
         typeof obj.context === 'number';
}

// System Configuration Guard
export interface SystemConfig {
  enabled: boolean;
  threshold: number;
  cooldown: number;
  metadata?: Record<string, any>;
}

export function isSystemConfig(obj: any): obj is SystemConfig {
  return obj &&
         typeof obj.enabled === 'boolean' &&
         typeof obj.threshold === 'number' &&
         typeof obj.cooldown === 'number';
}

// Event Metadata Guard
export interface EventMetadata {
  source: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trustBreakdown?: Record<string, number>;
  behaviorShiftPenalty?: number;
  category?: string;
  intent?: string;
  [key: string]: any;
}

export function isEventMetadata(obj: any): obj is EventMetadata {
  return obj &&
         typeof obj.source === 'string' &&
         ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(obj.severity);
}

// User Intelligence Profile Guard
export interface UserIntelligenceProfile {
  preferredTimes: string[];
  categoryPreferences: Record<string, number>;
  budgetRanges?: Record<string, number[]>;
  brandLoyalty?: Record<string, number>;
}

export function isUserIntelligenceProfile(obj: any): obj is UserIntelligenceProfile {
  return obj &&
         Array.isArray(obj.preferredTimes) &&
         typeof obj.categoryPreferences === 'object';
}

// Fraud Pattern Data Guard
export interface FraudPatternData {
  pattern: string;
  confidence: number;
  lastSeen: Date;
  occurrences: number;
}

export function isFraudPatternData(obj: any): obj is FraudPatternData {
  return obj &&
         typeof obj.pattern === 'string' &&
         typeof obj.confidence === 'number' &&
         obj.lastSeen instanceof Date &&
         typeof obj.occurrences === 'number';
}

// District Learning Data Guard
export interface DistrictLearningData {
  patterns: Array<{ feature: string; weight: number; }>;
  accuracy: number;
  lastTrained: Date;
}

export function isDistrictLearningData(obj: any): obj is DistrictLearningData {
  return obj &&
         Array.isArray(obj.patterns) &&
         typeof obj.accuracy === 'number' &&
         obj.lastTrained instanceof Date;
}

// Generic JSON Value Guards
export function isJsonObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isJsonArray(value: any): value is any[] {
  return Array.isArray(value);
}

export function isValidJsonValue(value: any): boolean {
  return value === null ||
         typeof value === 'string' ||
         typeof value === 'number' ||
         typeof value === 'boolean' ||
         isJsonObject(value) ||
         isJsonArray(value);
}