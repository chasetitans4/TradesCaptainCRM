// =====================================================
// ROOT PROXY (Next.js 16)
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
  '/api/portal',
  // Auth API endpoints need to be accessible without Supabase auth
  '/api/auth/password/reset',
  '/api/auth/callback',
  // Admin API login needs to be accessible without Supabase auth
  '/api/admin/login',
  '/api/admin/auth/login',
  '/api/admin/me',
  '/api/admin/auth/me',
  // Admin portal needs to be accessible without Supabase auth;
  // it has its own session/cookies
  '/admin',
  '/admin/login',
  // Customer portal handles its own sessions
  '/portal',
  '/screenshots-preview',
];

// Routes that are for admin portal only
const adminRoutes: string[] = []; // Empty because /admin is now handled by custom auth, not Supabase auth

// Static asset patterns
const staticPatterns = [
  '/_next',
  '/@vite',  // IDE webview requests
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
  };

  // Only enable HTTPS upgrades in production to avoid breaking localhost HTTP
  if (!isDev) {
    directives['upgrade-insecure-requests'] = [];
  }

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
  const hostHeader = request.headers.get('host') || '';
  console.log('[Middleware] Processing:', { pathname, host: hostHeader });

  const host = hostHeader.split(':')[0];
  const port = hostHeader.split(':')[1] || '';
  const isAdminHost = host === 'admin.tradescaptain.com';
  const isPortalHost = port === '3001';
  const isCrmHost = host === 'crm.tradescaptain.com';

  // Generate or extract correlation ID for request tracing
  // This enables end-to-end tracing across services and logs
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

  // Skip proxy for static assets
  if (matchesPattern(pathname, staticPatterns)) {
    return NextResponse.next();
  }

  // Skip API webhooks and public endpoints (but still add correlation ID)
  if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/public') || pathname === '/api/health') {
    const response = NextResponse.next();
    response.headers.set('x-correlation-id', correlationId);
    return response;
  }

  // Host-based routing:
  // - localhost:3001 serves the Customer Portal
  // - admin.tradescaptain.com serves the Admin Portal under /admin
  //   and defaults to /admin/login at root
  // - crm.tradescaptain.com serves the CRM app and defaults to /login at root

  if (isPortalHost) {
     // Allow access to portal routes and public assets
     // Redirect root to a portal-specific landing or 404 if no business ID is known,
     // but usually portal is accessed via /portal/[id].

     if (pathname.startsWith('/portal') || pathname.startsWith('/api/portal')) {
        // Allow request to proceed
     } else {
        // Redirect all other traffic (including root, /dashboard, /login) to the test business portal login
        // This prevents CRM routes from being accessed on the portal port
        return NextResponse.redirect(new URL('/portal/11111111-1111-1111-1111-111111111111/login', request.url));
     }
  } else if (isAdminHost) {
    // Redirect root or generic CRM login to admin portal login
    if (pathname === '/' || pathname === '/login') {
      const url = new URL('/admin/login', request.url);
      const res = NextResponse.redirect(url);
      res.headers.set('x-correlation-id', correlationId);
      return res;
    }
    // Allow admin routes to proceed directly
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) {
      // Continue to normal processing
    } else {
      // Rewrite non-API, non-admin paths into /admin namespace
      const url = new URL(`/admin${pathname}`, request.url);
      const res = NextResponse.rewrite(url);
      res.headers.set('x-correlation-id', correlationId);
      return res;
    }
  } else if (isCrmHost) {
    // Default root to CRM login
    if (pathname === '/') {
      const url = new URL('/login', request.url);
      const res = NextResponse.redirect(url);
      res.headers.set('x-correlation-id', correlationId);
      return res;
    }
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

  // Add correlation ID for request tracing
  response.headers.set('x-correlation-id', correlationId);

  // Check if route requires authentication
  const isPublicRoute = matchesPattern(pathname, publicRoutes);
  const isAdminRoute = matchesPattern(pathname, adminRoutes);

  // Redirect unauthenticated users from protected routes
  // Skip this for admin subdomain; admin portal has its own auth
  // Skip for portal host as well; portal handles its own auth in the page/layout
  // Skip for admin routes; they are handled by the admin layout
  if (!user && !isPublicRoute && !isAdminHost && !isPortalHost && !isAdminRoute && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check admin access
  // Skip Supabase-based admin check on admin subdomain
  if (isAdminRoute && user && supabase && !isAdminHost) {
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
                              request.cookies.has('admin_session') ||
                              request.cookies.has('portal_session');

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
