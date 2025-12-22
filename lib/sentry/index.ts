// =====================================================
// SENTRY ERROR TRACKING
// Configuration and helper functions
// =====================================================

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry (call in instrumentation.ts)
 */
export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay for errors
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

    // Ignore common non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'Load failed',
      'Failed to fetch',
      'Network request failed',
      'AbortError',
      'ChunkLoadError',
      // Add more as needed
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Redact passwords
            if (breadcrumb.data.password) {
              breadcrumb.data.password = '[REDACTED]';
            }
            // Redact tokens
            if (breadcrumb.data.token) {
              breadcrumb.data.token = '[REDACTED]';
            }
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Tag transactions
    beforeSendTransaction(event) {
      // Add custom tags
      if (event.transaction) {
        event.tags = {
          ...event.tags,
          transaction_type: event.transaction.startsWith('/api/') ? 'api' : 'page',
        };
      }
      return event;
    },
  });
}

/**
 * Capture an exception with context
 */
export function captureException(
  error: Error | unknown,
  context?: {
    user?: { id: string; email?: string };
    business?: { id: string; name?: string };
    extra?: Record<string, any>;
    tags?: Record<string, string>;
    level?: Sentry.SeverityLevel;
  }
) {
  Sentry.withScope((scope) => {
    // Set user context
    if (context?.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
      });
    }

    // Set business context
    if (context?.business) {
      scope.setTag('business_id', context.business.id);
      if (context.business.name) {
        scope.setTag('business_name', context.business.name);
      }
    }

    // Set extra context
    if (context?.extra) {
      scope.setExtras(context.extra);
    }

    // Set custom tags
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }

    // Set level
    if (context?.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; name?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Set business context as tag
 */
export function setBusinessContext(businessId: string, businessName?: string) {
  Sentry.setTag('business_id', businessId);
  if (businessName) {
    Sentry.setTag('business_name', businessName);
  }
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  operation: string
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op: operation,
  });
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    name?: string;
    tags?: Record<string, string>;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        tags: options?.tags,
        extra: { functionName: options?.name || fn.name, args },
      });
      throw error;
    }
  }) as T;
}

/**
 * Create an error boundary handler
 */
export function handleErrorBoundary(
  error: Error,
  componentStack: string,
  eventId: string
) {
  Sentry.withScope((scope) => {
    scope.setExtra('componentStack', componentStack);
    scope.setTag('error_boundary', 'true');
    Sentry.captureException(error);
  });
}

/**
 * Report a feedback from user
 */
export function reportFeedback(
  eventId: string,
  feedback: {
    name: string;
    email: string;
    comments: string;
  }
) {
  Sentry.captureFeedback({
    associatedEventId: eventId,
    name: feedback.name,
    email: feedback.email,
    message: feedback.comments,
  });
}

// Re-export Sentry for direct access
export { Sentry };
