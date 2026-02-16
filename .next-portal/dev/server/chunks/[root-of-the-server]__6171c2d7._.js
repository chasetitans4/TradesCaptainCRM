;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="1553991c-7333-ac4f-963a-14272ef82369")}catch(e){}}();
module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/logger/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// STRUCTURED LOGGING
// Edge-compatible logging with JSON output
// =====================================================
__turbopack_context__.s([
    "aiLogger",
    ()=>aiLogger,
    "apiLogger",
    ()=>apiLogger,
    "authLogger",
    ()=>authLogger,
    "cacheLogger",
    ()=>cacheLogger,
    "cleanupLogger",
    ()=>cleanupLogger,
    "createRequestLogger",
    ()=>createRequestLogger,
    "emailLogger",
    ()=>emailLogger,
    "jobLogger",
    ()=>jobLogger,
    "logAiRequest",
    ()=>logAiRequest,
    "logApiError",
    ()=>logApiError,
    "logApiRequest",
    ()=>logApiRequest,
    "logAuthEvent",
    ()=>logAuthEvent,
    "logCacheOperation",
    ()=>logCacheOperation,
    "logQueueJob",
    ()=>logQueueJob,
    "logSms",
    ()=>logSms,
    "logSync",
    ()=>logSync,
    "logger",
    ()=>logger,
    "measureTime",
    ()=>measureTime,
    "queueLogger",
    ()=>queueLogger,
    "smsLogger",
    ()=>smsLogger,
    "syncLogger",
    ()=>syncLogger
]);
const isProduction = ("TURBOPACK compile-time value", "development") === 'production';
const logLevel = process.env.LOG_LEVEL || (("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : 'info');
// Log level priorities
const LOG_LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50
};
// Sensitive fields to redact
const REDACT_FIELDS = [
    'password',
    'token',
    'authorization',
    'apiKey',
    'secret',
    'cookie'
];
function shouldLog(level) {
    return (LOG_LEVELS[level] || 0) >= (LOG_LEVELS[logLevel] || 0);
}
function redactSensitive(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(redactSensitive);
    }
    const result = {};
    for (const [key, value] of Object.entries(obj)){
        if (REDACT_FIELDS.some((field)=>key.toLowerCase().includes(field.toLowerCase()))) {
            result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            result[key] = redactSensitive(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}
function formatLog(level, context, msg, data) {
    const redactedData = data ? redactSensitive(data) : {};
    const entry = {
        level,
        time: new Date().toISOString(),
        ...context && {
            context
        },
        msg,
        ...redactedData
    };
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Pretty print in development
    const prefix = context ? `[${context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(redactedData)}` : '';
    return `${entry.time} ${level.toUpperCase()} ${prefix} ${msg}${dataStr}`;
}
class Logger {
    context;
    baseData;
    constructor(context, baseData = {}){
        this.context = context;
        this.baseData = baseData;
    }
    child(data) {
        return new Logger(data.context || this.context, {
            ...this.baseData,
            ...data
        });
    }
    debug(data, msg) {
        if (!shouldLog('debug')) return;
        const { message, logData } = this.parseArgs(data, msg);
        console.debug(formatLog('debug', this.context, message, {
            ...this.baseData,
            ...logData
        }));
    }
    info(data, msg) {
        if (!shouldLog('info')) return;
        const { message, logData } = this.parseArgs(data, msg);
        console.info(formatLog('info', this.context, message, {
            ...this.baseData,
            ...logData
        }));
    }
    warn(data, msg) {
        if (!shouldLog('warn')) return;
        const { message, logData } = this.parseArgs(data, msg);
        console.warn(formatLog('warn', this.context, message, {
            ...this.baseData,
            ...logData
        }));
    }
    error(data, msg) {
        if (!shouldLog('error')) return;
        const { message, logData } = this.parseArgs(data, msg);
        console.error(formatLog('error', this.context, message, {
            ...this.baseData,
            ...logData
        }));
    }
    fatal(data, msg) {
        const { message, logData } = this.parseArgs(data, msg);
        console.error(formatLog('fatal', this.context, message, {
            ...this.baseData,
            ...logData
        }));
    }
    parseArgs(data, msg) {
        if (typeof data === 'string') {
            return {
                message: data,
                logData: {}
            };
        }
        const { msg: dataMsg, ...rest } = data;
        return {
            message: msg || dataMsg || '',
            logData: rest
        };
    }
}
const logger = new Logger(undefined, {
    service: 'trades-captain-crm',
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'development'
});
const apiLogger = logger.child({
    context: 'api'
});
const authLogger = logger.child({
    context: 'auth'
});
const jobLogger = logger.child({
    context: 'jobs'
});
const cacheLogger = logger.child({
    context: 'cache'
});
const queueLogger = logger.child({
    context: 'queue'
});
const smsLogger = logger.child({
    context: 'sms'
});
const emailLogger = logger.child({
    context: 'email'
});
const aiLogger = logger.child({
    context: 'ai'
});
const syncLogger = logger.child({
    context: 'sync'
});
const cleanupLogger = logger.child({
    context: 'cleanup'
});
function createRequestLogger(requestId, userId, businessId) {
    return logger.child({
        requestId,
        ...userId && {
            userId
        },
        ...businessId && {
            businessId
        }
    });
}
function logApiRequest(method, path, statusCode, durationMs, userId, businessId) {
    apiLogger.info({
        msg: `${method} ${path} ${statusCode}`,
        method,
        path,
        statusCode,
        durationMs,
        userId,
        businessId
    });
}
function logApiError(method, path, error, statusCode = 500, userId) {
    apiLogger.error({
        msg: `API Error: ${method} ${path}`,
        method,
        path,
        statusCode,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        userId
    });
}
function logAuthEvent(event, userId, email, ip) {
    const level = event === 'failed_login' ? 'warn' : 'info';
    authLogger[level]({
        msg: `Auth event: ${event}`,
        event,
        userId,
        email,
        ip
    });
}
function logQueueJob(queue, jobId, status, durationMs, error) {
    if (status === 'failed') {
        queueLogger.error({
            msg: `Queue job failed: ${queue}/${jobId}`,
            queue,
            jobId,
            status,
            durationMs,
            error: error ? {
                name: error.name,
                message: error.message
            } : undefined
        });
    } else {
        queueLogger.info({
            msg: `Queue job ${status}: ${queue}/${jobId}`,
            queue,
            jobId,
            status,
            durationMs
        });
    }
}
function logCacheOperation(operation, key, durationMs) {
    cacheLogger.debug({
        msg: `Cache ${operation}: ${key}`,
        operation,
        key,
        durationMs
    });
}
function logSms(to, status, businessId, customerId, error) {
    if (status === 'failed') {
        smsLogger.error({
            msg: `SMS failed to ${to}`,
            to: to.slice(-4),
            status,
            businessId,
            customerId,
            error
        });
    } else {
        smsLogger.info({
            msg: `SMS ${status} to ${to.slice(-4)}`,
            to: to.slice(-4),
            status,
            businessId,
            customerId
        });
    }
}
function logAiRequest(model, tokensUsed, durationMs, cached, businessId) {
    aiLogger.info({
        msg: `AI request: ${model}`,
        model,
        tokensUsed,
        durationMs,
        cached,
        businessId
    });
}
function logSync(service, operation, status, businessId, entityType, entityId, error) {
    if (status === 'failed') {
        syncLogger.error({
            msg: `Sync failed: ${service} ${operation}`,
            service,
            operation,
            status,
            businessId,
            entityType,
            entityId,
            error
        });
    } else {
        syncLogger.info({
            msg: `Sync ${status}: ${service} ${operation}`,
            service,
            operation,
            status,
            businessId,
            entityType,
            entityId
        });
    }
}
function measureTime(label, fn, loggerInstance = logger) {
    const start = performance.now();
    const logDuration = (result)=>{
        const duration = performance.now() - start;
        loggerInstance.debug({
            msg: `${label} completed`,
            label,
            durationMs: Math.round(duration * 100) / 100
        });
        return result;
    };
    const result = fn();
    if (result instanceof Promise) {
        return result.then(logDuration);
    }
    return logDuration(result);
}
}),
"[project]/lib/supabase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// SUPABASE SERVER CLIENT FOR NEXT.JS APP ROUTER
// =====================================================
__turbopack_context__.s([
    "canAccessCRM",
    ()=>canAccessCRM,
    "createAdminClient",
    ()=>createAdminClient,
    "createClient",
    ()=>createClient,
    "createServerSupabaseClient",
    ()=>createServerSupabaseClient,
    "getServerUser",
    ()=>getServerUser,
    "getServerUserProfile",
    ()=>getServerUserProfile,
    "hasRole",
    ()=>hasRole
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-route] (ecmascript)");
;
;
;
async function createServerSupabaseClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://abafispmjdpryjkevath.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjU2OTMsImV4cCI6MjA4MzA0MTY5M30.X6jyJF7fNTWfSfdPb7AeuKojelP91uR-kYYaO31a6LQ"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
                }
            }
        }
    });
}
function createAdminClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://abafispmjdpryjkevath.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
        cookies: {
            getAll () {
                return [];
            },
            setAll () {}
        }
    });
}
async function getServerUser() {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return null;
    }
    return user;
}
async function getServerUserProfile() {
    const supabase = await createServerSupabaseClient();
    const user = await getServerUser();
    if (!user) return null;
    const { data: profile, error } = await supabase.from('users').select('*, business:businesses(*)').eq('auth_user_id', user.id).single();
    if (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].error({
            msg: 'Error fetching user profile (server)',
            error: error ? {
                message: error.message,
                code: error.code,
                details: error.details
            } : undefined,
            userId: user.id
        });
        return null;
    }
    return profile;
}
async function canAccessCRM() {
    const profile = await getServerUserProfile();
    if (!profile || !profile.business) {
        return false;
    }
    return profile.business.plan_tier === 'pro';
}
async function hasRole(requiredRole) {
    const profile = await getServerUserProfile();
    if (!profile) return false;
    const roles = Array.isArray(requiredRole) ? requiredRole : [
        requiredRole
    ];
    return roles.includes(profile.role);
}
const createClient = createServerSupabaseClient;
}),
"[project]/app/api/portal/business/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// PORTAL BUSINESS API
// GET /api/portal/business - Get business info for portal
// =====================================================
__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('id');
        if (!businessId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Business ID required'
            }, {
                status: 400
            });
        }
        // Use admin client to bypass RLS for public business info
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
        const [businessResult, platformResult] = await Promise.all([
            supabase.from('businesses').select('id, name, phone, email, logo_url, primary_color').eq('id', businessId).single(),
            supabase.from('platform_settings').select('value').eq('key', 'platform_branding').single()
        ]);
        const business = businessResult.data;
        const error = businessResult.error;
        if (error || !business) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Business not found'
            }, {
                status: 404
            });
        }
        const platformSettings = platformResult.data?.value || null;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ...business,
            platform_settings: platformSettings
        });
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["apiLogger"].error({
            error,
            context: 'Error in GET /api/portal/business'
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to get business'
        }, {
            status: 500
        });
    }
}
}),
];

//# debugId=1553991c-7333-ac4f-963a-14272ef82369
//# sourceMappingURL=%5Broot-of-the-server%5D__6171c2d7._.js.map