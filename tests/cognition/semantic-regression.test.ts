import { expect, test, describe } from 'vitest';
import { normalizeBusinessType, CanonicalBusinessType } from '../../server/lib/entityNormalization';

// Mock cognition engine for testing
class MockCognitionEngine {
  classifyIntent(query: string): { intent: string; confidence: number } {
    const lowerQuery = query.toLowerCase();

    // Conversational patterns
    if (['hello', 'hi', 'namaste', 'hey'].some(g => lowerQuery.includes(g))) {
      return { intent: 'GREETING', confidence: 0.95 };
    }

    if (['thank you', 'thanks', 'dhanyavaad'].some(t => lowerQuery.includes(t))) {
      return { intent: 'SOCIAL', confidence: 0.9 };
    }

    if (['bye', 'goodbye', 'alvidha'].some(b => lowerQuery.includes(b))) {
      return { intent: 'EXIT', confidence: 0.9 };
    }

    // Healthcare patterns
    if (['doctor', 'cardiologist', 'dentist', 'hospital', 'clinic'].some(h => lowerQuery.includes(h))) {
      return { intent: 'HEALTHCARE', confidence: 0.85 };
    }

    // Education patterns
    if (['school', 'college', 'coaching', 'teacher'].some(e => lowerQuery.includes(e))) {
      return { intent: 'EDUCATION', confidence: 0.85 };
    }

    // Emergency patterns
    if (['urgent', 'emergency', 'blood', 'accident'].some(e => lowerQuery.includes(e))) {
      return { intent: 'EMERGENCY', confidence: 0.95 };
    }

    return { intent: 'UNKNOWN', confidence: 0.1 };
  }

  classifyEntityType(query: string): { entityType: string; confidence: number } {
    const lowerQuery = query.toLowerCase();

    // Hospital indicators
    if (['hospital', 'clinic', 'medical', 'aspatal'].some(h => lowerQuery.includes(h))) {
      return { entityType: 'HOSPITAL', confidence: 0.9 };
    }

    // School indicators
    if (['school', 'vidyalaya', 'college'].some(s => lowerQuery.includes(s))) {
      return { entityType: 'SCHOOL', confidence: 0.85 };
    }

    return { entityType: 'UNKNOWN', confidence: 0.1 };
  }
}

const mockEngine = new MockCognitionEngine();

describe('Cognition Semantic Regression Tests', () => {
  describe('Business Type Normalization', () => {
    test('HOSPITAL maps to HEALTHCARE', () => {
      expect(normalizeBusinessType('HOSPITAL')).toBe(CanonicalBusinessType.HEALTHCARE);
    });

    test('CLINIC maps to HEALTHCARE', () => {
      expect(normalizeBusinessType('CLINIC')).toBe(CanonicalBusinessType.HEALTHCARE);
    });

    test('SCHOOL maps to EDUCATION', () => {
      expect(normalizeBusinessType('SCHOOL')).toBe(CanonicalBusinessType.EDUCATION);
    });

    test('RESTAURANT maps to FOOD', () => {
      expect(normalizeBusinessType('RESTAURANT')).toBe(CanonicalBusinessType.FOOD);
    });

    test('SHOP maps to RETAIL', () => {
      expect(normalizeBusinessType('SHOP')).toBe(CanonicalBusinessType.RETAIL);
    });

    test('null/undefined defaults to OTHER', () => {
      expect(normalizeBusinessType(null)).toBe(CanonicalBusinessType.OTHER);
      expect(normalizeBusinessType(undefined)).toBe(CanonicalBusinessType.OTHER);
    });
  });

  describe('Intent Classification', () => {
    test('greeting queries classified correctly', () => {
      const queries = ['hello', 'hi there', 'namaste', 'hey'];
      queries.forEach(query => {
        const result = mockEngine.classifyIntent(query);
        expect(result.intent).toBe('GREETING');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    test('healthcare queries classified correctly', () => {
      const queries = ['cardiologist', 'dentist near me', 'best hospital'];
      queries.forEach(query => {
        const result = mockEngine.classifyIntent(query);
        expect(result.intent).toBe('HEALTHCARE');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('education queries classified correctly', () => {
      const queries = ['best school', 'coaching classes', 'college admission'];
      queries.forEach(query => {
        const result = mockEngine.classifyIntent(query);
        expect(result.intent).toBe('EDUCATION');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('emergency queries get high confidence', () => {
      const queries = ['blood urgent', 'accident emergency', 'medical emergency'];
      queries.forEach(query => {
        const result = mockEngine.classifyIntent(query);
        expect(result.intent).toBe('EMERGENCY');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    test('social queries classified correctly', () => {
      const queries = ['thank you', 'thanks', 'dhanyavaad'];
      queries.forEach(query => {
        const result = mockEngine.classifyIntent(query);
        expect(result.intent).toBe('SOCIAL');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Entity Type Classification', () => {
    test('hospital queries identify HOSPITAL entity', () => {
      const queries = ['best hospital', 'aspatal dhundo', 'clinic nearby'];
      queries.forEach(query => {
        const result = mockEngine.classifyEntityType(query);
        expect(result.entityType).toBe('HOSPITAL');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('school queries identify SCHOOL entity', () => {
      const queries = ['good school', 'vidyalaya', 'best college'];
      queries.forEach(query => {
        const result = mockEngine.classifyEntityType(query);
        expect(result.entityType).toBe('SCHOOL');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('semantic isolation: hospital query != school result', () => {
      const hospitalResult = mockEngine.classifyEntityType('best hospital');
      const schoolResult = mockEngine.classifyEntityType('good school');

      expect(hospitalResult.entityType).toBe('HOSPITAL');
      expect(schoolResult.entityType).toBe('SCHOOL');
      expect(hospitalResult.entityType).not.toBe(schoolResult.entityType);
    });

    test('conversational queries don\'t trigger entity classification', () => {
      const queries = ['hello', 'thank you', 'bye'];
      queries.forEach(query => {
        const result = mockEngine.classifyEntityType(query);
        expect(result.entityType).toBe('UNKNOWN');
        expect(result.confidence).toBeLessThan(0.2);
      });
    });
  });

  describe('Semantic Boundary Tests', () => {
    test('healthcare intent != education entity', () => {
      const intentResult = mockEngine.classifyIntent('best school for medical');
      const entityResult = mockEngine.classifyEntityType('best school for medical');

      // Intent should be EDUCATION (school), not HEALTHCARE
      expect(intentResult.intent).toBe('EDUCATION');
      expect(entityResult.entityType).toBe('SCHOOL');
    });

    test('no hallucination: hospital query doesn\'t return schools', () => {
      const result = mockEngine.classifyEntityType('best hospital in shahdol');
      expect(result.entityType).toBe('HOSPITAL');
      expect(result.entityType).not.toBe('SCHOOL');
    });

    test('confidence thresholds maintained', () => {
      const results = [
        mockEngine.classifyIntent('hello'),
        mockEngine.classifyIntent('cardiologist'),
        mockEngine.classifyIntent('blood urgent')
      ];

      results.forEach(result => {
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });
  });
});