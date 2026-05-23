// Sovereign Observability Layer
// Structured logging for cognition operations and system health

import { createDomainError } from "./errors";

// Cognition operation log structure
export interface CognitionLogEntry {
  timestamp: Date;
  operation: string;
  districtId?: number;
  query?: string;
  intent?: string;
  semanticScore?: number;
  threshold?: number;
  accepted?: boolean;
  rejectedEntities?: string[];
  hallucinationPrevented?: boolean;
  responseTime?: number;
  telemetryTruthHash?: string;
  operationErrors?: string[];
  metadata?: Record<string, any>;
}

// Structured cognition logger
export class CognitionLogger {
  private static instance: CognitionLogger;

  static getInstance(): CognitionLogger {
    if (!CognitionLogger.instance) {
      CognitionLogger.instance = new CognitionLogger();
    }
    return CognitionLogger.instance;
  }

  logCognitionOperation(entry: Omit<CognitionLogEntry, 'timestamp'>): void {
    const fullEntry: CognitionLogEntry = {
      timestamp: new Date(),
      ...entry
    };

    // Structured logging with consistent format
    const logLevel = entry.operationErrors?.length ? 'ERROR' : 'INFO';

    console.log(`[${logLevel}] COGNITION:${entry.operation}`, {
      districtId: entry.districtId,
      query: entry.query?.substring(0, 100), // Truncate for readability
      intent: entry.intent,
      score: entry.semanticScore,
      accepted: entry.accepted,
      responseTime: entry.responseTime,
      errors: entry.operationErrors,
      hallucinationPrevented: entry.hallucinationPrevented,
      telemetryTruthHash: entry.telemetryTruthHash,
      metadata: entry.metadata
    });

    // TODO: Send to centralized logging service
    // await logToCentralService(fullEntry);
  }

  logApiOperation(endpoint: string, method: string, duration: number, success: boolean, error?: string): void {
    console.log(`[API] ${method} ${endpoint}`, {
      duration: `${duration}ms`,
      success,
      error: error?.substring(0, 200)
    });
  }

  logDistrictIsolation(districtId: number, operation: string, entityCount: number): void {
    console.log(`[ISOLATION] District:${districtId} Operation:${operation}`, {
      entityCount,
      timestamp: new Date().toISOString()
    });
  }
}

// Global cognition logger instance
export const cognitionLogger = CognitionLogger.getInstance();

// Utility functions for common logging patterns
export function logCognitionSuccess(operation: string, data: Partial<CognitionLogEntry>): void {
  cognitionLogger.logCognitionOperation({
    operation,
    accepted: true,
    ...data
  });
}

export function logCognitionFailure(operation: string, error: string, data: Partial<CognitionLogEntry>): void {
  cognitionLogger.logCognitionOperation({
    operation,
    accepted: false,
    operationErrors: [error],
    ...data
  });
}

export function logApiCall(endpoint: string, method: string, startTime: number, success: boolean, error?: string): void {
  const duration = Date.now() - startTime;
  cognitionLogger.logApiOperation(endpoint, method, duration, success, error);
}