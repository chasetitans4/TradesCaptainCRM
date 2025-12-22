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
function checkEnvironment(): { configured: boolean; missing: string[] } {
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
    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers: {
        'X-Error-Code': error.code,
      },
    });
  }

  // Generic error
  return NextResponse.json(
    {
      error: {
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
        code: 'INTERNAL_ERROR',
      },
    },
    { status: defaultStatusCode }
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
      // Check environment configuration
      const envCheck = checkEnvironment();
      if (!envCheck.configured) {
        logger.error('Environment not configured', undefined, {
          action: 'apiHandler',
          resource: path,
          metadata: { missing: envCheck.missing },
        });

        // Return 503 Service Unavailable instead of 500 for config issues
        return NextResponse.json(
          {
            error: {
              message: 'Service temporarily unavailable - configuration pending',
              code: 'SERVICE_UNAVAILABLE',
            },
          },
          { status: 503 }
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

          return NextResponse.json(
            {
              error: {
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
              },
            },
            { status: 401 }
          );
        }

        // Check admin access
        if (options.requireAdmin) {
          const adminRoles = ['admin', 'superadmin', 'sales_agent'];
          if (!adminRoles.includes(user.role)) {
            logger.warn('Forbidden access attempt', {
              action: 'apiHandler',
              resource: path,
              userId: user.id,
            });

            return NextResponse.json(
              {
                error: {
                  message: 'Access denied - insufficient permissions',
                  code: 'FORBIDDEN',
                },
              },
              { status: 403 }
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
