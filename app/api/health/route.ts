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
    // Check if detailed metrics requested
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    const health = await getSystemHealth();

    // Add runtime metrics
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const avgLatency = requestCount > 0 ? totalLatency / requestCount : 0;

    const response = {
      ...health,
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
      integrations: {
        supabase: isConfigured('NEXT_PUBLIC_SUPABASE_URL'),
        stripe: isConfigured('STRIPE_SECRET_KEY'),
        twilio: isConfigured('TWILIO_ACCOUNT_SID'),
        resend: isConfigured('RESEND_API_KEY'),
        openai: isConfigured('OPENAI_API_KEY'),
        sentry: isConfigured('NEXT_PUBLIC_SENTRY_DSN'),
      },
    };

    // Track latency
    totalLatency += Date.now() - requestStart;

    // Return appropriate status code based on health
    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 200
          : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - requestStart}ms`,
      },
    });
  } catch (error) {
    errorCount++;
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
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
