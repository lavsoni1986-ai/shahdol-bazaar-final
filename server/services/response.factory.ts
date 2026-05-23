/**
 * RESPONSE FACTORY
 * Consistent response construction for cognition pipeline
 */

import { RankedEntity } from './ranking.engine';
import { SemanticValidation } from './semantic.guard';
import { TelemetryTruth } from './telemetry.service';

export interface PipelineResponse {
  answer: string;
  results: any[];
  confidence: number;
  grounding: {
    districtIntelligence: any;
    economicContext: any;
    memoryInsights: any;
  };
  recommendations: any[];
  followUp?: string[];
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  truthId: string;
  processingTime: number;
  pipelineVersion: string;
  validationStatus: 'valid' | 'warning' | 'invalid';
  issues?: any[];
}

export interface ResponseContext {
  cognition: any;
  rankedEntities: RankedEntity[];
  validation: SemanticValidation;
  truth: TelemetryTruth;
  districtIntelligence: any;
}

export class ResponseFactory {
  private static instance: ResponseFactory;
  private readonly PIPELINE_VERSION = '1.0.0';

  private constructor() {}

  static getInstance(): ResponseFactory {
    if (!ResponseFactory.instance) {
      ResponseFactory.instance = new ResponseFactory();
    }
    return ResponseFactory.instance;
  }

  buildSuccessResponse(context: ResponseContext): PipelineResponse {
    const { cognition, rankedEntities, validation, truth, districtIntelligence } = context;

    // Build the answer text
    const answer = this.buildAnswer(truth.response.answer, validation, rankedEntities);

    // Build structured results
    const results = this.buildStructuredResults(rankedEntities);

    // Calculate final confidence
    const confidence = this.calculateFinalConfidence(validation, truth);

    // Build grounding information
    const grounding = this.buildGrounding(districtIntelligence, truth);

    // Build recommendations
    const recommendations = this.buildRecommendations(truth, validation, districtIntelligence);

    // Build follow-up suggestions
    const followUp = this.buildFollowUp(validation, rankedEntities, cognition);

    // Build metadata
    const metadata = this.buildMetadata(truth, validation);

    return {
      answer,
      results,
      confidence,
      grounding,
      recommendations,
      followUp,
      metadata
    };
  }

  private buildAnswer(baseAnswer: string, validation: SemanticValidation, entities: RankedEntity[]): string {
    let answer = baseAnswer;

    // Add validation warnings to answer if needed
    if (validation.issues.length > 0) {
      const highSeverityIssues = validation.issues.filter(i => i.severity === 'high' || i.severity === 'critical');

      if (highSeverityIssues.length > 0) {
        const warningText = highSeverityIssues.map(i => i.message).join('; ');
        answer += `\n\n⚠️ Note: ${warningText}`;
      }
    }

    // Add result count context
    const resultCount = entities.length;
    if (resultCount === 0) {
      answer += '\n\nNo matching results found in your district.';
    } else if (resultCount === 1) {
      answer += '\n\nFound 1 relevant option.';
    } else {
      answer += `\n\nFound ${resultCount} relevant options.`;
    }

    return answer;
  }

  private buildStructuredResults(entities: RankedEntity[]): any[] {
    return entities.slice(0, 10).map((entity, index) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      category: entity.category,
      relevanceScore: entity.relevanceScore,
      rankingFactors: entity.rankingFactors,
      position: index + 1,
      // Type-specific fields
      ...(entity.type === 'vendor' && {
        trustScore: entity.trustScore,
        rating: entity.rating,
        reviewCount: entity.reviewCount,
        orderCount: entity.orderCount,
        isVerified: entity.isVerified,
        contact: entity.phone,
        description: entity.description
      }),
      ...(entity.type === 'product' && {
        price: entity.price,
        vendor: entity.vendor,
        vendorCategory: entity.vendorCategory,
        rating: entity.rating,
        reviewCount: entity.reviewCount,
        inStock: entity.inStock,
        description: entity.description
      }),
      ...(entity.type === 'service' && {
        rating: entity.rating,
        reviewCount: entity.reviewCount,
        experience: entity.experience,
        isVerified: entity.isVerified,
        contact: entity.phone,
        serviceArea: entity.serviceArea,
        description: entity.description
      }),
      ...(entity.type === 'transport' && {
        price: entity.price,
        schedule: entity.schedule,
        operator: entity.operator,
        busType: entity.busType
      })
    }));
  }

  private calculateFinalConfidence(validation: SemanticValidation, truth: TelemetryTruth): number {
    // Base confidence from truth
    let confidence = truth.response.confidence;

    // Adjust based on validation
    if (!validation.isValid) {
      confidence *= 0.7; // Reduce confidence for invalid results
    }

    // Adjust based on issues
    const issuePenalty = validation.issues.reduce((penalty, issue) => {
      switch (issue.severity) {
        case 'low': return penalty + 0.05;
        case 'medium': return penalty + 0.1;
        case 'high': return penalty + 0.2;
        case 'critical': return penalty + 0.3;
        default: return penalty;
      }
    }, 0);

    confidence = Math.max(0, confidence - issuePenalty);

    return Math.min(confidence, 1.0);
  }

  private buildGrounding(districtIntelligence: any, truth: TelemetryTruth): any {
    return {
      districtIntelligence: {
        name: districtIntelligence.profile?.name,
        economicHealth: districtIntelligence.memory?.economicHealth,
        totalVendors: districtIntelligence.profile?.totalVendors,
        totalUsers: districtIntelligence.profile?.totalUsers,
        activeClusters: districtIntelligence.economics?.length || 0
      },
      economicContext: truth.results.economicContext,
      memoryInsights: {
        trendingQueries: districtIntelligence.memory?.trendingQueries?.slice(0, 3),
        supplyGaps: districtIntelligence.memory?.supplyGaps?.slice(0, 2),
        economicOpportunities: districtIntelligence.economics?.filter((c: any) => c.growthScore > 0.7).slice(0, 2)
      },
      truth: {
        truthId: truth.truthId,
        timestamp: truth.timestamp,
        processingSteps: truth.metadata.processingSteps
      }
    };
  }

  private buildRecommendations(truth: TelemetryTruth, validation: SemanticValidation, districtIntelligence: any): any[] {
    const recommendations = [...truth.response.recommendations];

    // Add validation-based recommendations
    if (validation.recommendations) {
      recommendations.push(...validation.recommendations.map(rec => ({
        type: 'validation',
        title: 'Search Improvement',
        items: [rec],
        reason: 'Based on search quality analysis'
      })));
    }

    // Add district-specific recommendations
    if (districtIntelligence.memory?.economicHealth < 70) {
      recommendations.push({
        type: 'district',
        title: 'District Economic Insights',
        items: ['Consider verified vendors for better reliability'],
        reason: 'District has some economic challenges - verified partners recommended'
      });
    }

    // Add trending recommendations
    if (districtIntelligence.memory?.trendingQueries?.length > 0) {
      const trending = districtIntelligence.memory.trendingQueries
        .filter((t: any) => t.frequency > 5 && t.trend === 'rising')
        .slice(0, 2);

      if (trending.length > 0) {
        recommendations.push({
          type: 'trending',
          title: 'Popular in your area',
          items: trending.map((t: any) => t.query),
          reason: 'These are trending searches in your district'
        });
      }
    }

    return recommendations;
  }

  private buildFollowUp(validation: SemanticValidation, entities: RankedEntity[], cognition: any): string[] | undefined {
    const followUp: string[] = [];

    // Add validation-based follow-up
    if (!validation.isValid) {
      followUp.push('Would you like me to search in nearby districts?');
      followUp.push('I can help you find similar services in the area.');
    }

    // Add low confidence follow-up
    if (validation.confidence < 0.6) {
      followUp.push('Would you like me to refine the search with more details?');
    }

    // Add result-based follow-up
    if (entities.length === 0) {
      followUp.push('Try using different keywords or broader search terms.');
    } else if (entities.length < 3) {
      followUp.push('Would you like me to search for related services?');
    }

    // Add intent-based follow-up
    if (cognition.intent?.primary === 'availability') {
      followUp.push('Would you like me to check current availability?');
    } else if (cognition.intent?.primary === 'booking') {
      followUp.push('Would you like help booking or contacting these services?');
    }

    return followUp.length > 0 ? followUp : undefined;
  }

  private buildMetadata(truth: TelemetryTruth, validation: SemanticValidation): ResponseMetadata {
    return {
      truthId: truth.truthId,
      processingTime: truth.metadata.performanceMetrics?.totalTime || 0,
      pipelineVersion: this.PIPELINE_VERSION,
      validationStatus: validation.isValid ? 'valid' :
                       validation.issues.some(i => i.severity === 'high' || i.severity === 'critical') ? 'invalid' : 'warning',
      issues: validation.issues.length > 0 ? validation.issues : undefined
    };
  }

  // Error response builder
  buildErrorResponse(error: any, query: string): PipelineResponse {
    return {
      answer: `Sorry, I encountered an error while processing your query: "${query}". Please try again.`,
      results: [],
      confidence: 0,
      grounding: {
        districtIntelligence: null,
        economicContext: null,
        memoryInsights: null
      },
      recommendations: [],
      followUp: ['Please try rephrasing your query or contact support if the issue persists.'],
      metadata: {
        truthId: '',
        processingTime: 0,
        pipelineVersion: this.PIPELINE_VERSION,
        validationStatus: 'invalid',
        issues: [{
          type: 'semantic_mismatch',
          severity: 'critical',
          message: error.message || 'Processing error occurred'
        }]
      }
    };
  }

  // Empty results response builder
  buildEmptyResponse(query: string, districtName: string): PipelineResponse {
    return {
      answer: `I couldn't find any matching results for "${query}" in ${districtName}. This could be because:`,
      results: [],
      confidence: 0.1,
      grounding: {
        districtIntelligence: null,
        economicContext: null,
        memoryInsights: null
      },
      recommendations: [{
        type: 'suggestion',
        title: 'Try these alternatives',
        items: [
          'Use broader search terms',
          'Check spelling and try synonyms',
          'Search in nearby districts',
          'Try related service categories'
        ],
        reason: 'No results found - suggesting alternatives'
      }],
      followUp: [
        'Would you like me to search in nearby districts?',
        'Can you provide more details about what you\'re looking for?'
      ],
      metadata: {
        truthId: '',
        processingTime: 0,
        pipelineVersion: this.PIPELINE_VERSION,
        validationStatus: 'invalid'
      }
    };
  }
}

export const responseFactory = ResponseFactory.getInstance();