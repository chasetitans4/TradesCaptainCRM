// =====================================================
// APPLICATION MONITORING
// Health checks, metrics, and alerting
// =====================================================

import * as Sentry from '@sentry/nextjs';
import { checkRedisHealth } from '@/lib/redis/client';
import { logger } from '@/lib/logger';
const monitoringLogger = logger.child({ context: 'monitoring' });

/**
 * Health check status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked: string;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  services: ServiceHealth[];
  timestamp: string;
}

/**
 * Track when app started
 */
const APP_START_TIME = Date.now();

/**
 * Get application uptime in seconds
 */
export function getUptime(): number {
  return Math.floor((Date.now() - APP_START_TIME) / 1000);
}

/**
 * Check if a service is reachable
 */
async function checkServiceHealth(
  name: string,
  checkFn: () => Promise<boolean>
): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    const isHealthy = await checkFn();
    const latencyMs = Date.now() - start;

    return {
      name,
      status: isHealthy ? 'healthy' : 'unhealthy',
      latencyMs,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check Supabase database health
 * TODO: Implement when Supabase is connected
 */
async function checkDatabaseHealth(): Promise<ServiceHealth> {
  // Placeholder - will be implemented when database is connected
  return {
    name: 'database',
    status: 'healthy',
    message: 'Database check pending - connection not configured',
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Check Redis health (critical for rate limiting)
 */
async function checkRedis(): Promise<ServiceHealth> {
  return checkServiceHealth('redis', checkRedisHealth);
}

/**
 * Check external API health
 * TODO: Implement when APIs are connected
 */
async function checkExternalAPIs(): Promise<ServiceHealth[]> {
  // Placeholder for external API health checks
  const services = [
    { name: 'stripe', configured: !!process.env.STRIPE_SECRET_KEY },
    { name: 'twilio', configured: !!process.env.TWILIO_ACCOUNT_SID },
    { name: 'resend', configured: !!process.env.RESEND_API_KEY },
    { name: 'openai', configured: !!process.env.OPENAI_API_KEY },
  ];

  return services.map(({ name, configured }) => ({
    name,
    status: configured ? 'healthy' : ('degraded' as HealthStatus),
    message: configured ? 'Configured' : 'Not configured - integration pending',
    lastChecked: new Date().toISOString(),
  }));
}

/**
 * Get complete system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const [dbHealth, redisHealth, ...apiHealths] = await Promise.all([
    checkDatabaseHealth(),
    checkRedis(),
    ...await checkExternalAPIs(),
  ]);

  const services = [dbHealth, redisHealth, ...apiHealths];

  // Overall status is the worst status of all services
  let overallStatus: HealthStatus = 'healthy';
  for (const service of services) {
    if (service.status === 'unhealthy') {
      overallStatus = 'unhealthy';
      break;
    }
    if (service.status === 'degraded') {
      overallStatus = 'degraded';
    }
  }

  return {
    status: overallStatus,
    version: process.env.npm_package_version || '0.1.0',
    uptime: getUptime(),
    services,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Web Vitals tracking
 */
export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

/**
 * Report Web Vitals to Sentry
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  // Send to Sentry as custom measurement
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: `${metric.name}: ${metric.value}`,
    level: metric.rating === 'poor' ? 'warning' : 'info',
    data: {
      id: metric.id,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    },
  });

  // Log poor performance metrics
  if (metric.rating === 'poor') {
    Sentry.captureMessage(`Poor ${metric.name}: ${metric.value}`, {
      level: 'warning',
      tags: {
        webVital: metric.name,
        rating: metric.rating,
      },
    });
  }
}

/**
 * Performance monitoring utilities
 */
export const performance = {
  /**
   * Measure function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - start;

      // Log slow operations
      if (duration > 1000) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Slow operation: ${name}`,
          level: 'warning',
          data: { duration, ...tags },
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Failed operation: ${name}`,
        level: 'error',
        data: { duration, error: String(error), ...tags },
      });
      throw error;
    }
  },

  /**
   * Create a performance marker
   */
  mark(_name: string): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  },
};

/**
 * Custom alert rules
 */
export interface AlertRule {
  id: string;
  name: string;
  condition: () => Promise<boolean>;
  severity: 'info' | 'warning' | 'critical';
  cooldownMinutes: number;
}

// Track when alerts were last fired
const alertCooldowns: Record<string, number> = {};

/**
 * Check alert rules and send notifications
 */
export async function checkAlertRules(rules: AlertRule[]): Promise<void> {
  for (const rule of rules) {
    const lastFired = alertCooldowns[rule.id] || 0;
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;

    if (Date.now() - lastFired < cooldownMs) {
      continue; // Still in cooldown
    }

    try {
      const shouldAlert = await rule.condition();

      if (shouldAlert) {
        alertCooldowns[rule.id] = Date.now();

        // Send to Sentry
        Sentry.captureMessage(`Alert: ${rule.name}`, {
          level: rule.severity === 'critical' ? 'fatal' : rule.severity,
          tags: {
            alertId: rule.id,
            alertSeverity: rule.severity,
          },
        });
      }
    } catch (error) {
      monitoringLogger.error({
        msg: 'Error checking alert rule',
        ruleId: rule.id,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    }
  }
}

/**
 * Example alert rules
 * TODO: Customize based on production requirements
 */
export const defaultAlertRules: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High error rate detected',
    condition: async () => false, // TODO: Implement error rate tracking
    severity: 'critical',
    cooldownMinutes: 15,
  },
  {
    id: 'slow-db-queries',
    name: 'Database queries are slow',
    condition: async () => false, // TODO: Implement DB latency tracking
    severity: 'warning',
    cooldownMinutes: 30,
  },
  {
    id: 'api-degradation',
    name: 'External API degradation',
    condition: async () => false, // TODO: Implement API health tracking
    severity: 'warning',
    cooldownMinutes: 15,
  },
];

export default {
  getSystemHealth,
  getUptime,
  reportWebVitals,
  performance,
  checkAlertRules,
  defaultAlertRules,
};
