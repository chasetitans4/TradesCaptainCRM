// =====================================================
// RATE LIMITING
// Redis-based rate limiting with sliding window
// =====================================================

import { getRedis } from '@/lib/redis/client';

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
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  const fullKey = `ratelimit:${key}`;

  // Use Redis sorted set for sliding window
  const multi = redis.multi();

  // Remove old entries outside the window
  multi.zremrangebyscore(fullKey, 0, windowStart);

  // Add current request with timestamp as score
  multi.zadd(fullKey, now, `${now}-${Math.random()}`);

  // Count requests in current window
  multi.zcard(fullKey);

  // Set expiry on the key
  multi.expire(fullKey, windowSeconds);

  const results = await multi.exec();
  const count = results?.[2]?.[1] as number || 0;

  const resetAt = new Date(now + (windowSeconds * 1000));

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfter: count > limit ? windowSeconds : undefined,
  };
}

/**
 * Simple fixed window rate limiter (lighter weight, less accurate at boundaries)
 */
export async function checkSimpleRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
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
  const redis = getRedis();
  const now = Date.now();
  const fullKey = `tokenbucket:${key}`;

  // Get current state
  const data = await redis.hgetall(fullKey);

  let tokens = capacity;
  let lastRefill = now;

  if (data.tokens && data.lastRefill) {
    const elapsed = (now - parseInt(data.lastRefill)) / 1000;
    tokens = Math.min(capacity, parseFloat(data.tokens) + (elapsed * refillRate));
    lastRefill = now;
  }

  const allowed = tokens >= tokensNeeded;

  if (allowed) {
    tokens -= tokensNeeded;
  }

  // Save state
  await redis.hset(fullKey, {
    tokens: tokens.toString(),
    lastRefill: lastRefill.toString(),
  });
  await redis.expire(fullKey, Math.ceil(capacity / refillRate) + 60);

  const timeUntilToken = allowed ? 0 : (tokensNeeded - tokens) / refillRate;

  return {
    allowed,
    remaining: Math.floor(tokens),
    resetAt: new Date(now + (timeUntilToken * 1000)),
    retryAfter: allowed ? undefined : Math.ceil(timeUntilToken),
  };
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
