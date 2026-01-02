// =====================================================
// API ROUTE HANDLER WRAPPER
// Global error handling for API routes with proper status codes
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger, APIError, APIErrors } from '@/lib/logging';
import * as Sentry from '@sentry/nextjs';

export type APIHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

export interface APIHandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

// In-memory rate limit store (per-process)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export function checkRateLimit(request: NextRequest, options?: APIHandlerOptions) {
  if (!options?.rateLimit) return null;
  const ip = getClientIp(request);
  const key = `${request.method}:${request.nextUrl.pathname}:${ip}`;
  const now = Date.now();
  const windowMs = options.rateLimit.windowMs;
  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  existing.count += 1;
  if (existing.count > options.rateLimit.requests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return APIErrors.rateLimited(retryAfter, {
      action: 'rateLimit',
      resource: request.nextUrl.pathname,
      metadata: { ip, method: request.method },
    });
  }
  return null;
}

/**
 * Extract user from request (checks Supabase session)
 */
async function extractUser(request: NextRequest): Promise<{ id: string; role: string } | null> {
  try {
    // Check for Authorization header first (API clients)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Token validation would go here
      // For now, return null to trigger auth check via cookies
    }

    // Check Supabase session via cookies
    const supabaseCookie = request.cookies.get('sb-access-token')?.value ||
      request.cookies.getAll().find(c => c.name.includes('auth-token'))?.value;

    if (!supabaseCookie) {
      // Try admin session cookie
      const adminSession = request.cookies.get('admin_session')?.value;
      if (adminSession) {
        try {
          const session = JSON.parse(Buffer.from(adminSession, 'base64').toString()) as {
            adminId: string;
            role: string;
            expires: string;
          };
          if (new Date(session.expires) > new Date()) {
            return { id: session.adminId, role: session.role };
          }
        } catch {
          // ignore malformed cookie
        }
      }
      return null;
    }

    // In production, validate the token with Supabase
    // For now, we'll check if any auth cookie exists
    // The actual user extraction happens in middleware

    // Placeholder: Return mock user if cookie exists
    // Real implementation would decode JWT or call Supabase
    return null;
  } catch (error) {
    logger.warn('Failed to extract user from request', {
      action: 'extractUser',
      metadata: { error: String(error) },
    });
    return null;
  }
}

/**
 * Check if environment is properly configured
 */
export function checkEnvironment(): { configured: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Create JSON error response with consistent format
 */
export function createErrorResponse(
  error: APIError | Error,
  defaultStatusCode = 500
): NextResponse {
  if (error instanceof APIError) {
    return new NextResponse(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': error.code,
      },
    });
  }

  // Generic error
  return new NextResponse(
    JSON.stringify({
      error: {
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : (error as Error).message,
        code: 'INTERNAL_ERROR',
      },
    }),
    {
      status: defaultStatusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Wrap API handler with error handling and authentication
 */
export function withAPIHandler(
  handler: APIHandler,
  options: APIHandlerOptions = {}
): APIHandler {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const startTime = Date.now();
    const path = request.nextUrl.pathname;
    const method = request.method;

    try {
      // Rate limiting
      const rateLimitError = checkRateLimit(request, options);
      if (rateLimitError) {
        const retryHeader = Math.max(
          1,
          parseInt(rateLimitError.toJSON().error.message.replace(/\D+/g, ''), 10) || 60
        );
        return new NextResponse(JSON.stringify(rateLimitError.toJSON()), {
          status: rateLimitError.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryHeader),
          },
        });
      }

      // Check environment configuration
      const envCheck = checkEnvironment();
      if (!envCheck.configured) {
        logger.error('Environment not configured', undefined, {
          action: 'apiHandler',
          resource: path,
          metadata: { missing: envCheck.missing },
        });

        // Return 503 Service Unavailable instead of 500 for config issues
        return new NextResponse(
          JSON.stringify({
            error: {
              message: 'Service temporarily unavailable - configuration pending',
              code: 'SERVICE_UNAVAILABLE',
            },
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check authentication if required
      if (options.requireAuth || options.requireAdmin) {
        const user = await extractUser(request);

        if (!user) {
          logger.info('Unauthorized request to protected endpoint', {
            action: 'apiHandler',
            resource: path,
          });

          return new NextResponse(
            JSON.stringify({
              error: {
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
              },
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Check admin access
        if (options.requireAdmin) {
          const adminRoles = ['admin', 'super_admin'];
          if (!adminRoles.includes(user.role)) {
            logger.warn('Forbidden access attempt', {
              action: 'apiHandler',
              resource: path,
              userId: user.id,
            });

            return new NextResponse(
              JSON.stringify({
                error: {
                  message: 'Access denied - insufficient permissions',
                  code: 'FORBIDDEN',
                },
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Execute handler
      const response = await handler(request, context);

      // Log successful request
      const duration = Date.now() - startTime;
      logger.apiRequest(method, path, response.status, duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle known API errors
      if (error instanceof APIError) {
        logger.apiRequest(method, path, error.statusCode, duration);
        return createErrorResponse(error);
      }

      // Handle unexpected errors
      const err = error instanceof Error ? error : new Error(String(error));

      // Report to Sentry
      Sentry.captureException(err, {
        tags: {
          endpoint: path,
          method,
        },
      });

      logger.error(`Unhandled error in ${method} ${path}`, err, {
        action: 'apiHandler',
        resource: path,
        metadata: { duration },
      });

      // Return 500 only for truly unexpected errors
      return createErrorResponse(err);
    }
  };
}

/**
 * Create API response helpers
 */
export const APIResponse = {
  success: <T>(data: T, status = 200) =>
    NextResponse.json({ data }, { status }),

  created: <T>(data: T) =>
    NextResponse.json({ data }, { status: 201 }),

  noContent: () =>
    new NextResponse(null, { status: 204 }),

  badRequest: (message: string) =>
    createErrorResponse(APIErrors.badRequest(message)),

  unauthorized: (message?: string) =>
    createErrorResponse(APIErrors.unauthorized(message)),

  forbidden: (message?: string) =>
    createErrorResponse(APIErrors.forbidden(message)),

  notFound: (resource: string) =>
    createErrorResponse(APIErrors.notFound(resource)),

  conflict: (message: string) =>
    createErrorResponse(APIErrors.conflict(message)),

  validationError: (message: string) =>
    createErrorResponse(APIErrors.validationError(message)),

  rateLimited: (retryAfter: number) =>
    NextResponse.json(
      {
        error: {
          message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
          code: 'RATE_LIMITED',
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
        },
      }
    ),

  serviceUnavailable: (service: string) =>
    createErrorResponse(APIErrors.serviceUnavailable(service)),

  error: (error: Error | APIError) =>
    createErrorResponse(error),
};

export default withAPIHandler;
