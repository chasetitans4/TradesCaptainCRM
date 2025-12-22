// =====================================================
// LOGGING LIBRARY
// Centralized logging with Sentry integration
// =====================================================

import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  businessId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
}

// Log level priorities
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const contextStr = entry.context
    ? ` ${JSON.stringify(entry.context)}`
    : '';
  return `${prefix} ${entry.message}${contextStr}`;
}

/**
 * Send log to Sentry for error levels
 */
function sendToSentry(entry: LogEntry): void {
  if (entry.level === 'error' || entry.level === 'fatal') {
    Sentry.withScope((scope) => {
      if (entry.context) {
        scope.setContext('log', entry.context);
        if (entry.context.userId) {
          scope.setUser({ id: entry.context.userId });
        }
        if (entry.context.action) {
          scope.setTag('action', entry.context.action);
        }
        if (entry.context.resource) {
          scope.setTag('resource', entry.context.resource);
        }
      }

      if (entry.error) {
        Sentry.captureException(entry.error);
      } else {
        Sentry.captureMessage(entry.message, entry.level === 'fatal' ? 'fatal' : 'error');
      }
    });
  } else if (entry.level === 'warn') {
    Sentry.addBreadcrumb({
      category: 'warning',
      message: entry.message,
      level: 'warning',
      data: entry.context,
    });
  }
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    context,
    error,
    timestamp: new Date().toISOString(),
  };

  // Console output
  const formattedMessage = formatLogEntry(entry);
  switch (level) {
    case 'debug':
      console.debug(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
    case 'fatal':
      console.error(formattedMessage, error);
      break;
  }

  // Send to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    sendToSentry(entry);
  }
}

/**
 * Logger interface
 */
export const logger = {
  debug: (message: string, context?: LogContext) =>
    log('debug', message, context),

  info: (message: string, context?: LogContext) =>
    log('info', message, context),

  warn: (message: string, context?: LogContext) =>
    log('warn', message, context),

  error: (message: string, error?: Error, context?: LogContext) =>
    log('error', message, context, error),

  fatal: (message: string, error?: Error, context?: LogContext) =>
    log('fatal', message, context, error),

  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log('debug', message, { ...baseContext, ...context }),

    info: (message: string, context?: LogContext) =>
      log('info', message, { ...baseContext, ...context }),

    warn: (message: string, context?: LogContext) =>
      log('warn', message, { ...baseContext, ...context }),

    error: (message: string, error?: Error, context?: LogContext) =>
      log('error', message, { ...baseContext, ...context }, error),

    fatal: (message: string, error?: Error, context?: LogContext) =>
      log('fatal', message, { ...baseContext, ...context }, error),
  }),

  /**
   * Track API request timing
   */
  apiRequest: (
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ) => {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    log(level, `${method} ${path} - ${statusCode} (${durationMs}ms)`, {
      ...context,
      metadata: {
        ...context?.metadata,
        method,
        path,
        statusCode,
        durationMs,
      },
    });
  },

  /**
   * Track database query timing
   */
  dbQuery: (
    operation: string,
    table: string,
    durationMs: number,
    context?: LogContext
  ) => {
    log('debug', `DB ${operation} on ${table} (${durationMs}ms)`, {
      ...context,
      metadata: {
        ...context?.metadata,
        operation,
        table,
        durationMs,
      },
    });
  },
};

/**
 * API error class with structured error codes
 */
export class APIError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: LogContext;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: LogContext
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
      },
    };
  }
}

/**
 * Common API error factory functions
 */
export const APIErrors = {
  badRequest: (message: string, context?: LogContext) =>
    new APIError(message, 'BAD_REQUEST', 400, context),

  unauthorized: (message = 'Authentication required', context?: LogContext) =>
    new APIError(message, 'UNAUTHORIZED', 401, context),

  forbidden: (message = 'Access denied', context?: LogContext) =>
    new APIError(message, 'FORBIDDEN', 403, context),

  notFound: (resource: string, context?: LogContext) =>
    new APIError(`${resource} not found`, 'NOT_FOUND', 404, context),

  conflict: (message: string, context?: LogContext) =>
    new APIError(message, 'CONFLICT', 409, context),

  validationError: (message: string, context?: LogContext) =>
    new APIError(message, 'VALIDATION_ERROR', 422, context),

  rateLimited: (retryAfter: number, context?: LogContext) =>
    new APIError(
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      'RATE_LIMITED',
      429,
      context
    ),

  internalError: (message = 'An unexpected error occurred', context?: LogContext) =>
    new APIError(message, 'INTERNAL_ERROR', 500, context),

  serviceUnavailable: (service: string, context?: LogContext) =>
    new APIError(`${service} is temporarily unavailable`, 'SERVICE_UNAVAILABLE', 503, context),
};

/**
 * Wrap async API handlers with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  return handler().catch((error) => {
    if (error instanceof APIError) {
      logger.warn(error.message, { ...context, ...error.context });
      throw error;
    }

    logger.error('Unhandled error in API handler', error, context);
    throw APIErrors.internalError(undefined, context);
  });
}

export default logger;
