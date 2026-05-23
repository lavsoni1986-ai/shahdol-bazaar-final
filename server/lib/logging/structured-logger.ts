/**
 * STRUCTURED LOGGING LAYER
 * BharatOS Phase 7.5 - System Hardening & Operability
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum LogComponent {
  COGNITION = 'COGNITION',
  GROUNDING = 'GROUNDING',
  EXECUTION = 'EXECUTION',
  DEMAND = 'DEMAND',
  TRUST = 'TRUST',
  RANKING = 'RANKING',
  TELEMETRY = 'TELEMETRY',
  DISTRICT = 'DISTRICT',
  HEALTH = 'HEALTH',
  SYSTEM = 'SYSTEM'
}

export interface LogContext extends Record<string, unknown> {
  component: LogComponent;
  operation: string;
  userId?: string;
  sessionId?: string;
  districtId?: number;
  requestId?: string;
  duration?: number;
  success?: boolean;
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: LogComponent;
  operation: string;
  message: string;
  context: LogContext;
  metadata: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Global logger instance
class BharatOSLogger {
  private logLevel: LogLevel = LogLevel.INFO;
  private enableConsole: boolean = true;
  private enableStructured: boolean = true;

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  setConsoleOutput(enabled: boolean) {
    this.enableConsole = enabled;
  }

  setStructuredOutput(enabled: boolean) {
    this.enableStructured = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const context = `${entry.context.component}:${entry.context.operation}`;
    const prefix = `[${timestamp}] [${entry.level}] [${context}]`;

    if (entry.error) {
      return `${prefix} ${entry.message} | Error: ${entry.error.message}`;
    }

    return `${prefix} ${entry.message}`;
  }

  private logToConsole(entry: LogEntry) {
    if (!this.enableConsole) return;

    const formatted = this.formatLogEntry(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formatted);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  private logStructured(entry: LogEntry) {
    if (!this.enableStructured) return;

    // In production, this would send to logging service
    // For now, we'll just ensure structured format
    const structuredLog = {
      ...entry,
      formatted: this.formatLogEntry(entry)
    };

    // Could send to external logging service here
    // console.log(JSON.stringify(structuredLog));
  }

  log(level: LogLevel, component: LogComponent, operation: string, message: string, context: Partial<LogContext> = {}, metadata: Record<string, any> = {}, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      operation,
      message,
      context: {
        component,
        operation,
        ...context
      },
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    this.logToConsole(entry);
    this.logStructured(entry);
  }

  // Convenience methods
  debug(component: LogComponent, operation: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, component, operation, message, context, metadata);
  }

  info(component: LogComponent, operation: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, component, operation, message, context, metadata);
  }

  warn(component: LogComponent, operation: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, component, operation, message, context, metadata);
  }

  error(component: LogComponent, operation: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) {
    this.log(LogLevel.ERROR, component, operation, message, context, metadata, error);
  }

  critical(component: LogComponent, operation: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) {
    this.log(LogLevel.CRITICAL, component, operation, message, context, metadata, error);
  }
}

// Global logger instance
export const bharatOSLogger = new BharatOSLogger();

// Component-specific logger factories
export const createCognitionLogger = (operation: string) => ({
  debug: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.debug(LogComponent.COGNITION, operation, message, context, metadata),
  info: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.info(LogComponent.COGNITION, operation, message, context, metadata),
  warn: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.warn(LogComponent.COGNITION, operation, message, context, metadata),
  error: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) =>
    bharatOSLogger.error(LogComponent.COGNITION, operation, message, context, metadata, error)
});

export const createGroundingLogger = (operation: string) => ({
  debug: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.debug(LogComponent.GROUNDING, operation, message, context, metadata),
  info: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.info(LogComponent.GROUNDING, operation, message, context, metadata),
  warn: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.warn(LogComponent.GROUNDING, operation, message, context, metadata),
  error: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) =>
    bharatOSLogger.error(LogComponent.GROUNDING, operation, message, context, metadata, error)
});

export const createExecutionLogger = (operation: string) => ({
  debug: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.debug(LogComponent.EXECUTION, operation, message, context, metadata),
  info: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.info(LogComponent.EXECUTION, operation, message, context, metadata),
  warn: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.warn(LogComponent.EXECUTION, operation, message, context, metadata),
  error: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) =>
    bharatOSLogger.error(LogComponent.EXECUTION, operation, message, context, metadata, error)
});

export const createDemandLogger = (operation: string) => ({
  debug: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.debug(LogComponent.DEMAND, operation, message, context, metadata),
  info: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.info(LogComponent.DEMAND, operation, message, context, metadata),
  warn: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.warn(LogComponent.DEMAND, operation, message, context, metadata),
  error: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) =>
    bharatOSLogger.error(LogComponent.DEMAND, operation, message, context, metadata, error)
});

export const createTrustLogger = (operation: string) => ({
  debug: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.debug(LogComponent.TRUST, operation, message, context, metadata),
  info: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.info(LogComponent.TRUST, operation, message, context, metadata),
  warn: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.warn(LogComponent.TRUST, operation, message, context, metadata),
  error: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) =>
    bharatOSLogger.error(LogComponent.TRUST, operation, message, context, metadata, error)
});

export const createRankingLogger = (operation: string) => ({
  debug: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.debug(LogComponent.RANKING, operation, message, context, metadata),
  info: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.info(LogComponent.RANKING, operation, message, context, metadata),
  warn: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) =>
    bharatOSLogger.warn(LogComponent.RANKING, operation, message, context, metadata),
  error: (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>, error?: Error) =>
    bharatOSLogger.error(LogComponent.RANKING, operation, message, context, metadata, error)
});

// Export logger configuration - types already exported above