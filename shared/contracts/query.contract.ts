// Sovereign Query Contracts - unify intent and query execution shapes

export enum SearchIntent {
  DISCOVERY = 'DISCOVERY',
  TRANSACTIONAL = 'TRANSACTIONAL',
  EMERGENCY = 'EMERGENCY',
  NAVIGATIONAL = 'NAVIGATIONAL',
  INFORMATIONAL = 'INFORMATIONAL',
  COMPARATIVE = 'COMPARATIVE'
}

export interface QueryContext {
  query: string;
  userId?: string;
  districtId?: number | string;
  locality?: string;
  searchIntent?: SearchIntent | string;
  structured?: Record<string, any>;
  timestamp?: number;
  meta?: Record<string, any>;
}

export interface RankingSignal {
  name: string;
  weight: number; // normalized 0-1
  reason?: string;
}

export interface GroundingMetadata {
  groundingSource: string;
  searchTerms: string[];
  groundingConfidence?: number; // 0-1
  sourceEntityCount?: number;
}

export interface ExecutionTrace {
  requestId: string;
  startedAt: number;
  completedAt?: number;
  stages?: string[];
  meta?: Record<string, any>;
}
