// Cognition Governance Tests
// BharatOS Phase 4 - Runtime Governance Validation

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createExecutionState,
  CognitionExecutionState,
  CognitionStage
} from '../runtime-state';
import {
  advanceStage,
  failStage,
  assertRuntimeBudget,
  executeEngine
} from '../runtime-orchestrator';
import { finalizeCognitionResponse } from '../response-finalizer';

describe('Cognition Runtime Governance', () => {
  let executionState: CognitionExecutionState;

  beforeEach(() => {
    executionState = createExecutionState();
  });

  describe('Execution State Integrity', () => {
    it('should create sealed execution state', () => {
      expect(Object.isSealed(executionState)).toBe(true);
    });

    it('should initialize with valid trace', () => {
      expect(executionState.trace.requestId).toMatch(/^cog_\d+_[\w]+$/);
      expect(executionState.trace.startedAt).toBeGreaterThan(0);
      expect(executionState.trace.stages).toHaveLength(1);
      expect(executionState.trace.stages[0].stage).toBe(CognitionStage.INIT);
    });

    it('should have reasonable deadline', () => {
      expect(executionState.deadlineMs).toBe(10000); // 10 seconds
    });
  });

  describe('Stage Transitions', () => {
    it('should allow valid stage transitions', () => {
      advanceStage(executionState, CognitionStage.NORMALIZATION);
      expect(executionState.currentStage).toBe(CognitionStage.NORMALIZATION);
      expect(executionState.completedStages).toContain(CognitionStage.INIT);
    });

    it('should reject invalid stage transitions', () => {
      // Try to jump from INIT directly to RESPONSE_SYNTHESIS
      expect(() => {
        advanceStage(executionState, CognitionStage.RESPONSE_SYNTHESIS);
      }).toThrow();
      expect(executionState.currentStage).toBe(CognitionStage.FAILED);
    });

    it('should track stage timings', () => {
      advanceStage(executionState, CognitionStage.NORMALIZATION);
      expect(executionState.stageMetrics[CognitionStage.NORMALIZATION]).toBeDefined();
      expect(executionState.stageMetrics[CognitionStage.NORMALIZATION].startedAt).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should record stage failures', () => {
      failStage(executionState, CognitionStage.INTENT_PARSING, 'Test error', 'TEST_ERROR');

      expect(executionState.currentStage).toBe(CognitionStage.FAILED);
      expect(executionState.failedStage).toBe(CognitionStage.INTENT_PARSING);
      expect(executionState.errors).toHaveLength(1);
      expect(executionState.errors[0].code).toBe('TEST_ERROR');
      expect(executionState.trace.errors).toHaveLength(1);
    });

    it('should update trace on failure', () => {
      failStage(executionState, CognitionStage.GROUNDING, 'Grounding failed');

      const failedTraceStage = executionState.trace.stages.find(s => s.stage === CognitionStage.GROUNDING);
      expect(failedTraceStage?.status).toBe('failed');
      expect(failedTraceStage?.error).toBe('Grounding failed');
    });
  });

  describe('Runtime Budget', () => {
    it('should enforce deadline', () => {
      // Set a very short deadline
      executionState.deadlineMs = 1;
      executionState.startedAt = Date.now() - 100; // Started 100ms ago

      expect(() => {
        assertRuntimeBudget(executionState);
      }).toThrow('Runtime budget exceeded');
    });

    it('should allow execution within budget', () => {
      executionState.deadlineMs = 10000; // 10 seconds
      executionState.startedAt = Date.now(); // Just started

      expect(() => {
        assertRuntimeBudget(executionState);
      }).not.toThrow();
    });
  });

  describe('Engine Execution Wrapper', () => {
    it('should execute engine successfully', async () => {
      const result = await executeEngine(
        {
          stage: CognitionStage.INTENT_PARSING,
          engineName: 'intent',
          timeoutMs: 1000
        },
        async () => 'success',
        executionState
      );

      expect(result).toBe('success');
      expect(executionState.trace.engineVersions.intent).toBeDefined();
    });

    it('should handle engine timeouts', async () => {
      await expect(executeEngine(
        {
          stage: CognitionStage.GROUNDING,
          engineName: 'grounding',
          timeoutMs: 1 // Very short timeout
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10)); // Delay longer than timeout
          return 'success';
        },
        executionState
      )).rejects.toThrow('Engine timeout');

      expect(executionState.currentStage).toBe(CognitionStage.FAILED);
    });

    it('should handle engine errors with retries', async () => {
      let attempts = 0;

      await expect(executeEngine(
        {
          stage: CognitionStage.RANKING,
          engineName: 'ranking',
          retries: 2
        },
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Simulated failure');
          }
          return 'success';
        },
        executionState
      )).rejects.toThrow('Simulated failure');

      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Response Finalization', () => {
    it('should finalize successful execution', () => {
      executionState.response = { success: true, data: 'test' };
      executionState.telemetry = { matchedEntities: 5 };

      // Mock response object
      const mockRes = {
        json: jest.fn().mockReturnValue('finalized')
      };

      const result = finalizeCognitionResponse(mockRes as any, executionState);

      expect(mockRes.json).toHaveBeenCalled();
      expect(executionState.currentStage).toBe(CognitionStage.COMPLETE);
      expect(executionState.trace.completedAt).toBeDefined();
      expect(executionState.trace.finalResponse).toBe(executionState.response);
    });

    it('should handle missing response', () => {
      executionState.response = null;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      finalizeCognitionResponse(mockRes as any, executionState);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(executionState.currentStage).toBe(CognitionStage.FAILED);
    });

    it('should include comprehensive metadata', () => {
      executionState.response = { success: true };
      executionState.telemetry = { matchedEntities: 3 };
      executionState.operationErrors = ['test error'];
      executionState.errors = [{
        stage: CognitionStage.CONFIDENCE,
        severity: 'MEDIUM',
        recoverable: true,
        code: 'TEST_ERROR',
        message: 'Test error',
        timestamp: Date.now()
      }];

      const mockRes = {
        json: jest.fn()
      };

      finalizeCognitionResponse(mockRes as any, executionState);

      const responseArg = mockRes.json.mock.calls[0][0];
      expect(responseArg.telemetry).toBeDefined();
      expect(responseArg.operationErrors).toHaveLength(1);
      expect(responseArg.runtimeErrors).toHaveLength(1);
      expect(responseArg.executionMetadata).toBeDefined();
      expect(responseArg.executionMetadata.requestId).toBe(executionState.trace.requestId);
      expect(responseArg.executionMetadata.engineVersions).toBeDefined();
    });
  });
});