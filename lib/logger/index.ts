// =====================================================
// STRUCTURED LOGGING WITH PINO
// Production-ready logging with JSON output
// =====================================================

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: logLevel,

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'apiKey',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },

  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Base fields for all logs
  base: {
    service: 'trades-captain-crm',
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
  },
};

// Create logger with pretty printing in development
export const logger = isProduction
  ? pino(baseConfig)
  : pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });

// Create child loggers for different contexts
export const apiLogger = logger.child({ context: 'api' });
export const authLogger = logger.child({ context: 'auth' });
export const jobLogger = logger.child({ context: 'jobs' });
export const cacheLogger = logger.child({ context: 'cache' });
export const queueLogger = logger.child({ context: 'queue' });
export const smsLogger = logger.child({ context: 'sms' });
export const emailLogger = logger.child({ context: 'email' });
export const aiLogger = logger.child({ context: 'ai' });
export const syncLogger = logger.child({ context: 'sync' });

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId: string, userId?: string, businessId?: string) {
  return logger.child({
    requestId,
    ...(userId && { userId }),
    ...(businessId && { businessId }),
  });
}

/**
 * Log API request
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  userId?: string,
  businessId?: string
) {
  apiLogger.info({
    msg: `${method} ${path} ${statusCode}`,
    method,
    path,
    statusCode,
    durationMs,
    userId,
    businessId,
  });
}

/**
 * Log API error
 */
export function logApiError(
  method: string,
  path: string,
  error: Error,
  statusCode: number = 500,
  userId?: string
) {
  apiLogger.error({
    msg: `API Error: ${method} ${path}`,
    method,
    path,
    statusCode,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    userId,
  });
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  event: 'login' | 'logout' | 'signup' | 'password_reset' | 'failed_login',
  userId?: string,
  email?: string,
  ip?: string
) {
  const level = event === 'failed_login' ? 'warn' : 'info';
  authLogger[level]({
    msg: `Auth event: ${event}`,
    event,
    userId,
    email,
    ip,
  });
}

/**
 * Log queue job
 */
export function logQueueJob(
  queue: string,
  jobId: string,
  status: 'started' | 'completed' | 'failed',
  durationMs?: number,
  error?: Error
) {
  if (status === 'failed') {
    queueLogger.error({
      msg: `Queue job failed: ${queue}/${jobId}`,
      queue,
      jobId,
      status,
      durationMs,
      error: error ? {
        name: error.name,
        message: error.message,
      } : undefined,
    });
  } else {
    queueLogger.info({
      msg: `Queue job ${status}: ${queue}/${jobId}`,
      queue,
      jobId,
      status,
      durationMs,
    });
  }
}

/**
 * Log cache operation
 */
export function logCacheOperation(
  operation: 'get' | 'set' | 'delete' | 'hit' | 'miss',
  key: string,
  durationMs?: number
) {
  cacheLogger.debug({
    msg: `Cache ${operation}: ${key}`,
    operation,
    key,
    durationMs,
  });
}

/**
 * Log SMS send
 */
export function logSms(
  to: string,
  status: 'sent' | 'failed' | 'delivered',
  businessId: string,
  customerId?: string,
  error?: string
) {
  if (status === 'failed') {
    smsLogger.error({
      msg: `SMS failed to ${to}`,
      to: to.slice(-4), // Last 4 digits only
      status,
      businessId,
      customerId,
      error,
    });
  } else {
    smsLogger.info({
      msg: `SMS ${status} to ${to.slice(-4)}`,
      to: to.slice(-4),
      status,
      businessId,
      customerId,
    });
  }
}

/**
 * Log AI request
 */
export function logAiRequest(
  model: string,
  tokensUsed: number,
  durationMs: number,
  cached: boolean,
  businessId: string
) {
  aiLogger.info({
    msg: `AI request: ${model}`,
    model,
    tokensUsed,
    durationMs,
    cached,
    businessId,
  });
}

/**
 * Log sync operation
 */
export function logSync(
  service: 'quickbooks' | 'calendar' | 'stripe',
  operation: string,
  status: 'started' | 'completed' | 'failed',
  businessId: string,
  entityType?: string,
  entityId?: string,
  error?: string
) {
  if (status === 'failed') {
    syncLogger.error({
      msg: `Sync failed: ${service} ${operation}`,
      service,
      operation,
      status,
      businessId,
      entityType,
      entityId,
      error,
    });
  } else {
    syncLogger.info({
      msg: `Sync ${status}: ${service} ${operation}`,
      service,
      operation,
      status,
      businessId,
      entityType,
      entityId,
    });
  }
}

/**
 * Performance timing helper
 */
export function measureTime<T>(
  label: string,
  fn: () => T | Promise<T>,
  loggerInstance: pino.Logger = logger
): T | Promise<T> {
  const start = performance.now();

  const logDuration = (result: T) => {
    const duration = performance.now() - start;
    loggerInstance.debug({
      msg: `${label} completed`,
      label,
      durationMs: Math.round(duration * 100) / 100,
    });
    return result;
  };

  const result = fn();

  if (result instanceof Promise) {
    return result.then(logDuration);
  }

  return logDuration(result);
}

// Export types
export type Logger = pino.Logger;
