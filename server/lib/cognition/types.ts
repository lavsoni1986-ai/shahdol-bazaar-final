// Cognition Shared Types
// BharatOS Phase 4 - Single Source of Truth for All Cognition Interfaces
// Canonical type definitions — do NOT redefine CognitionResult elsewhere.

export interface CognitionResult {
    query: string;
    normalizedQuery: string;
    intent: 'search' | 'route' | 'command' | 'unknown';
    entities: any[];
    confidence: number;
    metadata: Record<string, any>;
    domain: string;
    entity?: string;
    locality?: string;
    searchTerms?: string[];
    responseMode?: string;
}
