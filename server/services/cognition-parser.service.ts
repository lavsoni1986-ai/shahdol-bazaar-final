/**
 * COGNITION PARSER SERVICE
 * Query parsing and intent classification for BharatOS cognition pipeline
 */

export interface ParsedCognition {
  originalQuery: string;
  normalizedQuery: string;
  intent: QueryIntent;
  searchTerms: string[];
  entities: string[];
  context: QueryContext;
  confidence: number;
}

export interface QueryIntent {
  primary: 'discovery' | 'comparison' | 'recommendation' | 'availability' | 'booking' | 'information';
  secondary?: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  specificity: 'general' | 'specific' | 'exact';
}

export interface QueryContext {
  location?: string;
  category?: string;
  priceRange?: { min?: number; max?: number };
  timeFrame?: string;
  preferences?: string[];
}

export class CognitionParser {
  private static instance: CognitionParser;

  private constructor() {}

  static getInstance(): CognitionParser {
    if (!CognitionParser.instance) {
      CognitionParser.instance = new CognitionParser();
    }
    return CognitionParser.instance;
  }

  async parseQuery(rawQuery: string, districtId: number): Promise<ParsedCognition> {
    // Query normalization
    const normalizedQuery = this.normalizeQuery(rawQuery);

    // Intent classification
    const intent = this.classifyIntent(normalizedQuery);

    // Entity extraction
    const entities = this.extractEntities(normalizedQuery);

    // Context extraction
    const context = this.extractContext(normalizedQuery);

    // Search terms extraction
    const searchTerms = this.extractSearchTerms(normalizedQuery);

    // Confidence calculation
    const confidence = this.calculateConfidence(intent, entities, context);

    return {
      originalQuery: rawQuery,
      normalizedQuery,
      intent,
      searchTerms,
      entities,
      context,
      confidence
    };
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove punctuation except hyphens and apostrophes
      .replace(/[^\w\s\-']/g, '')
      // Normalize common variations
      .replace(/\b(best|good|cheap|expensive|near|close|nearby)\b/g, match => {
        const synonyms: Record<string, string> = {
          'best': 'good',
          'cheap': 'affordable',
          'expensive': 'premium',
          'near': 'nearby',
          'close': 'nearby'
        };
        return synonyms[match] || match;
      });
  }

  private classifyIntent(query: string): QueryIntent {
    const queryLower = query.toLowerCase();

    // Primary intent classification
    let primary: QueryIntent['primary'] = 'discovery';
    let urgency: QueryIntent['urgency'] = 'low';
    let specificity: QueryIntent['specificity'] = 'general';

    // Discovery patterns
    if (/\b(find|search|show|get|list)\b/.test(queryLower)) {
      primary = 'discovery';
    }

    // Comparison patterns
    if (/\b(compare|vs|versus|better|worse|difference)\b/.test(queryLower)) {
      primary = 'comparison';
    }

    // Recommendation patterns
    if (/\b(recommend|suggest|best|good|top|popular)\b/.test(queryLower)) {
      primary = 'recommendation';
    }

    // Availability patterns
    if (/\b(available|open|when|time|schedule|book)\b/.test(queryLower)) {
      primary = 'availability';
    }

    // Booking patterns
    if (/\b(book|reserve|order|buy|purchase|get)\b/.test(queryLower) &&
        /\b(today|tomorrow|now|urgent|asap|emergency)\b/.test(queryLower)) {
      primary = 'booking';
      urgency = 'high';
    }

    // Information patterns
    if (/\b(what|how|why|where|who|tell|explain|info)\b/.test(queryLower)) {
      primary = 'information';
    }

    // Urgency detection
    if (/\b(urgent|emergency|asap|now|immediately|critical)\b/.test(queryLower)) {
      urgency = 'critical';
    } else if (/\b(today|tomorrow|soon|quick)\b/.test(queryLower)) {
      urgency = 'high';
    } else if (/\b(week|month|later)\b/.test(queryLower)) {
      urgency = 'medium';
    }

    // Specificity detection
    const specificIndicators = /\b(the|a|an|that|this|specific|exact)\b/.test(queryLower);
    const exactMatches = queryLower.match(/\b\d+\b|\b\w{10,}\b/g);
    if (specificIndicators || (exactMatches && exactMatches.length > 2)) {
      specificity = 'specific';
    }

    return {
      primary,
      urgency,
      specificity
    };
  }

  private extractEntities(query: string): string[] {
    const entities: string[] = [];

    // Common entity patterns
    const patterns = [
      // Services
      /\b(electrician|plumber|carpenter|mechanic|doctor|tutor|teacher)\b/g,
      // Products
      /\b(phone|mobile|laptop|computer|book|clothing|food|grocery)\b/g,
      // Transportation
      /\b(bus|train|taxi|auto|rickshaw|cab)\b/g,
      // Locations
      /\b(bus stand|market|hospital|school|college|office)\b/g,
      // Brands/types
      /\b(samsung|nokia|dell|hp|maruti|honda)\b/g
    ];

    patterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    });

    return [...new Set(entities)]; // Remove duplicates
  }

  private extractContext(query: string): QueryContext {
    const context: QueryContext = {};
    const queryLower = query.toLowerCase();

    // Location extraction
    const locationMatch = queryLower.match(/\b(near|at|in)\s+([a-zA-Z\s]+?)(?:\s|$|\.|\?)/);
    if (locationMatch) {
      context.location = locationMatch[2].trim();
    }

    // Category extraction
    const categoryPatterns = {
      'food': /\b(food|restaurant|cafe|hotel|eatery)\b/,
      'medical': /\b(doctor|hospital|clinic|medical|pharmacy)\b/,
      'education': /\b(school|college|tutor|teacher|coaching)\b/,
      'automotive': /\b(car|bike|mechanic|garage|auto)\b/,
      'electronics': /\b(phone|mobile|laptop|computer|electronics)\b/
    };

    for (const [category, pattern] of Object.entries(categoryPatterns)) {
      if (pattern.test(queryLower)) {
        context.category = category;
        break;
      }
    }

    // Price range extraction
    const priceMatch = queryLower.match(/(\d+)\s*(?:to|-)\s*(\d+)/);
    if (priceMatch) {
      context.priceRange = {
        min: parseInt(priceMatch[1]),
        max: parseInt(priceMatch[2])
      };
    }

    // Time frame extraction
    const timeMatch = queryLower.match(/\b(today|tomorrow|week|month|urgent)\b/);
    if (timeMatch) {
      context.timeFrame = timeMatch[1];
    }

    // Preferences extraction
    const preferences: string[] = [];
    if (/\b(verified|trusted|reliable|good|best)\b/.test(queryLower)) {
      preferences.push('verified');
    }
    if (/\b(cheap|affordable|budget)\b/.test(queryLower)) {
      preferences.push('affordable');
    }
    if (/\b(premium|expensive|luxury)\b/.test(queryLower)) {
      preferences.push('premium');
    }

    if (preferences.length > 0) {
      context.preferences = preferences;
    }

    return context;
  }

  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term =>
        term.length > 1 &&
        !/\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|can|could|should|may|might|must|shall|and|or|but|if|then|else|for|with|from|to|at|in|on|by|of)\b/.test(term)
      )
      .slice(0, 10); // Limit to prevent too many terms
  }

  private calculateConfidence(intent: QueryIntent, entities: string[], context: QueryContext): number {
    let confidence = 0.5; // Base confidence

    // Intent clarity
    if (intent.primary !== 'discovery') confidence += 0.2;

    // Entity presence
    if (entities.length > 0) confidence += 0.1;
    if (entities.length > 2) confidence += 0.1;

    // Context richness
    const contextKeys = Object.keys(context);
    confidence += Math.min(contextKeys.length * 0.05, 0.2);

    // Specificity bonus
    if (intent.specificity === 'specific') confidence += 0.1;

    return Math.min(confidence, 1.0);
  }
}

export const cognitionParser = CognitionParser.getInstance();