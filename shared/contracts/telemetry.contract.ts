// Sovereign Telemetry Contracts - explainability and tracing primitives

export interface ProcessingStep {
  stepId: string;
  name: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  latencyMs?: number;
  cpuMs?: number;
  memoryBytes?: number;
  throughput?: number;
  [key: string]: number | undefined;
}

export interface TrustSignal {
  name: string;
  score: number; // 0-100
  reason?: string;
}

export interface TelemetryTruth {
  requestId: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  processingSteps?: ProcessingStep[];
  performanceMetrics?: PerformanceMetrics;
  queryConfidence?: number; // 0-1
  trustSignals?: TrustSignal[];
  reasoningTrace?: string[]; // simplified representation
  telemetryLineage?: string[]; // upstream systems
  meta?: Record<string, any>;
}
