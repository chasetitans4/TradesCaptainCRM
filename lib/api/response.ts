// =====================================================
// API RESPONSE UTILITIES
// Standardized error responses with correlation IDs
// =====================================================

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { apiLogger } from '@/lib/logger';

/**
 * Generate a correlation ID for request tracing
 * Uses request header if available, otherwise generates new
 */
export function getCorrelationId(requestId?: string | null): string {
  return requestId || uuidv4();
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  correlationId: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  data: T;
  correlationId: string;
}

/**
 * Create a standardized error response with correlation ID
 */
export function errorResponse(
  error: string,
  status: number,
  options?: {
    message?: string;
    code?: string;
    details?: Record<string, unknown>;
    correlationId?: string;
  }
): NextResponse<ApiErrorResponse> {
  const correlationId = options?.correlationId || getCorrelationId();

  // Log error server-side for debugging
  apiLogger.error({
    msg: 'API Error',
    correlationId,
    error,
    status,
    code: options?.code,
    details: options?.details,
  });

  const response: ApiErrorResponse = {
    error,
    correlationId,
  };

  if (options?.message) response.message = options.message;
  if (options?.code) response.code = options.code;
  if (options?.details) response.details = options.details;

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Correlation-ID': correlationId,
    },
  });
}

/**
 * Create a standardized success response with correlation ID
 */
export function successResponse<T>(
  data: T,
  options?: {
    status?: number;
    correlationId?: string;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const correlationId = options?.correlationId || getCorrelationId();

  return NextResponse.json(
    { data, correlationId },
    {
      status: options?.status || 200,
      headers: {
        'X-Correlation-ID': correlationId,
      },
    }
  );
}

// Common error response helpers
export const ApiErrors = {
  badRequest: (message: string, correlationId?: string) =>
    errorResponse('Bad Request', 400, { message, correlationId }),

  unauthorized: (message = 'Authentication required', correlationId?: string) =>
    errorResponse('Unauthorized', 401, { message, correlationId }),

  forbidden: (message = 'Access denied', correlationId?: string) =>
    errorResponse('Forbidden', 403, { message, correlationId }),

  notFound: (resource = 'Resource', correlationId?: string) =>
    errorResponse('Not Found', 404, { message: `${resource} not found`, correlationId }),

  conflict: (message: string, correlationId?: string) =>
    errorResponse('Conflict', 409, { message, correlationId }),

  validationError: (details: Record<string, string>, correlationId?: string) =>
    errorResponse('Validation Error', 422, {
      message: 'The request data failed validation',
      code: 'VALIDATION_ERROR',
      details,
      correlationId,
    }),

  rateLimited: (retryAfter?: number, correlationId?: string) =>
    NextResponse.json(
      {
        error: 'Rate Limit Exceeded',
        message: 'Too many requests. Please try again later.',
        correlationId: correlationId || getCorrelationId(),
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-Correlation-ID': correlationId || getCorrelationId(),
          ...(retryAfter ? { 'Retry-After': retryAfter.toString() } : {}),
        },
      }
    ),

  internalError: (correlationId?: string) => {
    const id = correlationId || getCorrelationId();
    return errorResponse('Internal Server Error', 500, {
      message: `An unexpected error occurred. Reference ID: ${id}`,
      correlationId: id,
    });
  },

  serviceUnavailable: (message = 'Service temporarily unavailable', correlationId?: string) =>
    errorResponse('Service Unavailable', 503, { message, correlationId }),
};

/**
 * Wrap an async API handler with error handling and correlation ID
 */
export function withErrorHandling<T>(
  handler: (correlationId: string) => Promise<NextResponse<T>>
) {
  return async (request: Request): Promise<NextResponse> => {
    // Get correlation ID from request header or generate new
    const correlationId = getCorrelationId(
      request.headers.get('X-Correlation-ID') ||
      request.headers.get('X-Request-ID')
    );

    try {
      return await handler(correlationId);
    } catch (error) {
      apiLogger.error({
        msg: 'Unhandled API error',
        correlationId,
        error,
      });
      return ApiErrors.internalError(correlationId);
    }
  };
}

/**
 * Extract correlation ID from incoming request
 */
export function extractCorrelationId(request: Request): string {
  return getCorrelationId(
    request.headers.get('X-Correlation-ID') ||
    request.headers.get('X-Request-ID')
  );
}
