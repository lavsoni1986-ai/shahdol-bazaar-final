/**
 * SEMANTIC GUARD
 * Validation and threshold checking for cognition pipeline
 */

import { RankedEntity } from './ranking.engine';

export interface SemanticValidation {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  recommendations: string[];
  thresholds: ValidationThresholds;
}

export interface ValidationIssue {
  type: 'low_confidence' | 'insufficient_results' | 'semantic_mismatch' | 'trust_threshold' | 'relevance_threshold';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion?: string;
}

export interface ValidationThresholds {
  minConfidence: number;
  minResults: number;
  minRelevanceScore: number;
  minTrustScore: number;
  maxSemanticGap: number;
}

export interface CognitionValidation {
  queryConfidence: number;
  intent: any;
  context: any;
  districtIntelligence: any;
}

export class SemanticGuard {
  private static instance: SemanticGuard;

  // Default thresholds
  private readonly DEFAULT_THRESHOLDS: ValidationThresholds = {
    minConfidence: 0.6,
    minResults: 3,
    minRelevanceScore: 0.3,
    minTrustScore: 0.4,
    maxSemanticGap: 0.7
  };

  private constructor() {}

  static getInstance(): SemanticGuard {
    if (!SemanticGuard.instance) {
      SemanticGuard.instance = new SemanticGuard();
    }
    return SemanticGuard.instance;
  }

  validateSemanticRelevance(
    cognition: CognitionValidation,
    rankedEntities: RankedEntity[],
    confidence: number
  ): SemanticValidation {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    const thresholds = this.adaptThresholds(cognition);

    // 1. Query confidence validation
    this.validateQueryConfidence(cognition.queryConfidence, thresholds, issues, recommendations);

    // 2. Results count validation
    this.validateResultsCount(rankedEntities.length, thresholds, issues, recommendations);

    // 3. Relevance score validation
    this.validateRelevanceScores(rankedEntities, thresholds, issues, recommendations);

    // 4. Trust score validation
    this.validateTrustScores(rankedEntities, thresholds, issues, recommendations);

    // 5. Semantic coherence validation
    this.validateSemanticCoherence(cognition, rankedEntities, thresholds, issues, recommendations);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(rankedEntities, cognition, thresholds);

    // Determine validity
    const isValid = this.determineValidity(issues, overallConfidence, thresholds);

    return {
      isValid,
      confidence: overallConfidence,
      issues,
      recommendations,
      thresholds
    };
  }

  private validateQueryConfidence(
    queryConfidence: number,
    thresholds: ValidationThresholds,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    if (queryConfidence < thresholds.minConfidence) {
      const severity = queryConfidence < 0.3 ? 'critical' : queryConfidence < 0.5 ? 'high' : 'medium';

      issues.push({
        type: 'low_confidence',
        severity,
        message: `Query confidence is ${queryConfidence.toFixed(2)}, below threshold ${thresholds.minConfidence}`,
        suggestion: 'Consider rephrasing the query for better understanding'
      });

      recommendations.push('Try using more specific terms or provide additional context');
    }
  }

  private validateResultsCount(
    resultCount: number,
    thresholds: ValidationThresholds,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    if (resultCount < thresholds.minResults) {
      issues.push({
        type: 'insufficient_results',
        severity: resultCount === 0 ? 'critical' : 'high',
        message: `Only ${resultCount} results found, minimum required is ${thresholds.minResults}`,
        suggestion: 'Expand search criteria or check for similar terms'
      });

      if (resultCount === 0) {
        recommendations.push('No results found. Try broader search terms or check spelling');
      } else {
        recommendations.push('Consider searching in nearby districts or related categories');
      }
    }
  }

  private validateRelevanceScores(
    entities: RankedEntity[],
    thresholds: ValidationThresholds,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    const lowRelevanceCount = entities.filter(e => e.relevanceScore < thresholds.minRelevanceScore).length;
    const totalResults = entities.length;

    if (totalResults > 0 && lowRelevanceCount / totalResults > 0.5) {
      issues.push({
        type: 'relevance_threshold',
        severity: 'medium',
        message: `${lowRelevanceCount} of ${totalResults} results have low relevance scores`,
        suggestion: 'Results may not match your intent - consider refining your search'
      });

      recommendations.push('Try using different keywords or specify your requirements more clearly');
    }
  }

  private validateTrustScores(
    entities: RankedEntity[],
    thresholds: ValidationThresholds,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    const lowTrustCount = entities.filter(e => e.rankingFactors.trustScore < thresholds.minTrustScore).length;
    const totalResults = entities.length;

    if (totalResults > 0 && lowTrustCount / totalResults > 0.7) {
      issues.push({
        type: 'trust_threshold',
        severity: 'medium',
        message: `Most results have low trust scores - ${lowTrustCount}/${totalResults} below threshold`,
        suggestion: 'Consider verified vendors or services with better ratings'
      });

      recommendations.push('Look for verified badges or higher-rated options');
      recommendations.push('Check recent reviews and ratings before proceeding');
    }
  }

  private validateSemanticCoherence(
    cognition: CognitionValidation,
    entities: RankedEntity[],
    thresholds: ValidationThresholds,
    issues: ValidationIssue[],
    recommendations: string[]
  ): void {
    if (!entities.length) return;

    // Calculate semantic gap between query intent and results
    const semanticGap = this.calculateSemanticGap(cognition, entities);

    if (semanticGap > thresholds.maxSemanticGap) {
      issues.push({
        type: 'semantic_mismatch',
        severity: semanticGap > 0.9 ? 'high' : 'medium',
        message: `High semantic gap (${semanticGap.toFixed(2)}) between query and results`,
        suggestion: 'Results may not match your intended request'
      });

      recommendations.push('Try rephrasing your query to better match available services');
      recommendations.push('Consider if there are alternative ways to find what you need');
    }

    // Check for category consistency
    const categories = entities.map(e => e.category).filter(Boolean);
    const uniqueCategories = [...new Set(categories)];

    if (uniqueCategories.length > 3 && entities.length > 5) {
      recommendations.push('Results span multiple categories - you might want to be more specific');
    }
  }

  private calculateSemanticGap(cognition: CognitionValidation, entities: RankedEntity[]): number {
    let totalGap = 0;
    let count = 0;

    for (const entity of entities) {
      // Category alignment
      if (cognition.context?.category && entity.category) {
        const categoryMatch = entity.category.toLowerCase().includes(cognition.context.category.toLowerCase());
        totalGap += categoryMatch ? 0 : 0.3;
      }

      // Intent alignment
      if (cognition.intent?.primary) {
        const intentScore = this.calculateIntentAlignment(cognition.intent, entity);
        totalGap += (1 - intentScore) * 0.4;
      }

      // Location alignment
      if (cognition.context?.location && entity.address) {
        const locationMatch = entity.address.toLowerCase().includes(cognition.context.location.toLowerCase());
        totalGap += locationMatch ? 0 : 0.3;
      }

      count++;
    }

    return count > 0 ? totalGap / count : 0;
  }

  private calculateIntentAlignment(intent: any, entity: RankedEntity): number {
    // Simplified intent alignment scoring
    switch (intent.primary) {
      case 'discovery':
        return entity.rankingFactors.relevanceScore;
      case 'recommendation':
        return (entity.rankingFactors.trustScore + entity.rankingFactors.popularityScore) / 2;
      case 'availability':
        return entity.rankingFactors.availabilityScore;
      case 'booking':
        return entity.rankingFactors.availabilityScore * 0.8 + entity.rankingFactors.trustScore * 0.2;
      default:
        return 0.5;
    }
  }

  private calculateOverallConfidence(
    entities: RankedEntity[],
    cognition: CognitionValidation,
    thresholds: ValidationThresholds
  ): number {
    if (entities.length === 0) return 0;

    // Base confidence from query
    let confidence = cognition.queryConfidence;

    // Adjust based on result quality
    const avgRelevance = entities.reduce((sum, e) => sum + e.relevanceScore, 0) / entities.length;
    const avgTrust = entities.reduce((sum, e) => sum + e.rankingFactors.trustScore, 0) / entities.length;

    confidence = confidence * 0.4 + avgRelevance * 0.3 + avgTrust * 0.3;

    // Boost for good district intelligence
    if (cognition.districtIntelligence?.memory?.economicHealth > 70) {
      confidence += 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  private determineValidity(
    issues: ValidationIssue[],
    overallConfidence: number,
    thresholds: ValidationThresholds
  ): boolean {
    // Critical issues make it invalid
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) return false;

    // Low confidence makes it invalid
    if (overallConfidence < thresholds.minConfidence * 0.5) return false;

    // Multiple high severity issues make it invalid
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 2) return false;

    // Otherwise valid
    return true;
  }

  private adaptThresholds(cognition: CognitionValidation): ValidationThresholds {
    const thresholds = { ...this.DEFAULT_THRESHOLDS };

    // Adjust based on intent urgency
    if (cognition.intent?.urgency === 'critical') {
      thresholds.minConfidence *= 0.8; // More lenient for urgent queries
      thresholds.minResults = Math.max(1, thresholds.minResults - 1);
    }

    // Adjust based on district economic health
    const economicHealth = cognition.districtIntelligence?.memory?.economicHealth || 50;
    if (economicHealth < 60) {
      thresholds.minTrustScore *= 0.9; // More lenient in low-trust districts
    }

    // Adjust based on specificity
    if (cognition.intent?.specificity === 'exact') {
      thresholds.minRelevanceScore *= 1.2; // Stricter for exact matches
    }

    return thresholds;
  }
}

export const semanticGuard = SemanticGuard.getInstance();