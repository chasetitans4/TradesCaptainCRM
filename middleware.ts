// =====================================================
// ROOT MIDDLEWARE
// Handles authentication, CSRF protection, rate limiting, and security
// =====================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// In-memory rate limit store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configuration per route type
const RATE_LIMITS = {
  api: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  auth: { requests: 10, windowMs: 900000 }, // 10 requests per 15 minutes
  search: { requests: 60, windowMs: 60000 }, // 60 requests per minute
  ai: { requests: 20, windowMs: 3600000 }, // 20 requests per hour
  default: { requests: 200, windowMs: 60000 }, // 200 requests per minute
};

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/confirm',
  '/pricing',
  '/features',
  '/about',
  '/contact',
  '/api/webhooks',
  '/api/cron',
  '/api/public',
];

// Routes that are for admin portal only
const adminRoutes = ['/admin-portal'];

// Static asset patterns
const staticPatterns = [
  '/_next',
  '/favicon',
  '/images',
  '/icons',
  '/manifest',
  '/sw',
  '/workbox',
];

/**
 * Check if path matches any pattern
 */
function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern =>
    pathname === pattern ||
    pathname.startsWith(pattern + '/') ||
    pathname.startsWith(pattern + '.')
  );
}

/**
 * Get rate limit config for a path
 */
function getRateLimitConfig(pathname: string): { requests: number; windowMs: number } {
  if (pathname.includes('/api/auth') || pathname.includes('/login')) {
    return RATE_LIMITS.auth;
  }
  if (pathname.includes('/api/search')) {
    return RATE_LIMITS.search;
  }
  if (pathname.includes('/api/ai')) {
    return RATE_LIMITS.ai;
  }
  if (pathname.startsWith('/api/')) {
    return RATE_LIMITS.api;
  }
  return RATE_LIMITS.default;
}

/**
 * Check and update rate limit
 */
function checkRateLimit(
  identifier: string,
  pathname: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = getRateLimitConfig(pathname);
  const now = Date.now();
  const key = `${identifier}:${pathname.split('/').slice(0, 3).join('/')}`;

  let entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, config.requests - entry.count);
  const allowed = entry.count <= config.requests;

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return cfConnectingIp ||
    realIp ||
    forwardedFor?.split(',')[0]?.trim() ||
    request.ip ||
    'unknown';
}

/**
 * Create a CSP nonce for inline scripts
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Get Content Security Policy
 */
function getCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  // Base CSP directives
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Allow Stripe and analytics
      'https://js.stripe.com',
      'https://www.googletagmanager.com',
      ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind and inline styles
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co',
      'https://*.stripe.com',
      'https://lh3.googleusercontent.com', // Google profile images
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.stripe.com',
      'https://api.twilio.com',
      'https://api.resend.com',
      'https://api.openai.com',
      ...(isDev ? ['http://localhost:*', 'ws://localhost:*'] : []),
    ],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(' ')}` : key
    )
    .join('; ');
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Update Supabase session
 */
async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Return early if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return { response, user: null, error: new Error('Supabase not configured'), supabase: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // Refresh session if needed
    const { data: { user }, error } = await supabase.auth.getUser();
    return { response, user, error, supabase };
  } catch (error) {
    // Handle Supabase connection errors gracefully
    return { response, user: null, error: error as Error, supabase };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets
  if (matchesPattern(pathname, staticPatterns)) {
    return NextResponse.next();
  }

  // Skip API webhooks and public endpoints
  if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/public') || pathname === '/api/health') {
    return NextResponse.next();
  }

  // Apply rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, pathname);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: {
            message: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMITED',
            retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }
  }

  // Generate CSP nonce
  const nonce = generateNonce();

  // Update Supabase session
  const { response, user, supabase } = await updateSession(request);

  // Add CSP header
  const csp = getCSP(nonce);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);

  // Check if route requires authentication
  const isPublicRoute = matchesPattern(pathname, publicRoutes);
  const isAdminRoute = matchesPattern(pathname, adminRoutes);

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check admin access
  if (isAdminRoute && user && supabase) {
    try {
      // Fetch user role from database
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();

      const allowedRoles = ['admin', 'superadmin', 'sales_agent'];

      if (!profile || !allowedRoles.includes(profile.role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      // If database query fails, deny admin access
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // CSRF protection for mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // Skip CSRF for API routes with proper auth headers
    const hasAuthHeader = request.headers.get('authorization');

    if (!hasAuthHeader && origin) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: 'CSRF validation failed' },
          { status: 403 }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
