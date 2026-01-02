// =====================================================
// RATE LIMIT MIDDLEWARE
// Next.js Edge middleware for API rate limiting
// Uses in-memory store (Edge-compatible, no Node.js deps)
// For Redis-backed rate limiting, use lib/rate-limit/index.ts in API routes
// =====================================================

import { NextRequest, NextResponse } from 'next/server';

// Re-export types
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

// In-memory store for Edge middleware (per-isolate)
// Note: In Edge runtime, each isolate has its own memory, so this provides
// per-instance rate limiting. For distributed rate limiting across instances,
// use Redis in API route handlers (Node.js runtime).
const memoryStore = new Map<string, { count: number; resetAt: number }>();
const MAX_MEMORY_ENTRIES = 10000;

// Rate limit configurations
const RATE_LIMIT_CONFIGS = {
  api: { requests: 100, windowMs: 60000 },       // 100 requests per minute
  auth: { requests: 10, windowMs: 900000 },      // 10 requests per 15 minutes
  search: { requests: 60, windowMs: 60000 },     // 60 requests per minute
  ai: { requests: 20, windowMs: 3600000 },       // 20 requests per hour
  default: { requests: 200, windowMs: 60000 },   // 200 requests per minute
};

/**
 * Get rate limit config for a path
 */
function getRateLimitConfig(pathname: string): { requests: number; windowMs: number } {
  if (pathname.includes('/api/auth') || pathname.includes('/login')) {
    return RATE_LIMIT_CONFIGS.auth;
  }
  if (pathname.includes('/api/search')) {
    return RATE_LIMIT_CONFIGS.search;
  }
  if (pathname.includes('/api/ai')) {
    return RATE_LIMIT_CONFIGS.ai;
  }
  if (pathname.startsWith('/api/')) {
    return RATE_LIMIT_CONFIGS.api;
  }
  return RATE_LIMIT_CONFIGS.default;
}

/**
 * In-memory rate limiting (fixed window)
 * Edge-compatible - no Node.js dependencies
 */
function checkWithMemory(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): RateLimitResult {
  // Clean up if store gets too large
  if (memoryStore.size > MAX_MEMORY_ENTRIES) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt < now) {
        memoryStore.delete(k);
      }
    }
  }

  let entry = memoryStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return {
    allowed,
    remaining,
    resetAt: new Date(entry.resetAt),
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Check rate limit using in-memory store
 */
function checkRateLimit(
  identifier: string,
  pathname: string
): RateLimitResult {
  const config = getRateLimitConfig(pathname);
  const key = `${identifier}:${pathname.split('/').slice(0, 3).join('/')}`;
  const now = Date.now();

  return checkWithMemory(key, config.requests, config.windowMs, now);
}

interface RateLimitMiddlewareOptions {
  userId?: string;
  customLimit?: number;
  customWindow?: number;
}

/**
 * Rate limit middleware for Edge runtime
 * Uses in-memory store (Edge-compatible, synchronous)
 * For distributed rate limiting, use Redis in API route handlers
 */
export function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = {}
): NextResponse | null {
  const { userId } = options;

  // Use user ID if authenticated, otherwise use IP
  const identifier = userId ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  const pathname = request.nextUrl.pathname;
  const result = checkRateLimit(identifier, pathname);

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  return null; // Continue processing
}

// Legacy exports for backward compatibility (synchronous for Edge)
export function checkAPIRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, '/api/');
}

export function checkLoginRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, '/api/auth/login');
}

/**
 * Create a rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
        'Retry-After': (result.retryAfter || 60).toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  limit: number = 100
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

  return response;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 * Edge-compatible version using in-memory store
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: RateLimitMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = rateLimitMiddleware(request, options);

    if (rateLimitResult) {
      return rateLimitResult;
    }

    return handler(request);
  };
}
