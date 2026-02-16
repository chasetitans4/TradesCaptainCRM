(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__4d3941d0._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/lib/rate-limit/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// RATE LIMIT MIDDLEWARE
// Next.js Edge middleware for API rate limiting
// Uses in-memory store (Edge-compatible, no Node.js deps)
// For Redis-backed rate limiting, use lib/rate-limit/index.ts in API routes
// =====================================================
__turbopack_context__.s([
    "addRateLimitHeaders",
    ()=>addRateLimitHeaders,
    "checkAPIRateLimit",
    ()=>checkAPIRateLimit,
    "checkLoginRateLimit",
    ()=>checkLoginRateLimit,
    "createRateLimitResponse",
    ()=>createRateLimitResponse,
    "rateLimitMiddleware",
    ()=>rateLimitMiddleware,
    "withRateLimit",
    ()=>withRateLimit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
// In-memory store for Edge middleware (per-isolate)
// Note: In Edge runtime, each isolate has its own memory, so this provides
// per-instance rate limiting. For distributed rate limiting across instances,
// use Redis in API route handlers (Node.js runtime).
const memoryStore = new Map();
const MAX_MEMORY_ENTRIES = 10000;
// Rate limit configurations
const RATE_LIMIT_CONFIGS = {
    api: {
        requests: 10000,
        windowMs: 60000
    },
    auth: {
        requests: 1000,
        windowMs: 900000
    },
    search: {
        requests: 6000,
        windowMs: 60000
    },
    ai: {
        requests: 2000,
        windowMs: 3600000
    },
    default: {
        requests: 20000,
        windowMs: 60000
    }
};
/**
 * Get rate limit config for a path
 */ function getRateLimitConfig(pathname) {
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
 */ function checkWithMemory(key, limit, windowMs, now) {
    // Clean up if store gets too large
    if (memoryStore.size > MAX_MEMORY_ENTRIES) {
        for (const [k, v] of memoryStore.entries()){
            if (v.resetAt < now) {
                memoryStore.delete(k);
            }
        }
    }
    let entry = memoryStore.get(key);
    // Reset if window expired
    if (!entry || entry.resetAt < now) {
        entry = {
            count: 0,
            resetAt: now + windowMs
        };
        memoryStore.set(key, entry);
    }
    entry.count++;
    const remaining = Math.max(0, limit - entry.count);
    const allowed = entry.count <= limit;
    return {
        allowed,
        remaining,
        resetAt: new Date(entry.resetAt),
        retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000)
    };
}
/**
 * Check rate limit using in-memory store
 */ function checkRateLimit(identifier, pathname) {
    const config = getRateLimitConfig(pathname);
    const key = `${identifier}:${pathname.split('/').slice(0, 3).join('/')}`;
    const now = Date.now();
    return checkWithMemory(key, config.requests, config.windowMs, now);
}
function rateLimitMiddleware(request, options = {}) {
    const { userId } = options;
    // Use user ID if authenticated, otherwise use IP
    const identifier = userId || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const pathname = request.nextUrl.pathname;
    const result = checkRateLimit(identifier, pathname);
    if (!result.allowed) {
        return createRateLimitResponse(result);
    }
    return null; // Continue processing
}
function checkAPIRateLimit(identifier) {
    return checkRateLimit(identifier, '/api/');
}
function checkLoginRateLimit(identifier) {
    return checkRateLimit(identifier, '/api/auth/login');
}
function createRateLimitResponse(result) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter
    }, {
        status: 429,
        headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetAt.toISOString(),
            'Retry-After': (result.retryAfter || 60).toString()
        }
    });
}
function addRateLimitHeaders(response, result, limit = 100) {
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());
    return response;
}
function withRateLimit(handler, options = {}) {
    return async (request)=>{
        const rateLimitResult = rateLimitMiddleware(request, options);
        if (rateLimitResult) {
            return rateLimitResult;
        }
        return handler(request);
    };
}
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// ROOT PROXY (Next.js 16)
// Handles authentication, CSRF protection, rate limiting, and security
// =====================================================
__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$buffer__$5b$external$5d$__$28$node$3a$buffer$2c$__cjs$29$__ = /*#__PURE__*/ __turbopack_context__.i("[externals]/node:buffer [external] (node:buffer, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rate-limit/middleware.ts [middleware-edge] (ecmascript)");
;
;
;
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
    '/portal'
];
// Routes that are for admin portal only
const adminRoutes = []; // Empty because /admin is now handled by custom auth, not Supabase auth
// Static asset patterns
const staticPatterns = [
    '/_next',
    '/@vite',
    '/favicon',
    '/images',
    '/icons',
    '/manifest',
    '/sw',
    '/workbox'
];
/**
 * Check if path matches any pattern
 */ function matchesPattern(pathname, patterns) {
    return patterns.some((pattern)=>pathname === pattern || pathname.startsWith(pattern + '/') || pathname.startsWith(pattern + '.'));
}
/**
 * Create a CSP nonce for inline scripts
 */ function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$buffer__$5b$external$5d$__$28$node$3a$buffer$2c$__cjs$29$__["Buffer"].from(array).toString('base64');
}
/**
 * Get Content Security Policy
 */ function getCSP(nonce) {
    const isDev = ("TURBOPACK compile-time value", "development") === 'development';
    // Base CSP directives
    const directives = {
        'default-src': [
            "'self'"
        ],
        'script-src': [
            "'self'",
            `'nonce-${nonce}'`,
            "'strict-dynamic'",
            // Allow Stripe and analytics
            'https://js.stripe.com',
            'https://www.googletagmanager.com',
            ...("TURBOPACK compile-time truthy", 1) ? [
                "'unsafe-eval'",
                "'unsafe-inline'"
            ] : "TURBOPACK unreachable"
        ],
        'style-src': [
            "'self'",
            "'unsafe-inline'"
        ],
        'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://*.supabase.co',
            'https://*.stripe.com',
            'https://lh3.googleusercontent.com'
        ],
        'font-src': [
            "'self'",
            'data:'
        ],
        'connect-src': [
            "'self'",
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'https://api.stripe.com',
            'https://api.twilio.com',
            'https://api.resend.com',
            'https://api.openai.com',
            ...("TURBOPACK compile-time truthy", 1) ? [
                'http://localhost:*',
                'ws://localhost:*'
            ] : "TURBOPACK unreachable"
        ],
        'frame-src': [
            "'self'",
            'https://js.stripe.com',
            'https://hooks.stripe.com'
        ],
        'object-src': [
            "'none'"
        ],
        'base-uri': [
            "'self'"
        ],
        'form-action': [
            "'self'"
        ],
        'frame-ancestors': [
            "'self'"
        ]
    };
    // Only enable HTTPS upgrades in production to avoid breaking localhost HTTP
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return Object.entries(directives).map(([key, values])=>values.length > 0 ? `${key} ${values.join(' ')}` : key).join('; ');
}
/**
 * Check if Supabase is configured
 */ function isSupabaseConfigured() {
    return !!(("TURBOPACK compile-time value", "https://abafispmjdpryjkevath.supabase.co") && ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU2OTMsImV4cCI6MjA4MzA0MTY5M30.X6jyJF7fNTWfSfdPb7AeuKojelP91uR-kYYaO31a6LQ"));
}
/**
 * Update Supabase session
 */ async function updateSession(request) {
    let response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: request.headers
        }
    });
    // Return early if Supabase is not configured
    if (!isSupabaseConfigured()) //TURBOPACK unreachable
    ;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://abafispmjdpryjkevath.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU2OTMsImV4cCI6MjA4MzA0MTY5M30.X6jyJF7fNTWfSfdPb7AeuKojelP91uR-kYYaO31a6LQ"), {
        cookies: {
            getAll () {
                return request.cookies.getAll();
            },
            setAll (cookiesToSet) {
                cookiesToSet.forEach(({ name, value })=>request.cookies.set(name, value));
                response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request: {
                        headers: request.headers
                    }
                });
                cookiesToSet.forEach(({ name, value, options })=>response.cookies.set(name, value, options));
            }
        }
    });
    try {
        // Refresh session if needed
        const { data: { user }, error } = await supabase.auth.getUser();
        return {
            response,
            user,
            error,
            supabase
        };
    } catch (error) {
        // Handle Supabase connection errors gracefully
        return {
            response,
            user: null,
            error: error,
            supabase
        };
    }
}
async function middleware(request) {
    const { pathname } = request.nextUrl;
    const hostHeader = request.headers.get('host') || '';
    console.log('[Middleware] Processing:', {
        pathname,
        host: hostHeader
    });
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
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Skip API webhooks and public endpoints (but still add correlation ID)
    if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/public') || pathname === '/api/health') {
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
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
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/portal/11111111-1111-1111-1111-111111111111/login', request.url));
        }
    } else if (isAdminHost) {
        // Redirect root or generic CRM login to admin portal login
        if (pathname === '/' || pathname === '/login') {
            const url = new URL('/admin/login', request.url);
            const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
            res.headers.set('x-correlation-id', correlationId);
            return res;
        }
        // Allow admin routes to proceed directly
        if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) {
        // Continue to normal processing
        } else {
            // Rewrite non-API, non-admin paths into /admin namespace
            const url = new URL(`/admin${pathname}`, request.url);
            const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(url);
            res.headers.set('x-correlation-id', correlationId);
            return res;
        }
    } else if (isCrmHost) {
        // Default root to CRM login
        if (pathname === '/') {
            const url = new URL('/login', request.url);
            const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
            res.headers.set('x-correlation-id', correlationId);
            return res;
        }
    }
    // Apply rate limiting for API routes (Edge-compatible in-memory)
    if (pathname.startsWith('/api/')) {
        const rateLimitResponse = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["rateLimitMiddleware"])(request);
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
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
    }
    // Redirect authenticated users away from login/signup
    if (user && (pathname === '/login' || pathname === '/signup')) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/dashboard', request.url));
    }
    // Check admin access
    // Skip Supabase-based admin check on admin subdomain
    if (isAdminRoute && user && supabase && !isAdminHost) {
        try {
            // Fetch user role from database
            const { data: profile } = await supabase.from('users').select('role').eq('auth_user_id', user.id).single();
            const allowedRoles = [
                'admin',
                'superadmin',
                'sales_agent'
            ];
            if (!profile || !allowedRoles.includes(profile.role)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/dashboard', request.url));
            }
        } catch  {
            // If database query fails, deny admin access
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/dashboard', request.url));
        }
    }
    // CSRF protection for mutations
    if ([
        'POST',
        'PUT',
        'PATCH',
        'DELETE'
    ].includes(request.method)) {
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
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'CSRF validation failed',
                            message: 'Origin mismatch'
                        }, {
                            status: 403
                        });
                    }
                } catch  {
                    // Invalid origin URL
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'CSRF validation failed',
                        message: 'Invalid origin'
                    }, {
                        status: 403
                    });
                }
            } else if (referer) {
                // Fallback to Referer header if Origin is missing
                try {
                    const refererHost = new URL(referer).host;
                    if (refererHost !== host) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'CSRF validation failed',
                            message: 'Referer mismatch'
                        }, {
                            status: 403
                        });
                    }
                } catch  {
                    // Invalid referer URL
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'CSRF validation failed',
                        message: 'Invalid referer'
                    }, {
                        status: 403
                    });
                }
            } else {
                // Neither Origin nor Referer present - this is suspicious for browser requests
                // Allow only for specific non-browser clients (e.g., cURL, Postman with valid auth)
                // For cookie-based auth, we require Origin/Referer
                const hasCookieAuth = request.cookies.has('sb-access-token') || request.cookies.has('admin_session') || request.cookies.has('portal_session');
                if (hasCookieAuth) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'CSRF validation failed',
                        message: 'Missing origin header'
                    }, {
                        status: 403
                    });
                }
            }
        }
    }
    return response;
}
const config = {
    matcher: [
        /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */ '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__4d3941d0._.js.map