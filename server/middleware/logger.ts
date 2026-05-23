import fs from "fs";
import path from "path";

/**
 * ============================================
 * PRODUCTION LOGGING SYSTEM
 * ============================================
 * BharatOS Production Logging - District-aware, structured logging
 *
 * Features:
 * - District context tracking
 * - Request/response logging
 * - Error logging with stack traces
 * - Performance metrics
 * - Security event logging
 * - Rotatable log files
 */

// Ensure logs directory exists
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  SECURITY = 'SECURITY'
}

// Structured log entry
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  districtId?: number;
  userId?: number;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  message: string;
  error?: any;
  metadata?: any;
}

class BharatOSLogger {
  private logFile: string;
  private securityLogFile: string;

  constructor() {
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(LOGS_DIR, `bharatos-${date}.log`);
    this.securityLogFile = path.join(LOGS_DIR, `security-${date}.log`);
  }

  private formatLog(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level}]`;
    const context = entry.districtId ? ` [District:${entry.districtId}]` : '';
    const user = entry.userId ? ` [User:${entry.userId}]` : '';
    const request = entry.requestId ? ` [Req:${entry.requestId}]` : '';
    const endpoint = entry.method && entry.url ? ` ${entry.method} ${entry.url}` : '';
    const status = entry.statusCode ? ` ${entry.statusCode}` : '';
    const timing = entry.responseTime ? ` ${entry.responseTime}ms` : '';

    return `${baseLog}${context}${user}${request}${endpoint}${status}${timing} ${entry.message}`;
  }

  private writeToFile(filename: string, content: string): void {
    try {
      fs.appendFileSync(filename, content + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level: LogLevel, message: string, metadata?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };

    const formatted = this.formatLog(entry);

    // Console output for development
    if (level === LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // File logging
    if (level === LogLevel.SECURITY) {
      this.writeToFile(this.securityLogFile, formatted);
    } else {
      this.writeToFile(this.logFile, formatted);
    }

    // Also log errors with stack traces
    if (level === LogLevel.ERROR && metadata?.error) {
      const errorDetails = metadata.error instanceof Error
        ? metadata.error.stack || metadata.error.message
        : JSON.stringify(metadata.error, null, 2);

      this.writeToFile(this.logFile, `Error Details: ${errorDetails}`);
    }
  }

  // Performance monitoring helper
  performance(message: string, startTime: number, metadata?: Partial<LogEntry>): void {
    const duration = Date.now() - startTime;

    let level = LogLevel.INFO;
    if (duration > 2000) level = LogLevel.WARN;  // Slow
    if (duration > 5000) level = LogLevel.ERROR; // Very slow

    this.log(level, `PERF: ${message} - ${duration}ms`, {
      ...metadata,
      responseTime: duration
    });
  }

  // Convenience methods
  error(message: string, metadata?: Partial<LogEntry>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  warn(message: string, metadata?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  debug(message: string, metadata?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  security(message: string, metadata?: Partial<LogEntry>): void {
    this.log(LogLevel.SECURITY, message, { ...metadata, level: LogLevel.SECURITY });
  }
}

// Global logger instance
export const logger = new BharatOSLogger();

// Request logging middleware
export function requestLogger(req: any, res: any, next: any): void {
  const startTime = Date.now();
  const requestId = req.id || Math.random().toString(36).substr(2, 9);

  // Add request ID to request object
  req.requestId = requestId;

  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    districtId: req.ctx?.districtId || req.districtId || null,
    userId: req.ctx?.userId || null,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      districtId: req.ctx?.districtId || req.districtId || null,
      userId: req.ctx?.userId || null,
      statusCode: res.statusCode,
      responseTime: duration
    });

    // Log slow requests (>500ms)
    if (duration > 500) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        responseTime: duration,
        districtId: req.ctx?.districtId || req.districtId || null
      });
    }

    // Performance monitoring
    logger.performance(`${req.method} ${req.url}`, startTime, {
      requestId,
      districtId: req.ctx?.districtId || req.districtId || null,
      userId: req.ctx?.userId || null,
      statusCode: res.statusCode
    });

    originalEnd.apply(this, args);
  };

  next();
}

// Error logging middleware
export function errorLogger(err: any, req: any, res: any, next: any): void {
  logger.error('Unhandled error occurred', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    districtId: req.ctx?.districtId || req.districtId || null,
    userId: req.ctx?.userId || null,
    error: err
  });

  next(err);
}

export default logger;