// =====================================================
// RATE LIMIT MIDDLEWARE
// Next.js middleware for API rate limiting
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkAPIRateLimit, checkLoginRateLimit, RateLimitResult } from './index';

interface RateLimitMiddlewareOptions {
  userId?: string;
  customLimit?: number;
  customWindow?: number;
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = {}
): Promise<NextResponse | null> {
  const { userId } = options;

  // Use user ID if authenticated, otherwise use IP
  const identifier = userId ||
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const result = userId
    ? await checkAPIRateLimit(identifier)
    : await checkLoginRateLimit(identifier);

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  return null; // Continue processing
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
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: RateLimitMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = await rateLimitMiddleware(request, options);

    if (rateLimitResult) {
      return rateLimitResult;
    }

    return handler(request);
  };
}

/**
 * Check rate limit for specific action types
 */
export async function checkActionRateLimit(
  action: 'sms' | 'email' | 'ai' | 'upload' | 'search',
  identifier: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  let result: RateLimitResult;

  switch (action) {
    case 'sms':
      const { checkSMSRateLimit } = await import('./index');
      result = await checkSMSRateLimit(identifier);
      break;
    case 'email':
      const { checkEmailRateLimit } = await import('./index');
      result = await checkEmailRateLimit(identifier);
      break;
    case 'ai':
      const { checkAIRateLimit } = await import('./index');
      result = await checkAIRateLimit(identifier);
      break;
    case 'upload':
      const { checkUploadRateLimit } = await import('./index');
      result = await checkUploadRateLimit(identifier);
      break;
    case 'search':
      const { checkSearchRateLimit } = await import('./index');
      result = await checkSearchRateLimit(identifier);
      break;
    default:
      result = await checkAPIRateLimit(identifier);
  }

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitResponse(result),
    };
  }

  return { allowed: true };
}
