// Sovereign Error Domain Classification
// Enables precise error handling and observability

export class ApiContractError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ApiContractError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CognitionError extends Error {
  constructor(message: string, public context?: any) {
    super(message);
    this.name = 'CognitionError';
  }
}

export class TelemetryFailure extends Error {
  constructor(message: string, public eventType?: string) {
    super(message);
    this.name = 'TelemetryFailure';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Enhanced error factory
export function createDomainError(type: 'api' | 'validation' | 'cognition' | 'telemetry' | 'network', message: string, details?: any): Error {
  switch (type) {
    case 'api':
      return new ApiContractError(message, details);
    case 'validation':
      return new ValidationError(message, details?.field);
    case 'cognition':
      return new CognitionError(message, details);
    case 'telemetry':
      return new TelemetryFailure(message, details?.eventType);
    case 'network':
      return new NetworkError(message, details?.status);
    default:
      return new Error(message);
  }
}