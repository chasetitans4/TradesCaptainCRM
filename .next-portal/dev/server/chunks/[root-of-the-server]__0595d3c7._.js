;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="89aff968-4db8-b0d1-4f34-fff151791626")}catch(e){}}();
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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/lib/portal/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// CUSTOMER PORTAL AUTHENTICATION
// Magic link and password-based auth for customers
// =====================================================
__turbopack_context__.s([
    "changePassword",
    ()=>changePassword,
    "clearFailedLogins",
    ()=>clearFailedLogins,
    "completePasswordReset",
    ()=>completePasswordReset,
    "createPortalAccess",
    ()=>createPortalAccess,
    "deactivatePortalAccess",
    ()=>deactivatePortalAccess,
    "getPasswordChangedAt",
    ()=>getPasswordChangedAt,
    "getPortalAccess",
    ()=>getPortalAccess,
    "isAccountLocked",
    ()=>isAccountLocked,
    "recordFailedLogin",
    ()=>recordFailedLogin,
    "sendEmailChangeVerification",
    ()=>sendEmailChangeVerification,
    "sendMagicLink",
    ()=>sendMagicLink,
    "sendPasswordResetEmail",
    ()=>sendPasswordResetEmail,
    "setPortalPassword",
    ()=>setPortalPassword,
    "updateNotificationPreferences",
    ()=>updateNotificationPreferences,
    "validatePassword",
    ()=>validatePassword,
    "verifyEmailChange",
    ()=>verifyEmailChange,
    "verifyMagicLink",
    ()=>verifyMagicLink,
    "verifyPassword",
    ()=>verifyPassword,
    "verifyPasswordResetToken",
    ()=>verifyPasswordResetToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-route] (ecmascript)");
;
;
;
;
const portalAuthLogger = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].child({
    context: 'portal.auth'
});
const MAGIC_LINK_EXPIRY_MINUTES = 15;
// Password policy constants
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
    minLength: PASSWORD_MIN_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true
};
function validatePassword(password) {
    const errors = [];
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
    }
    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
async function sendMagicLink(businessId, email) {
    // Use admin client to bypass RLS for user lookup
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Find customer portal access
    const { data: access } = await supabase.from('customer_portal_access').select('*, customer:customers(*)').eq('business_id', businessId).eq('email', email.toLowerCase()).eq('is_active', true).single();
    if (!access) {
        return {
            success: false,
            error: 'No account found with this email'
        };
    }
    // Generate token
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString('hex');
    const tokenHash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
    // Store token
    await supabase.from('customer_portal_access').update({
        magic_link_token: tokenHash,
        magic_link_expires_at: expiresAt.toISOString()
    }).eq('id', access.id);
    // Get business info for email
    const { data: business } = await supabase.from('businesses').select('name').eq('id', businessId).single();
    // Build magic link URL
    const baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || 'http://localhost:3000';
    const magicLink = `${baseUrl}/portal/auth/verify?token=${token}&business=${businessId}`;
    // Send email
    // In development/test environments, log a hint (not the full token) for debugging
    if ("TURBOPACK compile-time truthy", 1) {
        portalAuthLogger.info({
            msg: 'Magic link generated for development',
            email,
            businessId,
            // Only log token prefix for debugging, never the full token
            tokenPrefix: token.substring(0, 8) + '...'
        });
    }
    try {
        const { sendEmail } = await __turbopack_context__.A("[project]/lib/email/index.ts [app-route] (ecmascript, async loader)");
        await sendEmail({
            to: email,
            subject: `Sign in to ${business?.name || 'Customer Portal'}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Sign in to your account</h2>
            <p>Hi ${access.customer?.name?.split(' ')[0] || 'there'},</p>
            <p>Click the button below to sign in to your customer portal:</p>
            <a href="${magicLink}" class="button">Sign In to Portal</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #666;">${magicLink}</p>
            <div class="footer">
              <p>This link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `Sign in to your account\n\nClick this link to sign in: ${magicLink}\n\nThis link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.`
        });
    } catch (error) {
        // Email sending failed - in production, this should trigger an alert
        // Magic link was still generated but customer won't receive it
        portalAuthLogger.error({
            msg: 'Failed to send magic link email',
            businessId,
            email,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : {
                message: String(error)
            }
        });
    }
    return {
        success: true
    };
}
async function verifyMagicLink(businessId, token) {
    // Use admin client to bypass RLS for token verification
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const tokenHash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(token).digest('hex');
    const { data: access } = await supabase.from('customer_portal_access').select('*').eq('business_id', businessId).eq('magic_link_token', tokenHash).eq('is_active', true).single();
    if (!access) {
        return {
            success: false,
            error: 'Invalid or expired link'
        };
    }
    if (new Date(access.magic_link_expires_at) < new Date()) {
        return {
            success: false,
            error: 'Link has expired. Please request a new one.'
        };
    }
    // Clear token and update last login
    await supabase.from('customer_portal_access').update({
        magic_link_token: null,
        magic_link_expires_at: null,
        last_login_at: new Date().toISOString(),
        email_verified: true
    }).eq('id', access.id);
    return {
        success: true,
        customerId: access.customer_id,
        accessId: access.id
    };
}
async function createPortalAccess(businessId, customerId, email, options) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const insertData = {
        business_id: businessId,
        customer_id: customerId,
        email: email.toLowerCase()
    };
    // Hash password if provided (with validation)
    if (options?.password) {
        const validation = validatePassword(options.password);
        if (!validation.valid) {
            throw new Error(`Password does not meet requirements: ${validation.errors.join(', ')}`);
        }
        insertData.password_hash = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].hash(options.password, 12);
    }
    const { data, error } = await supabase.from('customer_portal_access').insert(insertData).select().single();
    if (error) {
        if (error.code === '23505') {
            throw new Error('Portal access already exists for this customer');
        }
        throw error;
    }
    if (options?.sendInvite !== false) {
        await sendMagicLink(businessId, email);
    }
    return data.id;
}
async function verifyPassword(businessId, email, password) {
    // Use admin client to bypass RLS for password verification
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: access } = await supabase.from('customer_portal_access').select('*').eq('business_id', businessId).eq('email', email.toLowerCase()).eq('is_active', true).single();
    if (!access) {
        return {
            success: false,
            error: 'Invalid email or password'
        };
    }
    if (!access.password_hash) {
        return {
            success: false,
            error: 'Please use the magic link to sign in'
        };
    }
    const isValid = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(password, access.password_hash);
    if (!isValid) {
        return {
            success: false,
            error: 'Invalid email or password'
        };
    }
    // Update last login
    await supabase.from('customer_portal_access').update({
        last_login_at: new Date().toISOString()
    }).eq('id', access.id);
    return {
        success: true,
        customerId: access.customer_id,
        accessId: access.id
    };
}
async function setPortalPassword(accessId, password) {
    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors
        };
    }
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const passwordHash = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].hash(password, 12);
    const { error } = await supabase.from('customer_portal_access').update({
        password_hash: passwordHash
    }).eq('id', accessId);
    if (error) {
        portalAuthLogger.error({
            msg: 'Failed to set portal password',
            accessId,
            error: error.message
        });
        return {
            success: false,
            errors: [
                'Failed to update password'
            ]
        };
    }
    return {
        success: true
    };
}
async function getPortalAccess(customerId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data } = await supabase.from('customer_portal_access').select('*').eq('customer_id', customerId).single();
    return data;
}
async function updateNotificationPreferences(accessId, preferences) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: current } = await supabase.from('customer_portal_access').select('notification_preferences').eq('id', accessId).single();
    const updated = {
        ...current?.notification_preferences,
        ...preferences
    };
    await supabase.from('customer_portal_access').update({
        notification_preferences: updated
    }).eq('id', accessId);
}
async function deactivatePortalAccess(accessId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    await supabase.from('customer_portal_access').update({
        is_active: false
    }).eq('id', accessId);
}
// =====================================================
// ACCOUNT LOCKOUT
// =====================================================
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
async function recordFailedLogin(businessId, email) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: access } = await supabase.from('customer_portal_access').select('id, failed_login_attempts, locked_until').eq('business_id', businessId).eq('email', email.toLowerCase()).single();
    if (!access) {
        return {
            locked: false,
            remainingAttempts: MAX_FAILED_ATTEMPTS
        };
    }
    const newAttempts = (access.failed_login_attempts || 0) + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
    const updateData = {
        failed_login_attempts: newAttempts,
        last_failed_login_at: new Date().toISOString()
    };
    if (shouldLock) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
    }
    await supabase.from('customer_portal_access').update(updateData).eq('id', access.id);
    return {
        locked: shouldLock,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts)
    };
}
async function isAccountLocked(businessId, email) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: access } = await supabase.from('customer_portal_access').select('locked_until').eq('business_id', businessId).eq('email', email.toLowerCase()).single();
    if (!access?.locked_until) {
        return {
            locked: false
        };
    }
    const unlockTime = new Date(access.locked_until);
    if (unlockTime <= new Date()) {
        // Lock expired, clear it
        await supabase.from('customer_portal_access').update({
            locked_until: null,
            failed_login_attempts: 0
        }).eq('business_id', businessId).eq('email', email.toLowerCase());
        return {
            locked: false
        };
    }
    return {
        locked: true,
        unlockTime
    };
}
async function clearFailedLogins(accessId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    await supabase.from('customer_portal_access').update({
        failed_login_attempts: 0,
        locked_until: null,
        last_failed_login_at: null
    }).eq('id', accessId);
}
// =====================================================
// EMAIL CHANGE VERIFICATION
// =====================================================
const EMAIL_CHANGE_EXPIRY_MINUTES = 60;
async function sendEmailChangeVerification(businessId, customerId, newEmail) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Check if new email is already in use
    const { data: existing } = await supabase.from('customer_portal_access').select('id').eq('business_id', businessId).eq('email', newEmail.toLowerCase()).single();
    if (existing) {
        return {
            success: false,
            error: 'This email is already in use'
        };
    }
    // Generate verification token
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString('hex');
    const tokenHash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MINUTES * 60 * 1000);
    // Store pending email change
    await supabase.from('customer_portal_access').update({
        pending_email: newEmail.toLowerCase(),
        pending_email_token: tokenHash,
        pending_email_token_expires_at: expiresAt.toISOString()
    }).eq('customer_id', customerId).eq('business_id', businessId);
    // Get business info
    const { data: business } = await supabase.from('businesses').select('name').eq('id', businessId).single();
    // Build verification URL
    const baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/portal/auth/verify-email?token=${token}&business=${businessId}`;
    // Send verification email to new address
    try {
        const { sendEmail } = await __turbopack_context__.A("[project]/lib/email/index.ts [app-route] (ecmascript, async loader)");
        await sendEmail({
            to: newEmail,
            subject: `Verify your new email for ${business?.name || 'Customer Portal'}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Verify your new email address</h2>
            <p>You requested to change your email address for your ${business?.name || 'Customer Portal'} account.</p>
            <p>Click the button below to confirm this email address:</p>
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
            <div class="footer">
              <p>This link expires in ${EMAIL_CHANGE_EXPIRY_MINUTES} minutes.</p>
              <p>If you didn't request this change, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
        });
    } catch (error) {
        portalAuthLogger.error({
            msg: 'Failed to send email change verification',
            businessId,
            customerId,
            newEmail,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return {
            success: false,
            error: 'Failed to send verification email'
        };
    }
    return {
        success: true
    };
}
async function verifyEmailChange(businessId, token) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const tokenHash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(token).digest('hex');
    const { data: access } = await supabase.from('customer_portal_access').select('id, customer_id, pending_email, pending_email_token_expires_at').eq('business_id', businessId).eq('pending_email_token', tokenHash).single();
    if (!access) {
        return {
            success: false,
            error: 'Invalid or expired verification link'
        };
    }
    if (new Date(access.pending_email_token_expires_at) < new Date()) {
        return {
            success: false,
            error: 'Verification link has expired'
        };
    }
    if (!access.pending_email) {
        return {
            success: false,
            error: 'No pending email change found'
        };
    }
    // Update both portal access email and customer email
    await Promise.all([
        supabase.from('customer_portal_access').update({
            email: access.pending_email,
            pending_email: null,
            pending_email_token: null,
            pending_email_token_expires_at: null,
            email_verified: true
        }).eq('id', access.id),
        supabase.from('customers').update({
            email: access.pending_email
        }).eq('id', access.customer_id)
    ]);
    return {
        success: true
    };
}
// =====================================================
// PASSWORD RESET
// =====================================================
const PASSWORD_RESET_EXPIRY_MINUTES = 30;
async function sendPasswordResetEmail(businessId, email) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data: access } = await supabase.from('customer_portal_access').select('id, customer:customers(name)').eq('business_id', businessId).eq('email', email.toLowerCase()).eq('is_active', true).single();
    if (!access) {
        // Don't reveal if account exists
        return {
            success: true
        };
    }
    // Generate reset token
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString('hex');
    const tokenHash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
    await supabase.from('customer_portal_access').update({
        password_reset_token: tokenHash,
        password_reset_expires_at: expiresAt.toISOString()
    }).eq('id', access.id);
    // Get business info
    const { data: business } = await supabase.from('businesses').select('name').eq('id', businessId).single();
    const baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/portal/auth/reset-password?token=${token}&business=${businessId}`;
    try {
        const { sendEmail } = await __turbopack_context__.A("[project]/lib/email/index.ts [app-route] (ecmascript, async loader)");
        const customerName = access.customer?.name?.split(' ')[0] || 'there';
        await sendEmail({
            to: email,
            subject: `Reset your password for ${business?.name || 'Customer Portal'}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Reset your password</h2>
            <p>Hi ${customerName},</p>
            <p>We received a request to reset your password for your ${business?.name || 'Customer Portal'} account.</p>
            <p>Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <div class="footer">
              <p>This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
        });
    } catch (error) {
        portalAuthLogger.error({
            msg: 'Failed to send password reset email',
            businessId,
            email,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
    return {
        success: true
    };
}
async function verifyPasswordResetToken(businessId, token) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const tokenHash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(token).digest('hex');
    const { data: access } = await supabase.from('customer_portal_access').select('id, password_reset_expires_at').eq('business_id', businessId).eq('password_reset_token', tokenHash).eq('is_active', true).single();
    if (!access) {
        return {
            valid: false,
            error: 'Invalid or expired reset link'
        };
    }
    if (new Date(access.password_reset_expires_at) < new Date()) {
        return {
            valid: false,
            error: 'Reset link has expired'
        };
    }
    return {
        valid: true,
        accessId: access.id
    };
}
async function completePasswordReset(accessId, newPassword) {
    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors
        };
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const passwordHash = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].hash(newPassword, 12);
    const now = new Date().toISOString();
    // Update password and clear reset token
    // Also set password_changed_at to invalidate old sessions
    const { error } = await supabase.from('customer_portal_access').update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires_at: null,
        password_changed_at: now,
        failed_login_attempts: 0,
        locked_until: null
    }).eq('id', accessId);
    if (error) {
        portalAuthLogger.error({
            msg: 'Failed to complete password reset',
            accessId,
            error: error.message
        });
        return {
            success: false,
            errors: [
                'Failed to update password'
            ]
        };
    }
    return {
        success: true
    };
}
async function changePassword(accessId, currentPassword, newPassword) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Get current password hash
    const { data: access } = await supabase.from('customer_portal_access').select('password_hash').eq('id', accessId).single();
    if (!access?.password_hash) {
        return {
            success: false,
            errors: [
                'No password set for this account'
            ]
        };
    }
    // Verify current password
    const isValid = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(currentPassword, access.password_hash);
    if (!isValid) {
        return {
            success: false,
            errors: [
                'Current password is incorrect'
            ]
        };
    }
    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        return {
            success: false,
            errors: validation.errors
        };
    }
    const passwordHash = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].hash(newPassword, 12);
    const now = new Date().toISOString();
    // Update password and set password_changed_at to invalidate old sessions
    const { error } = await supabase.from('customer_portal_access').update({
        password_hash: passwordHash,
        password_changed_at: now
    }).eq('id', accessId);
    if (error) {
        portalAuthLogger.error({
            msg: 'Failed to change password',
            accessId,
            error: error.message
        });
        return {
            success: false,
            errors: [
                'Failed to update password'
            ]
        };
    }
    return {
        success: true
    };
}
async function getPasswordChangedAt(accessId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data } = await supabase.from('customer_portal_access').select('password_changed_at').eq('id', accessId).single();
    return data?.password_changed_at ? new Date(data.password_changed_at) : null;
}
}),
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/node:util [external] (node:util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util", () => require("node:util"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[project]/lib/portal/session.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// CUSTOMER PORTAL SESSION MANAGEMENT
// JWT-based sessions for portal authentication
// =====================================================
__turbopack_context__.s([
    "createPortalSession",
    ()=>createPortalSession,
    "destroyPortalSession",
    ()=>destroyPortalSession,
    "getBusinessSlug",
    ()=>getBusinessSlug,
    "getPortalBusinessId",
    ()=>getPortalBusinessId,
    "getPortalCustomerId",
    ()=>getPortalCustomerId,
    "getPortalSession",
    ()=>getPortalSession,
    "isPortalSessionValid",
    ()=>isPortalSessionValid,
    "refreshPortalSession",
    ()=>refreshPortalSession,
    "requirePortalSession",
    ()=>requirePortalSession,
    "verifyPortalToken",
    ()=>verifyPortalToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/node/esm/jwt/sign.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/node/esm/jwt/verify.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/util [external] (util, cjs)");
;
;
;
;
const PORTAL_SESSION_COOKIE = 'portal_session';
const SESSION_DURATION_DAYS = 7; // Reduced from 30 days for better security
function getSecretKey() {
    const secret = process.env.PORTAL_SESSION_SECRET;
    if (!secret) {
        throw new Error('PORTAL_SESSION_SECRET environment variable must be configured');
    }
    if (secret.length < 32) {
        throw new Error('PORTAL_SESSION_SECRET must be at least 32 characters');
    }
    return new __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__["TextEncoder"]().encode(secret);
}
async function createPortalSession(customerId, accessId, businessId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    // Get customer and business info
    const [{ data: customer }, { data: business }] = await Promise.all([
        supabase.from('customers').select('name, email').eq('id', customerId).single(),
        supabase.from('businesses').select('name').eq('id', businessId).single()
    ]);
    const token = await new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SignJWT"]({
        customerId,
        accessId,
        businessId,
        businessName: business?.name || '',
        customerName: customer?.name || '',
        email: customer?.email || ''
    }).setProtectedHeader({
        alg: 'HS256'
    }).setIssuedAt().setExpirationTime(`${SESSION_DURATION_DAYS}d`).sign(getSecretKey());
    // Set cookie
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    cookieStore.set(PORTAL_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: ("TURBOPACK compile-time value", "development") === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
        path: '/'
    });
    return token.length <= 10 ? `${token}.x` : token;
}
async function getPortalSession(businessSlug) {
    try {
        const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
        const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
        if (!token) {
            console.log('[PortalSession] No token found in cookies');
            return null;
        }
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jwtVerify"])(token, getSecretKey());
        const session = payload;
        // Validate session is not invalidated by password change
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
        const { data: access } = await supabase.from('customer_portal_access').select('password_changed_at, is_active').eq('id', session.accessId).single();
        // Check if account is still active
        if (!access?.is_active) {
            return null;
        }
        // Check if password was changed after session was created
        if (access?.password_changed_at) {
            const passwordChangedAt = new Date(access.password_changed_at);
            const sessionCreatedAt = new Date(session.iat * 1000);
            if (passwordChangedAt > sessionCreatedAt) {
                // Session was created before password change, invalidate it
                return null;
            }
        }
        // If businessSlug provided, verify it matches
        if (businessSlug) {
            const { data: settings } = await supabase.from('booking_settings').select('business_id').eq('booking_url_slug', businessSlug).single();
            if (settings && settings.business_id !== session.businessId) {
                return null;
            }
        }
        return session;
    } catch  {
        return null;
    }
}
async function verifyPortalToken(token) {
    try {
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jwtVerify"])(token, getSecretKey());
        return payload;
    } catch  {
        return null;
    }
}
async function destroyPortalSession() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    cookieStore.delete(PORTAL_SESSION_COOKIE);
}
async function refreshPortalSession() {
    const session = await getPortalSession();
    if (!session) {
        return;
    }
    // Create new session with same data
    await createPortalSession(session.customerId, session.accessId, session.businessId);
}
async function isPortalSessionValid() {
    const session = await getPortalSession();
    return session !== null;
}
async function getPortalBusinessId() {
    const session = await getPortalSession();
    return session?.businessId || null;
}
async function getPortalCustomerId() {
    const session = await getPortalSession();
    return session?.customerId || null;
}
async function requirePortalSession() {
    const session = await getPortalSession();
    if (!session) {
        throw new Error('Portal authentication required');
    }
    return session;
}
async function getBusinessSlug(businessId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data } = await supabase.from('booking_settings').select('booking_url_slug').eq('business_id', businessId).single();
    return data?.booking_url_slug || null;
}
}),
"[externals]/ioredis [external] (ioredis, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("ioredis", () => require("ioredis"));

module.exports = mod;
}),
"[project]/lib/redis/client.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// REDIS 8.4 CLIENT
// Singleton connection with automatic reconnection
// =====================================================
__turbopack_context__.s([
    "checkRedisHealth",
    ()=>checkRedisHealth,
    "closeRedis",
    ()=>closeRedis,
    "flushRedis",
    ()=>flushRedis,
    "getRedis",
    ()=>getRedis,
    "getRedisInfo",
    ()=>getRedisInfo,
    "getRedisMemoryUsage",
    ()=>getRedisMemoryUsage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$ioredis__$5b$external$5d$__$28$ioredis$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/ioredis [external] (ioredis, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-route] (ecmascript)");
;
;
const getRedisConfig = ()=>{
    const url = process.env.REDIS_URL;
    if (url) {
        return url;
    }
    // Local development defaults
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0')
    };
};
// Singleton pattern for Redis connection
let redis = null;
let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL_MS = 60000; // Only log Redis errors once per minute
function getRedis() {
    if (!redis) {
        const config = getRedisConfig();
        redis = new __TURBOPACK__imported__module__$5b$externals$5d2f$ioredis__$5b$external$5d$__$28$ioredis$2c$__cjs$29$__["default"](config, {
            maxRetriesPerRequest: 3,
            retryStrategy (times) {
                // Exponential backoff with max 30 seconds between retries
                const delay = Math.min(times * 1000, 30000);
                return delay;
            },
            enableReadyCheck: true,
            lazyConnect: true
        });
        redis.on('error', (err)=>{
            // Only log errors once per minute to avoid spam
            const now = Date.now();
            if (now - lastErrorLogTime >= ERROR_LOG_INTERVAL_MS) {
                lastErrorLogTime = now;
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cacheLogger"].error({
                    msg: 'Redis connection error',
                    error: {
                        message: err.message || 'Connection failed'
                    }
                });
            }
        });
    }
    return redis;
}
async function checkRedisHealth() {
    try {
        const redis = getRedis();
        const pong = await redis.ping();
        return pong === 'PONG';
    } catch  {
        return false;
    }
}
async function closeRedis() {
    if (redis) {
        await redis.quit();
        redis = null;
    }
}
async function getRedisInfo() {
    const redis = getRedis();
    const info = await redis.info();
    const lines = info.split('\r\n');
    const result = {};
    for (const line of lines){
        if (line.includes(':')) {
            const [key, value] = line.split(':');
            result[key] = value;
        }
    }
    return result;
}
async function getRedisMemoryUsage() {
    const info = await getRedisInfo();
    return {
        used: parseInt(info['used_memory'] || '0'),
        peak: parseInt(info['used_memory_peak'] || '0'),
        maxmemory: parseInt(info['maxmemory'] || '0')
    };
}
async function flushRedis() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const redis = getRedis();
    await redis.flushdb();
}
}),
"[project]/lib/rate-limit/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// RATE LIMITING
// Redis-based rate limiting with sliding window
// =====================================================
__turbopack_context__.s([
    "check2FASendRateLimit",
    ()=>check2FASendRateLimit,
    "check2FAVerifyRateLimit",
    ()=>check2FAVerifyRateLimit,
    "checkAIRateLimit",
    ()=>checkAIRateLimit,
    "checkAPIRateLimit",
    ()=>checkAPIRateLimit,
    "checkBatchOperationRateLimit",
    ()=>checkBatchOperationRateLimit,
    "checkEmailRateLimit",
    ()=>checkEmailRateLimit,
    "checkLoginRateLimit",
    ()=>checkLoginRateLimit,
    "checkPasswordResetRateLimit",
    ()=>checkPasswordResetRateLimit,
    "checkPortalMessageRateLimit",
    ()=>checkPortalMessageRateLimit,
    "checkRateLimit",
    ()=>checkRateLimit,
    "checkSMSRateLimit",
    ()=>checkSMSRateLimit,
    "checkSearchRateLimit",
    ()=>checkSearchRateLimit,
    "checkSimpleRateLimit",
    ()=>checkSimpleRateLimit,
    "checkTokenBucket",
    ()=>checkTokenBucket,
    "checkUploadRateLimit",
    ()=>checkUploadRateLimit,
    "checkWebhookRateLimit",
    ()=>checkWebhookRateLimit,
    "getRateLimitStatus",
    ()=>getRateLimitStatus,
    "resetRateLimit",
    ()=>resetRateLimit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redis$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/redis/client.ts [app-route] (ecmascript)");
;
const memoryStore = new Map();
function memorySliding(key, limit, windowSeconds) {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const arr = memoryStore.get(`sliding:${key}`) || [];
    const filtered = arr.filter((t)=>t >= windowStart);
    filtered.push(now);
    memoryStore.set(`sliding:${key}`, filtered);
    const count = filtered.length;
    const resetAt = new Date(now + windowSeconds * 1000);
    return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
        retryAfter: count > limit ? windowSeconds : undefined
    };
}
function memoryFixed(key, limit, windowSeconds) {
    const now = Date.now();
    const windowIndex = Math.floor(now / (windowSeconds * 1000));
    const memKey = `fixed:${key}:${windowIndex}`;
    const count = (memoryStore.get(memKey) || 0) + 1;
    memoryStore.set(memKey, count);
    const resetAt = new Date(Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000);
    return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
        retryAfter: count > limit ? Math.ceil((resetAt.getTime() - now) / 1000) : undefined
    };
}
function memoryBucket(key, capacity, refillRate, tokensNeeded) {
    const now = Date.now();
    const state = memoryStore.get(`bucket:${key}`) || {
        tokens: capacity,
        lastRefill: now
    };
    const elapsed = (now - state.lastRefill) / 1000;
    const tokens = Math.min(capacity, state.tokens + elapsed * refillRate);
    const allowed = tokens >= tokensNeeded;
    const newTokens = allowed ? tokens - tokensNeeded : tokens;
    memoryStore.set(`bucket:${key}`, {
        tokens: newTokens,
        lastRefill: now
    });
    const timeUntilToken = allowed ? 0 : (tokensNeeded - newTokens) / refillRate;
    return {
        allowed,
        remaining: Math.floor(newTokens),
        resetAt: new Date(now + timeUntilToken * 1000),
        retryAfter: allowed ? undefined : Math.ceil(timeUntilToken)
    };
}
async function checkRateLimit(key, limit, windowSeconds) {
    // If Redis is not configured or in development without Redis, fallback to memory
    // This prevents timeouts when Redis is not available
    if (("TURBOPACK compile-time value", "development") === 'development' && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
        return memorySliding(key, limit, windowSeconds);
    }
    try {
        const redis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redis$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRedis"])();
        // Add a short timeout to prevent hanging if Redis is unreachable
        const timeoutPromise = new Promise((_, reject)=>setTimeout(()=>reject(new Error('Redis timeout')), 200));
        const redisPromise = (async ()=>{
            const now = Date.now();
            const windowStart = now - windowSeconds * 1000;
            const fullKey = `ratelimit:${key}`;
            const multi = redis.multi();
            multi.zremrangebyscore(fullKey, 0, windowStart);
            multi.zadd(fullKey, now, `${now}-${Math.random()}`);
            multi.zcard(fullKey);
            multi.expire(fullKey, windowSeconds);
            const results = await multi.exec();
            return results;
        })();
        const results = await Promise.race([
            redisPromise,
            timeoutPromise
        ]);
        const count = results?.[2]?.[1] || 0;
        const resetAt = new Date(Date.now() + windowSeconds * 1000);
        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            resetAt,
            retryAfter: count > limit ? windowSeconds : undefined
        };
    } catch (error) {
        // Fallback to memory store on any error (connection, timeout, etc)
        return memorySliding(key, limit, windowSeconds);
    }
}
async function checkSimpleRateLimit(key, limit, windowSeconds) {
    try {
        const redis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redis$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRedis"])();
        const now = Date.now();
        const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;
        const count = await redis.incr(windowKey);
        if (count === 1) {
            await redis.expire(windowKey, windowSeconds);
        }
        const resetAt = new Date(Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000);
        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            resetAt,
            retryAfter: count > limit ? Math.ceil((resetAt.getTime() - now) / 1000) : undefined
        };
    } catch  {
        return memoryFixed(key, limit, windowSeconds);
    }
}
async function checkTokenBucket(key, capacity, refillRate, tokensNeeded = 1) {
    // If Redis is not configured or in development without Redis, fallback to memory
    if (("TURBOPACK compile-time value", "development") === 'development' && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
        return memoryBucket(key, capacity, refillRate, tokensNeeded);
    }
    try {
        const redis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redis$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRedis"])();
        // Add a short timeout to prevent hanging if Redis is unreachable
        const timeoutPromise = new Promise((_, reject)=>setTimeout(()=>reject(new Error('Redis timeout')), 200));
        const redisPromise = (async ()=>{
            const now = Date.now();
            const fullKey = `tokenbucket:${key}`;
            const data = await redis.hgetall(fullKey);
            let tokens = capacity;
            let lastRefill = now;
            if (data.tokens && data.lastRefill) {
                const elapsed = (now - parseInt(data.lastRefill)) / 1000;
                tokens = Math.min(capacity, parseFloat(data.tokens) + elapsed * refillRate);
                lastRefill = now;
            }
            const allowed = tokens >= tokensNeeded;
            if (allowed) {
                tokens -= tokensNeeded;
            }
            await redis.hset(fullKey, {
                tokens: tokens.toString(),
                lastRefill: lastRefill.toString()
            });
            await redis.expire(fullKey, Math.ceil(capacity / refillRate) + 60);
            return {
                allowed,
                tokens,
                lastRefill
            };
        })();
        const result = await Promise.race([
            redisPromise,
            timeoutPromise
        ]);
        const now = Date.now();
        const timeUntilToken = result.allowed ? 0 : (tokensNeeded - result.tokens) / refillRate;
        return {
            allowed: result.allowed,
            remaining: Math.floor(result.tokens),
            resetAt: new Date(now + timeUntilToken * 1000),
            retryAfter: result.allowed ? undefined : Math.ceil(timeUntilToken)
        };
    } catch  {
        return memoryBucket(key, capacity, refillRate, tokensNeeded);
    }
}
async function checkAPIRateLimit(userId) {
    return checkSimpleRateLimit(`api:${userId}`, 100, 60);
}
async function checkSMSRateLimit(businessId) {
    return checkSimpleRateLimit(`sms:${businessId}`, 100, 3600);
}
async function checkEmailRateLimit(businessId) {
    return checkSimpleRateLimit(`email:${businessId}`, 200, 3600);
}
async function checkLoginRateLimit(ip) {
    return checkRateLimit(`login:${ip}`, 100, 300);
}
async function checkPasswordResetRateLimit(email) {
    return checkRateLimit(`password_reset:${email}`, 3, 3600);
}
async function check2FAVerifyRateLimit(userId, ip) {
    return checkRateLimit(`2fa:${userId}:${ip}`, 5, 600);
}
async function check2FASendRateLimit(userId, ip) {
    return checkRateLimit(`2fa_send:${userId}:${ip}`, 5, 600);
}
async function checkPortalMessageRateLimit(customerId, ip) {
    return checkSimpleRateLimit(`portal_msg:${customerId}:${ip}`, 10, 300);
}
async function checkAIRateLimit(businessId) {
    return checkSimpleRateLimit(`ai:${businessId}`, 50, 60);
}
async function checkWebhookRateLimit(businessId) {
    return checkSimpleRateLimit(`webhook:${businessId}`, 1000, 60);
}
async function checkUploadRateLimit(userId) {
    return checkSimpleRateLimit(`upload:${userId}`, 20, 60);
}
async function checkSearchRateLimit(userId) {
    return checkSimpleRateLimit(`search:${userId}`, 30, 60);
}
async function checkBatchOperationRateLimit(adminId) {
    return checkRateLimit(`batch:${adminId}`, 10, 60);
}
async function resetRateLimit(key) {
    const redis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redis$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRedis"])();
    const keys = await redis.keys(`ratelimit:${key}*`);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}
async function getRateLimitStatus(key, limit, windowSeconds) {
    const redis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redis$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRedis"])();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const fullKey = `ratelimit:${key}`;
    // Remove old entries and count
    await redis.zremrangebyscore(fullKey, 0, windowStart);
    const count = await redis.zcard(fullKey);
    const resetAt = new Date(now + windowSeconds * 1000);
    return {
        allowed: count < limit,
        remaining: Math.max(0, limit - count),
        resetAt,
        currentCount: count,
        retryAfter: count >= limit ? windowSeconds : undefined
    };
}
}),
"[project]/lib/portal/audit.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================
// PORTAL AUDIT LOGGING
// Track customer portal activities for security and support
// =====================================================
__turbopack_context__.s([
    "checkSuspiciousActivity",
    ()=>checkSuspiciousActivity,
    "getCustomerActivityLog",
    ()=>getCustomerActivityLog,
    "logPortalActivity",
    ()=>logPortalActivity
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-route] (ecmascript)");
;
;
/**
 * Extract IP address from request
 */ function getClientIP(request) {
    if (!request) return null;
    // Check common headers for proxied requests
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }
    // Cloudflare
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
        return cfConnectingIP;
    }
    return null;
}
async function logPortalActivity(activity) {
    try {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
        const ipAddress = activity.ipAddress || getClientIP(activity.request);
        const userAgent = activity.userAgent || activity.request?.headers.get('user-agent') || null;
        const { error } = await supabase.from('portal_activity_log').insert({
            customer_id: activity.customerId,
            business_id: activity.businessId,
            action: activity.action,
            details: activity.details || {},
            ip_address: ipAddress,
            user_agent: userAgent?.slice(0, 500),
            created_at: new Date().toISOString()
        });
        if (error) {
            // Don't throw - logging should not break the main flow
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["syncLogger"].error({
                msg: 'Failed to log portal activity',
                error: error.message,
                action: activity.action,
                customerId: activity.customerId
            });
        }
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["syncLogger"].error({
            msg: 'Error in logPortalActivity',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
async function getCustomerActivityLog(customerId, businessId, limit = 50) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await supabase.from('portal_activity_log').select('action, details, ip_address, created_at').eq('customer_id', customerId).eq('business_id', businessId).order('created_at', {
        ascending: false
    }).limit(limit);
    if (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["syncLogger"].error({
            msg: 'Failed to fetch activity log',
            error: error.message,
            customerId
        });
        return [];
    }
    return data || [];
}
async function checkSuspiciousActivity(customerId, businessId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const reasons = [];
    // Check for multiple failed logins in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: failedLogins } = await supabase.from('portal_activity_log').select('*', {
        count: 'exact',
        head: true
    }).eq('customer_id', customerId).eq('business_id', businessId).eq('action', 'login_failed').gte('created_at', oneHourAgo);
    if (failedLogins && failedLogins >= 5) {
        reasons.push(`${failedLogins} failed login attempts in the last hour`);
    }
    // Check for logins from multiple IPs in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogins } = await supabase.from('portal_activity_log').select('ip_address').eq('customer_id', customerId).eq('business_id', businessId).eq('action', 'login_success').gte('created_at', oneDayAgo);
    if (recentLogins) {
        const uniqueIPs = new Set(recentLogins.map((l)=>l.ip_address).filter(Boolean));
        if (uniqueIPs.size >= 5) {
            reasons.push(`Logins from ${uniqueIPs.size} different IP addresses in 24 hours`);
        }
    }
    return {
        suspicious: reasons.length > 0,
        reasons
    };
}
}),
"[project]/app/api/portal/auth/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/portal/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/portal/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rate-limit/index.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/portal/audit.ts [app-route] (ecmascript)");
;
;
;
;
;
;
async function POST(request) {
    try {
        const body = await request.json();
        const { action, businessId, email, password, token, newPassword } = body;
        // Get client IP for rate limiting
        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        switch(action){
            case 'magic-link':
                {
                    if (!businessId || !email) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Business ID and email are required'
                        }, {
                            status: 400
                        });
                    }
                    // Rate limit magic link requests (3 per hour per email+business)
                    const magicLinkLimit = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkSimpleRateLimit"])(`portal_magic:${businessId}:${email.toLowerCase()}`, 3, 3600);
                    if (!magicLinkLimit.allowed) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Too many login requests. Please try again later.'
                        }, {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': '3',
                                'X-RateLimit-Remaining': magicLinkLimit.remaining.toString(),
                                'X-RateLimit-Reset': magicLinkLimit.resetAt.toISOString(),
                                'Retry-After': (magicLinkLimit.retryAfter || 3600).toString()
                            }
                        });
                    }
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sendMagicLink"])(businessId, email);
                    if (!result.success) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: result.error
                        }, {
                            status: 400
                        });
                    }
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: true,
                        message: 'Magic link sent to your email'
                    });
                }
            case 'verify-magic-link':
                {
                    if (!businessId || !token) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Business ID and token are required'
                        }, {
                            status: 400
                        });
                    }
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyMagicLink"])(businessId, token);
                    if (!result.success) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: result.error
                        }, {
                            status: 400
                        });
                    }
                    // Create session
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createPortalSession"])(result.customerId, result.accessId, businessId);
                    // Log successful login
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logPortalActivity"])({
                        customerId: result.customerId,
                        businessId,
                        action: 'login_magic_link',
                        request
                    });
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: true,
                        customerId: result.customerId
                    });
                }
            case 'password':
                {
                    if (!businessId || !email || !password) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Business ID, email, and password are required'
                        }, {
                            status: 400
                        });
                    }
                    // Check if account is locked
                    const lockStatus = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAccountLocked"])(businessId, email);
                    if (lockStatus.locked) {
                        const minutesLeft = Math.ceil((lockStatus.unlockTime.getTime() - Date.now()) / (1000 * 60));
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
                            locked: true,
                            unlockTime: lockStatus.unlockTime
                        }, {
                            status: 423
                        });
                    }
                    // Rate limit password login attempts (5 per 15 minutes per IP)
                    const loginLimit = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkLoginRateLimit"])(ip);
                    if (!loginLimit.allowed) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Too many login attempts. Please try again later.'
                        }, {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': '5',
                                'X-RateLimit-Remaining': loginLimit.remaining.toString(),
                                'X-RateLimit-Reset': loginLimit.resetAt.toISOString(),
                                'Retry-After': (loginLimit.retryAfter || 900).toString()
                            }
                        });
                    }
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPassword"])(businessId, email, password);
                    if (!result.success) {
                        // Record failed login attempt
                        const lockResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordFailedLogin"])(businessId, email);
                        // Log failed login (we don't have customerId but we can log with email hash)
                        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["apiLogger"].warn({
                            msg: 'Portal login failed',
                            businessId,
                            emailHash: email.substring(0, 3) + '***',
                            locked: lockResult.locked,
                            remainingAttempts: lockResult.remainingAttempts
                        });
                        if (lockResult.locked) {
                            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                                error: 'Account temporarily locked due to too many failed attempts. Try again in 30 minutes.',
                                locked: true
                            }, {
                                status: 423
                            });
                        }
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: result.error,
                            remainingAttempts: lockResult.remainingAttempts
                        }, {
                            status: 400
                        });
                    }
                    // Clear failed login attempts on successful login
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clearFailedLogins"])(result.accessId);
                    // Create session
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createPortalSession"])(result.customerId, result.accessId, businessId);
                    // Log successful login
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logPortalActivity"])({
                        customerId: result.customerId,
                        businessId,
                        action: 'login_success',
                        request
                    });
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: true,
                        customerId: result.customerId
                    });
                }
            case 'logout':
                {
                    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPortalSession"])();
                    if (session) {
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logPortalActivity"])({
                            customerId: session.customerId,
                            businessId: session.businessId,
                            action: 'logout',
                            request
                        });
                    }
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["destroyPortalSession"])();
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: true
                    });
                }
            case 'check':
                {
                    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPortalSession"])();
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        authenticated: !!session,
                        session: session ? {
                            customerId: session.customerId,
                            businessName: session.businessName,
                            customerName: session.customerName,
                            email: session.email
                        } : null
                    });
                }
            // Password reset flow
            case 'forgot-password':
                {
                    if (!businessId || !email) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Business ID and email are required'
                        }, {
                            status: 400
                        });
                    }
                    // Rate limit password reset requests
                    const resetLimit = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkSimpleRateLimit"])(`portal_reset:${businessId}:${email.toLowerCase()}`, 3, 3600);
                    if (!resetLimit.allowed) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Too many password reset requests. Please try again later.'
                        }, {
                            status: 429
                        });
                    }
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sendPasswordResetEmail"])(businessId, email);
                    // Always return success to prevent email enumeration
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: true,
                        message: 'If an account exists with this email, you will receive a password reset link.'
                    });
                }
            case 'verify-reset-token':
                {
                    if (!businessId || !token) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Business ID and token are required'
                        }, {
                            status: 400
                        });
                    }
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPasswordResetToken"])(businessId, token);
                    if (!result.valid) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: result.error
                        }, {
                            status: 400
                        });
                    }
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        valid: true,
                        accessId: result.accessId
                    });
                }
            case 'reset-password':
                {
                    if (!businessId || !token || !newPassword) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Business ID, token, and new password are required'
                        }, {
                            status: 400
                        });
                    }
                    // Verify token first
                    const tokenResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPasswordResetToken"])(businessId, token);
                    if (!tokenResult.valid) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: tokenResult.error
                        }, {
                            status: 400
                        });
                    }
                    // Complete the password reset
                    const resetResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["completePasswordReset"])(tokenResult.accessId, newPassword);
                    if (!resetResult.success) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Password reset failed',
                            details: resetResult.errors
                        }, {
                            status: 400
                        });
                    }
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: true,
                        message: 'Password has been reset successfully. You can now log in with your new password.'
                    });
                }
            // Email change verification
            case 'verify-email-change':
                {
                    if (!businessId || !token) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Business ID and token are required'
                        }, {
                            status: 400
                        });
                    }
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyEmailChange"])(businessId, token);
                    if (!result.success) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: result.error
                        }, {
                            status: 400
                        });
                    }
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        success: true,
                        message: 'Email address has been updated successfully.'
                    });
                }
            default:
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Invalid action'
                }, {
                    status: 400
                });
        }
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["apiLogger"].error({
            error,
            context: 'Portal auth error'
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error instanceof Error ? error.message : 'Internal server error'
        }, {
            status: 500
        });
    }
}
async function GET() {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$portal$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPortalSession"])();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            authenticated: !!session,
            session: session ? {
                customerId: session.customerId,
                businessName: session.businessName,
                customerName: session.customerName,
                email: session.email
            } : null
        });
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["apiLogger"].error({
            error,
            context: 'Portal auth check error'
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error instanceof Error ? error.message : 'Internal server error'
        }, {
            status: 500
        });
    }
}
}),
];

//# debugId=89aff968-4db8-b0d1-4f34-fff151791626
//# sourceMappingURL=%5Broot-of-the-server%5D__0595d3c7._.js.map