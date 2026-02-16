// =====================================================
// RATE LIMITING
// Redis-based rate limiting with sliding window
// =====================================================

import { getRedis } from '@/lib/redis/client';

const memoryStore: Map<string, any> = new Map();

function memorySliding(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const arr = (memoryStore.get(`sliding:${key}`) as number[]) || [];
  const filtered = arr.filter((t) => t >= windowStart);
  filtered.push(now);
  memoryStore.set(`sliding:${key}`, filtered);
  const count = filtered.length;
  const resetAt = new Date(now + windowSeconds * 1000);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfter: count > limit ? windowSeconds : undefined,
  };
}

function memoryFixed(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowIndex = Math.floor(now / (windowSeconds * 1000));
  const memKey = `fixed:${key}:${windowIndex}`;
  const count = ((memoryStore.get(memKey) as number) || 0) + 1;
  memoryStore.set(memKey, count);
  const resetAt = new Date(Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfter: count > limit ? Math.ceil((resetAt.getTime() - now) / 1000) : undefined,
  };
}

function memoryBucket(key: string, capacity: number, refillRate: number, tokensNeeded: number): RateLimitResult {
  const now = Date.now();
  const state = memoryStore.get(`bucket:${key}`) || { tokens: capacity, lastRefill: now };
  const elapsed = (now - state.lastRefill) / 1000;
  const tokens = Math.min(capacity, state.tokens + elapsed * refillRate);
  const allowed = tokens >= tokensNeeded;
  const newTokens = allowed ? tokens - tokensNeeded : tokens;
  memoryStore.set(`bucket:${key}`, { tokens: newTokens, lastRefill: now });
  const timeUntilToken = allowed ? 0 : (tokensNeeded - newTokens) / refillRate;
  return {
    allowed,
    remaining: Math.floor(newTokens),
    resetAt: new Date(now + timeUntilToken * 1000),
    retryAfter: allowed ? undefined : Math.ceil(timeUntilToken),
  };
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

/**
 * Sliding window rate limiter (more accurate, slightly more expensive)
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  // If Redis is not configured or in development without Redis, fallback to memory
  // This prevents timeouts when Redis is not available
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
    return memorySliding(key, limit, windowSeconds);
  }

  try {
    const redis = getRedis();
    // Add a short timeout to prevent hanging if Redis is unreachable
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), 200)
    );

    const redisPromise = (async () => {
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

    const results = await Promise.race([redisPromise, timeoutPromise]) as any[];
    
    const count = results?.[2]?.[1] as number || 0;
    const resetAt = new Date(Date.now() + windowSeconds * 1000);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfter: count > limit ? windowSeconds : undefined,
    };
  } catch (error) {
    // Fallback to memory store on any error (connection, timeout, etc)
    return memorySliding(key, limit, windowSeconds);
  }
}

/**
 * Simple fixed window rate limiter (lighter weight, less accurate at boundaries)
 */
export async function checkSimpleRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
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
      retryAfter: count > limit ? Math.ceil((resetAt.getTime() - now) / 1000) : undefined,
    };
  } catch {
    return memoryFixed(key, limit, windowSeconds);
  }
}

/**
 * Token bucket rate limiter (best for bursty traffic)
 */
export async function checkTokenBucket(
  key: string,
  capacity: number,      // Max tokens
  refillRate: number,    // Tokens per second
  tokensNeeded: number = 1
): Promise<RateLimitResult> {
  // If Redis is not configured or in development without Redis, fallback to memory
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
    return memoryBucket(key, capacity, refillRate, tokensNeeded);
  }

  try {
    const redis = getRedis();
    
    // Add a short timeout to prevent hanging if Redis is unreachable
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), 200)
    );

    const redisPromise = (async () => {
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
        lastRefill: lastRefill.toString(),
      });
      await redis.expire(fullKey, Math.ceil(capacity / refillRate) + 60);
      
      return { allowed, tokens, lastRefill };
    })();

    const result = await Promise.race([redisPromise, timeoutPromise]) as { allowed: boolean, tokens: number, lastRefill: number };
    
    const now = Date.now();
    const timeUntilToken = result.allowed ? 0 : (tokensNeeded - result.tokens) / refillRate;
    return {
      allowed: result.allowed,
      remaining: Math.floor(result.tokens),
      resetAt: new Date(now + timeUntilToken * 1000),
      retryAfter: result.allowed ? undefined : Math.ceil(timeUntilToken),
    };
  } catch {
    return memoryBucket(key, capacity, refillRate, tokensNeeded);
  }
}

// =====================================================
// PRE-CONFIGURED RATE LIMITERS
// =====================================================

/**
 * API rate limit: 100 requests per minute per user
 */
export async function checkAPIRateLimit(userId: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`api:${userId}`, 100, 60);
}

/**
 * SMS rate limit: 100 SMS per hour per business
 */
export async function checkSMSRateLimit(businessId: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`sms:${businessId}`, 100, 3600);
}

/**
 * Email rate limit: 200 emails per hour per business
 */
export async function checkEmailRateLimit(businessId: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`email:${businessId}`, 200, 3600);
}

/**
 * Login rate limit: 5 attempts per 15 minutes per IP (sliding window for security)
 */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`login:${ip}`, 5, 900);
}

/**
 * Password reset rate limit: 3 requests per hour per email
 */
export async function checkPasswordResetRateLimit(email: string): Promise<RateLimitResult> {
  return checkRateLimit(`password_reset:${email}`, 3, 3600);
}

/**
 * 2FA verification rate limit: 5 attempts per 10 minutes per user+IP (sliding window for security)
 */
export async function check2FAVerifyRateLimit(userId: string, ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`2fa:${userId}:${ip}`, 5, 600);
}

/**
 * 2FA code send rate limit: 5 sends per 10 minutes per user+IP (prevents SMS/email spam)
 */
export async function check2FASendRateLimit(userId: string, ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`2fa_send:${userId}:${ip}`, 5, 600);
}

/**
 * Portal message rate limit: 10 messages per 5 minutes per customer+IP
 */
export async function checkPortalMessageRateLimit(customerId: string, ip: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`portal_msg:${customerId}:${ip}`, 10, 300);
}

/**
 * AI rate limit: 50 AI calls per minute per business
 */
export async function checkAIRateLimit(businessId: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`ai:${businessId}`, 50, 60);
}

/**
 * Webhook rate limit: 1000 webhooks per minute per business
 */
export async function checkWebhookRateLimit(businessId: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`webhook:${businessId}`, 1000, 60);
}

/**
 * File upload rate limit: 20 uploads per minute per user
 */
export async function checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`upload:${userId}`, 20, 60);
}

/**
 * Search rate limit: 30 searches per minute per user
 */
export async function checkSearchRateLimit(userId: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`search:${userId}`, 30, 60);
}

/**
 * Batch operation rate limit: 10 batch operations per minute per admin
 * Used for bulk approvals, payouts, uploads, etc.
 */
export async function checkBatchOperationRateLimit(adminId: string): Promise<RateLimitResult> {
  return checkRateLimit(`batch:${adminId}`, 10, 60);
}

/**
 * ACH payment rate limit: 10 requests per 5 minutes per IP
 */
export async function checkAchRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`ach:${ip}`, 10, 300);
}

/**
 * Widget booking rate limit: 10 bookings per hour per IP
 */
export async function checkWidgetBookingRateLimit(ip: string): Promise<RateLimitResult> {
  return checkSimpleRateLimit(`widget_book:${ip}`, 10, 3600);
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Reset a rate limit key (for testing or admin purposes)
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(`ratelimit:${key}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult & { currentCount: number }> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  const fullKey = `ratelimit:${key}`;

  // Remove old entries and count
  await redis.zremrangebyscore(fullKey, 0, windowStart);
  const count = await redis.zcard(fullKey);

  const resetAt = new Date(now + (windowSeconds * 1000));

  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    currentCount: count,
    retryAfter: count >= limit ? windowSeconds : undefined,
  };
}
