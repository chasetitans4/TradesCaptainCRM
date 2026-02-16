// =====================================================
// STRUCTURED LOGGING
// Edge-compatible logging with JSON output
// =====================================================

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'info');

// Log level priorities
const LOG_LEVELS: Record<string, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

// Sensitive fields to redact
const REDACT_FIELDS = [
  'password',
  'token',
  'authorization',
  'apiKey',
  'secret',
  'cookie',
];

function shouldLog(level: string): boolean {
  return (LOG_LEVELS[level] || 0) >= (LOG_LEVELS[logLevel] || 0);
}

function redactSensitive(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACT_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

interface LogEntry {
  level: string;
  time: string;
  context?: string;
  msg: string;
  [key: string]: unknown;
}

function formatLog(level: string, context: string | undefined, msg: string, data?: Record<string, unknown>): string {
  const redactedData = (data ? (redactSensitive(data) as Record<string, unknown>) : {}) as Record<string, unknown>;
  const entry: LogEntry = {
    level,
    time: new Date().toISOString(),
    ...(context && { context }),
    msg,
    ...redactedData,
  };

  if (isProduction) {
    return JSON.stringify(entry);
  }

  // Pretty print in development
  const prefix = context ? `[${context}]` : '';
  const dataStr = data ? ` ${JSON.stringify(redactedData)}` : '';
  return `${entry.time} ${level.toUpperCase()} ${prefix} ${msg}${dataStr}`;
}

class Logger {
  private context?: string;
  private baseData: Record<string, unknown>;

  constructor(context?: string, baseData: Record<string, unknown> = {}) {
    this.context = context;
    this.baseData = baseData;
  }

  child(data: Record<string, unknown>): Logger {
    return new Logger(data.context as string || this.context, { ...this.baseData, ...data });
  }

  debug(data: Record<string, unknown> | string, msg?: string): void {
    if (!shouldLog('debug')) return;
    const { message, logData } = this.parseArgs(data, msg);
    console.debug(formatLog('debug', this.context, message, { ...this.baseData, ...logData }));
  }

  info(data: Record<string, unknown> | string, msg?: string): void {
    if (!shouldLog('info')) return;
    const { message, logData } = this.parseArgs(data, msg);
    console.info(formatLog('info', this.context, message, { ...this.baseData, ...logData }));
  }

  warn(data: Record<string, unknown> | string, msg?: string): void {
    if (!shouldLog('warn')) return;
    const { message, logData } = this.parseArgs(data, msg);
    console.warn(formatLog('warn', this.context, message, { ...this.baseData, ...logData }));
  }

  error(data: Record<string, unknown> | string, msg?: string): void {
    if (!shouldLog('error')) return;
    const { message, logData } = this.parseArgs(data, msg);
    console.error(formatLog('error', this.context, message, { ...this.baseData, ...logData }));
  }

  fatal(data: Record<string, unknown> | string, msg?: string): void {
    const { message, logData } = this.parseArgs(data, msg);
    console.error(formatLog('fatal', this.context, message, { ...this.baseData, ...logData }));
  }

  private parseArgs(data: Record<string, unknown> | string, msg?: string): { message: string; logData: Record<string, unknown> } {
    if (typeof data === 'string') {
      return { message: data, logData: {} };
    }
    const { msg: dataMsg, ...rest } = data;
    return { message: (msg || dataMsg || '') as string, logData: rest };
  }
}

// Create main logger
export const logger = new Logger(undefined, {
  service: 'trades-captain-crm',
  version: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
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
export const cleanupLogger = logger.child({ context: 'cleanup' });

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId: string, userId?: string, businessId?: string): Logger {
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
): void {
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
): void {
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
): void {
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
): void {
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
): void {
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
): void {
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
): void {
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
): void {
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
  loggerInstance: Logger = logger
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
export type { Logger };
