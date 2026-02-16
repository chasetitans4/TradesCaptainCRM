;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="12244710-7642-cf96-be16-ab05df0d6016")}catch(e){}}();
module.exports = [
"[project]/lib/utils/formatting.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatAddress",
    ()=>formatAddress,
    "formatCurrency",
    ()=>formatCurrency,
    "formatDate",
    ()=>formatDate,
    "formatFileSize",
    ()=>formatFileSize,
    "formatInTimezone",
    ()=>formatInTimezone,
    "formatPhoneNumber",
    ()=>formatPhoneNumber,
    "formatRelativeDate",
    ()=>formatRelativeDate,
    "formatTime",
    ()=>formatTime,
    "getTodayISO",
    ()=>getTodayISO,
    "isValidDate",
    ()=>isValidDate,
    "safeFormatDate",
    ()=>safeFormatDate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$formatDistanceToNow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/formatDistanceToNow.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isToday$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isToday.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isTomorrow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isTomorrow.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isYesterday$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isYesterday.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parseISO.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2d$tz$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns-tz/dist/esm/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2d$tz$2f$dist$2f$esm$2f$formatInTimeZone$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns-tz/dist/esm/formatInTimeZone/index.js [app-ssr] (ecmascript)");
;
;
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}
function formatRelativeDate(date) {
    const d = typeof date === 'string' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(date) : date;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isToday$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isToday"])(d)) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, 'h:mm a');
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isYesterday$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isYesterday"])(d)) {
        return 'Yesterday';
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isTomorrow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isTomorrow"])(d)) {
        return 'Tomorrow';
    }
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$formatDistanceToNow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDistanceToNow"])(d, {
            addSuffix: true
        });
    }
    // Same year
    if (d.getFullYear() === now.getFullYear()) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, 'MMM d');
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, 'MMM d, yyyy');
}
function formatDate(date, formatStr = 'MMM d, yyyy') {
    const d = typeof date === 'string' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(date) : date;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, formatStr);
}
function safeFormatDate(date, formatStr = 'MMM d, yyyy', fallback = '-') {
    if (!date) return fallback;
    try {
        const d = typeof date === 'string' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(date) : date;
        if (isNaN(d.getTime())) return fallback;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, formatStr);
    } catch  {
        return fallback;
    }
}
function isValidDate(date) {
    if (!date) return false;
    try {
        const d = typeof date === 'string' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(date) : date;
        return !isNaN(d.getTime());
    } catch  {
        return false;
    }
}
function formatTime(time) {
    // Convert "HH:mm:ss" or "HH:mm" to "h:mm a"
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, 'h:mm a');
}
function formatInTimezone(date, timezone, formatStr = 'MMM d, yyyy h:mm a') {
    const d = typeof date === 'string' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(date) : date;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2d$tz$2f$dist$2f$esm$2f$formatInTimeZone$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatInTimeZone"])(d, timezone, formatStr);
}
function getTodayISO() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(), 'yyyy-MM-dd');
}
function formatAddress(line1, city, state, zip) {
    const parts = [
        line1,
        city,
        state && zip ? `${state} ${zip}` : state || zip
    ].filter(Boolean);
    return parts.join(', ');
}
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = [
        'B',
        'KB',
        'MB',
        'GB'
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
}),
"[project]/lib/utils/dom.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Check if running as PWA
 */ __turbopack_context__.s([
    "copyToClipboard",
    ()=>copyToClipboard,
    "isPWA",
    ()=>isPWA,
    "requestNotificationPermission",
    ()=>requestNotificationPermission,
    "vibrate",
    ()=>vibrate
]);
function isPWA() {
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
}
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return 'denied';
    }
    if (Notification.permission === 'granted') {
        return 'granted';
    }
    return Notification.requestPermission();
}
function vibrate(pattern = 50) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch  {
        return false;
    }
}
}),
"[project]/lib/utils/links.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Generate tel: link
 */ __turbopack_context__.s([
    "getNavigationUrl",
    ()=>getNavigationUrl,
    "getSmsLink",
    ()=>getSmsLink,
    "getTelLink",
    ()=>getTelLink
]);
function getTelLink(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return `tel:+1${cleaned}`;
}
function getSmsLink(phone, body) {
    const cleaned = phone.replace(/\D/g, '');
    const base = `sms:+1${cleaned}`;
    if (body) {
        return `${base}?body=${encodeURIComponent(body)}`;
    }
    return base;
}
function getNavigationUrl(address) {
    const encoded = encodeURIComponent(address);
    return `https://www.openstreetmap.org/search?query=${encoded}`;
}
}),
"[project]/lib/utils/ui.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculatePercentage",
    ()=>calculatePercentage,
    "capitalize",
    ()=>capitalize,
    "getGreeting",
    ()=>getGreeting,
    "getInitials",
    ()=>getInitials,
    "getStatusLabel",
    ()=>getStatusLabel,
    "getUrgencyColor",
    ()=>getUrgencyColor,
    "getUrgencyColorFromLevel",
    ()=>getUrgencyColorFromLevel,
    "truncate",
    ()=>truncate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parseISO.js [app-ssr] (ecmascript)");
;
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function getInitials(name) {
    return name.split(' ').map((part)=>part[0]).join('').toUpperCase().slice(0, 2);
}
function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Good morning';
    }
    if (hour < 17) {
        return 'Good afternoon';
    }
    return 'Good evening';
}
function getStatusLabel(status) {
    const labels = {
        // Lead statuses
        new: 'New',
        contacted: 'Contacted',
        quoted: 'Quoted',
        scheduled: 'Scheduled',
        won: 'Won',
        lost: 'Lost',
        // Job statuses
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        no_show: 'No Show',
        // Quote/Invoice statuses
        draft: 'Draft',
        sent: 'Sent',
        viewed: 'Viewed',
        accepted: 'Accepted',
        declined: 'Declined',
        expired: 'Expired',
        paid: 'Paid',
        overdue: 'Overdue'
    };
    return labels[status] || capitalize(status.replace(/_/g, ' '));
}
function getUrgencyColorFromLevel(urgency) {
    switch(urgency){
        case 'emergency':
            return 'text-danger bg-danger/10';
        case 'high':
            return 'text-warning bg-warning/10';
        case 'normal':
            return 'text-info bg-info/10';
        case 'low':
            return 'text-text-muted bg-muted';
        default:
            return 'text-text-muted bg-muted';
    }
}
function getUrgencyColor(date) {
    const d = typeof date === 'string' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(date) : date;
    const now = new Date();
    const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 0) {
        // Overdue
        return {
            bg: 'bg-danger/10',
            text: 'text-danger'
        };
    }
    if (diffHours < 1) {
        // Due within an hour
        return {
            bg: 'bg-warning/10',
            text: 'text-warning'
        };
    }
    if (diffHours < 24) {
        // Due today
        return {
            bg: 'bg-info/10',
            text: 'text-info'
        };
    }
    // Due later
    return {
        bg: 'bg-muted',
        text: 'text-text-muted'
    };
}
function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round(value / total * 100);
}
}),
"[project]/lib/utils/data.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Debounce function
 */ __turbopack_context__.s([
    "debounce",
    ()=>debounce,
    "generateId",
    ()=>generateId,
    "parseQueryString",
    ()=>parseQueryString,
    "safeJsonParse",
    ()=>safeJsonParse,
    "sleep",
    ()=>sleep
]);
function debounce(func, wait) {
    let timeoutId;
    return (...args)=>{
        clearTimeout(timeoutId);
        timeoutId = setTimeout(()=>func(...args), wait);
    };
}
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}
function parseQueryString(search) {
    const params = new URLSearchParams(search);
    const result = {};
    params.forEach((value, key)=>{
        result[key] = value;
    });
    return result;
}
function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    } catch  {
        return fallback;
    }
}
function sleep(ms) {
    return new Promise((resolve)=>setTimeout(resolve, ms));
}
}),
"[project]/lib/utils/index.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
// Re-export all utilities from split modules
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$formatting$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils/formatting.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$dom$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils/dom.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$links$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils/links.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$ui$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils/ui.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils/data.ts [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
;
;
;
;
;
}),
"[project]/components/ui/button.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/utils/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
;
;
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cva"])(// Base styles with improved press feedback (active:scale-95 for tactile feel)
'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 active:transition-none', {
    variants: {
        variant: {
            default: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
            primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
            destructive: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
            danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
            outline: 'border border-border bg-background hover:bg-muted hover:text-primary',
            secondary: 'bg-muted text-text hover:bg-muted/80',
            ghost: 'hover:bg-muted hover:text-primary',
            link: 'text-primary underline-offset-4 hover:underline active:scale-100',
            success: 'bg-success text-white hover:bg-success/90 shadow-sm',
            warning: 'bg-warning text-white hover:bg-warning/90 shadow-sm'
        },
        size: {
            // Default and lg already meet 44px minimum (h-12 = 48px, h-14 = 56px)
            default: 'h-12 px-4 py-2',
            // sm size now ensures minimum 44px touch target on mobile
            sm: 'h-10 rounded-md px-3 min-h-[44px] md:min-h-0',
            lg: 'h-14 rounded-lg px-8',
            // Icon sizes enforce 44px minimum for touch accessibility
            icon: 'h-12 w-12 min-h-[44px] min-w-[44px]',
            'icon-sm': 'h-10 w-10 min-h-[44px] min-w-[44px]',
            // Explicit touch-friendly size for mobile contexts
            touch: 'h-11 min-h-[44px] min-w-[44px] px-4'
        }
    },
    defaultVariants: {
        variant: 'default',
        size: 'default'
    }
});
const Button = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref)=>{
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Slot"] : 'button';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ref: ref,
        disabled: disabled || loading,
        ...props,
        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "mr-2 h-4 w-4 animate-spin"
                }, void 0, false, {
                    fileName: "[project]/components/ui/button.tsx",
                    lineNumber: 63,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0)),
                children
            ]
        }, void 0, true) : children
    }, void 0, false, {
        fileName: "[project]/components/ui/button.tsx",
        lineNumber: 55,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
Button.displayName = 'Button';
;
}),
"[project]/lib/logger/index.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/app/error.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Error
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-ssr] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/house.js [app-ssr] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger/index.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
const appLogger = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logger"].child({
    context: 'app.error'
});
function Error({ error, reset }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        appLogger.error({
            msg: 'Unhandled app error',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                digest: error.digest
            }
        });
    }, [
        error
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen flex items-center justify-center p-8",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center max-w-md",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                        className: "w-10 h-10 text-destructive"
                    }, void 0, false, {
                        fileName: "[project]/app/error.tsx",
                        lineNumber: 27,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/error.tsx",
                    lineNumber: 26,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-2xl font-bold mb-2",
                    children: "Something went wrong"
                }, void 0, false, {
                    fileName: "[project]/app/error.tsx",
                    lineNumber: 29,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-muted-foreground mb-8",
                    children: "An unexpected error occurred. Our team has been notified."
                }, void 0, false, {
                    fileName: "[project]/app/error.tsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            onClick: reset,
                            className: "gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/app/error.tsx",
                                    lineNumber: 35,
                                    columnNumber: 13
                                }, this),
                                "Try Again"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/error.tsx",
                            lineNumber: 34,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "outline",
                            asChild: true,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/dashboard",
                                className: "gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/app/error.tsx",
                                        lineNumber: 40,
                                        columnNumber: 15
                                    }, this),
                                    "Go Home"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/error.tsx",
                                lineNumber: 39,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/error.tsx",
                            lineNumber: 38,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/error.tsx",
                    lineNumber: 33,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/error.tsx",
            lineNumber: 25,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/error.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
}),
];

//# debugId=12244710-7642-cf96-be16-ab05df0d6016
//# sourceMappingURL=_c1092ee1._.js.map