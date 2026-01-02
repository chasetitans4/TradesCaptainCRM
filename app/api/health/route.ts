// =====================================================
// HEALTH CHECK API ENDPOINT
// Returns system health status for monitoring
// =====================================================

import { NextResponse } from 'next/server';
import { getSystemHealth } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Track request metrics
let requestCount = 0;
let errorCount = 0;
let totalLatency = 0;
const startTime = Date.now();

/**
 * GET /api/health
 * Returns system health status with detailed metrics
 */
export async function GET(request: Request) {
  const requestStart = Date.now();
  requestCount++;
  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';
    const ttlMs = 5000;
    const withTimeout = <T>(p: Promise<T>, ms: number) =>
      new Promise<T | null>((resolve) => {
        let done = false;
        const t = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(null);
          }
        }, ms);
        p.then((v) => {
          if (!done) {
            done = true;
            clearTimeout(t);
            resolve(v);
          }
        }).catch(() => {
          if (!done) {
            done = true;
            clearTimeout(t);
            resolve(null);
          }
        });
      });
    let healthCache: any = (globalThis as any).__healthCache;
    let healthCacheTs: number = (globalThis as any).__healthCacheTs || 0;
    let health: any = null;
    if (detailed) {
      const fresh = healthCache && Date.now() - healthCacheTs < ttlMs;
      if (fresh) {
        health = healthCache;
      } else {
        const inFlight: Promise<any> | null = (globalThis as any).__healthInFlight || null;
        if (!inFlight) {
          (globalThis as any).__healthInFlight = withTimeout(getSystemHealth(), 300).then((h) => {
            if (h) {
              (globalThis as any).__healthCache = h;
              (globalThis as any).__healthCacheTs = Date.now();
            }
            (globalThis as any).__healthInFlight = null;
            return h;
          });
        }
        health = fresh ? healthCache : null;
      }
    }
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const avgLatency = requestCount > 0 ? totalLatency / requestCount : 0;
    const baseIntegrations = {
      supabase: isConfigured('NEXT_PUBLIC_SUPABASE_URL'),
      stripe: isConfigured('STRIPE_SECRET_KEY'),
      twilio: isConfigured('TWILIO_ACCOUNT_SID'),
      resend: isConfigured('RESEND_API_KEY'),
      openai: isConfigured('OPENAI_API_KEY'),
      sentry: isConfigured('NEXT_PUBLIC_SENTRY_DSN'),
    };
    const response = {
      status: detailed ? (health?.status || 'degraded') : 'healthy',
      version: health?.version || (process.env.npm_package_version || '0.1.0'),
      uptime: health?.uptime || uptimeSeconds,
      services: detailed ? (health?.services || []) : [],
      timestamp: new Date().toISOString(),
      metrics: {
        uptime: uptimeSeconds,
        requests: requestCount,
        errors: errorCount,
        errorRate: requestCount > 0 ? (errorCount / requestCount * 100).toFixed(2) + '%' : '0%',
        avgLatencyMs: Math.round(avgLatency),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: detailed ? getMemoryUsage() : undefined,
        cpuUsage: detailed ? getCpuUsage() : undefined,
      },
      integrations: baseIntegrations,
    };
    totalLatency += Date.now() - requestStart;
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - requestStart}ms`,
      },
    });
  } catch (error) {
    errorCount++;
    return NextResponse.json(
      {
        status: 'degraded',
        error: 'Health check degraded',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

/**
 * HEAD /api/health
 * Quick health check (just returns 200 if server is up)
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

/**
 * Check if environment variable is configured
 */
function isConfigured(key: string): boolean {
  return !!process.env[key];
}

/**
 * Get memory usage statistics
 */
function getMemoryUsage(): Record<string, string> {
  const used = process.memoryUsage();
  return {
    heapUsed: formatBytes(used.heapUsed),
    heapTotal: formatBytes(used.heapTotal),
    rss: formatBytes(used.rss),
    external: formatBytes(used.external),
  };
}

/**
 * Get CPU usage (approximate)
 */
function getCpuUsage(): Record<string, string> {
  const usage = process.cpuUsage();
  return {
    user: `${(usage.user / 1000000).toFixed(2)}s`,
    system: `${(usage.system / 1000000).toFixed(2)}s`,
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}
