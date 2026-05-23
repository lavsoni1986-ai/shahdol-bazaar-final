// Sovereign Safe Logger
// Provides fallback logging when structured logger fails
// Ensures logging never breaks application functionality

import { bharatOSLogger, LogComponent } from "../logging/structured-logger";

export const safeLogger = {
  info: (component: LogComponent, operation: string, message: string, context?: any, metadata?: any) => {
    try {
      bharatOSLogger?.info?.(component, operation, message, context, metadata);
    } catch (logError) {
      console.log(`[${component}] ${operation}: ${message}`, context, metadata);
      console.error("[LOGGER_FAILURE]", logError);
    }
  },

  error: (component: LogComponent, operation: string, message: string, context?: any, metadata?: any, error?: any) => {
    try {
      bharatOSLogger?.error?.(component, operation, message, context, metadata, error);
    } catch (logError) {
      console.error(`[${component}] ${operation}: ${message}`, context, metadata, error);
      console.error("[LOGGER_FAILURE]", logError);
    }
  },

  warn: (component: LogComponent, operation: string, message: string, context?: any, metadata?: any) => {
    try {
      bharatOSLogger?.warn?.(component, operation, message, context, metadata);
    } catch (logError) {
      console.warn(`[${component}] ${operation}: ${message}`, context, metadata);
      console.error("[LOGGER_FAILURE]", logError);
    }
  },

  debug: (component: LogComponent, operation: string, message: string, context?: any, metadata?: any) => {
    try {
      bharatOSLogger?.debug?.(component, operation, message, context, metadata);
    } catch (logError) {
      console.debug(`[${component}] ${operation}: ${message}`, context, metadata);
      console.error("[LOGGER_FAILURE]", logError);
    }
  }
};