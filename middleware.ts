// =====================================================
// ROOT MIDDLEWARE
// Handles authentication, CSRF protection, rate limiting, and security
// =====================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';

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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
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

  // Apply rate limiting for API routes (Edge-compatible in-memory)
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = rateLimitMiddleware(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
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
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // Skip CSRF for API routes with proper Bearer auth (API clients)
    const authHeader = request.headers.get('authorization');
    const hasValidApiAuth = authHeader?.startsWith('Bearer ');

    // Skip CSRF for webhooks (already validated by signature)
    const isWebhook = pathname.startsWith('/api/webhooks');

    if (!hasValidApiAuth && !isWebhook) {
      // Validate Origin header first
      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return NextResponse.json(
              { error: 'CSRF validation failed', message: 'Origin mismatch' },
              { status: 403 }
            );
          }
        } catch {
          // Invalid origin URL
          return NextResponse.json(
            { error: 'CSRF validation failed', message: 'Invalid origin' },
            { status: 403 }
          );
        }
      } else if (referer) {
        // Fallback to Referer header if Origin is missing
        try {
          const refererHost = new URL(referer).host;
          if (refererHost !== host) {
            return NextResponse.json(
              { error: 'CSRF validation failed', message: 'Referer mismatch' },
              { status: 403 }
            );
          }
        } catch {
          // Invalid referer URL
          return NextResponse.json(
            { error: 'CSRF validation failed', message: 'Invalid referer' },
            { status: 403 }
          );
        }
      } else {
        // Neither Origin nor Referer present - this is suspicious for browser requests
        // Allow only for specific non-browser clients (e.g., cURL, Postman with valid auth)
        // For cookie-based auth, we require Origin/Referer
        const hasCookieAuth = request.cookies.has('sb-access-token') ||
                              request.cookies.has('admin-session') ||
                              request.cookies.has('portal-session');

        if (hasCookieAuth) {
          return NextResponse.json(
            { error: 'CSRF validation failed', message: 'Missing origin header' },
            { status: 403 }
          );
        }
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
