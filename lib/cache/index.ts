// =====================================================
// CACHING LAYER
// Redis-based caching with memory fallback
// =====================================================

import { getRedis } from '@/lib/redis/client';
import { cacheLogger } from '@/lib/logger';

// In-memory cache store for fallback when Redis is unavailable
const memoryStore = new Map<string, { data: string; expiresAt: number }>();
const MEMORY_CLEANUP_INTERVAL = 60000; // 1 minute
const MAX_MEMORY_ENTRIES = 5000;

// Periodic cleanup of expired memory entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.expiresAt < now) {
        memoryStore.delete(key);
      }
    }
  }, MEMORY_CLEANUP_INTERVAL);
}

/**
 * Try to get Redis client, return null if not configured
 */
function tryGetRedis(): any {
  try {
    // Dynamic import to avoid errors if Redis isn't configured
    const { getRedis } = require('@/lib/redis/client');
    return getRedis();
  } catch {
    return null;
  }
}

/**
 * Check if Redis is available
 */
function isRedisAvailable(): boolean {
  try {
    const redis = tryGetRedis();
    return redis !== null;
  } catch {
    return false;
  }
}


const DEFAULT_TTL = 300; // 5 minutes

export class Cache {
  private prefix: string;
  private useMemoryFallback: boolean;

  constructor(prefix: string = 'cache') {
    this.prefix = prefix;
    this.useMemoryFallback = !isRedisAvailable();
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get a value from cache (Redis or memory fallback)
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);

    // Try memory fallback first if Redis is unavailable
    if (this.useMemoryFallback) {
      const entry = memoryStore.get(fullKey);
      if (entry && entry.expiresAt > Date.now()) {
        if (typeof entry.data === 'string') {
          try {
            return JSON.parse(entry.data) as T;
          } catch {
            return null;
          }
        }
        return entry.data as unknown as T;
      }
      memoryStore.delete(fullKey);
      return null;
    }

    try {
      const redis = tryGetRedis();
      if (!redis) {
        this.useMemoryFallback = true;
        return this.get(key);
      }

      const data = await redis.get(fullKey);
      if (!data) return null;

      if (typeof data === 'string') {
        try {
          return JSON.parse(data) as T;
        } catch {
          return null;
        }
      }
      return data as unknown as T;
    } catch (error) {
      cacheLogger.error({
        msg: 'Cache get error',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
      // Fall back to memory
      this.useMemoryFallback = true;
      return null;
    }
  }

  /**
   * Set a value in cache with TTL (Redis or memory fallback)
   */
  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const fullKey = this.getKey(key);
    const data = JSON.stringify(value);

    // Use memory fallback if Redis is unavailable
    if (this.useMemoryFallback) {
      // Enforce size limit
      if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
        const firstKey = memoryStore.keys().next().value;
        if (firstKey) memoryStore.delete(firstKey);
      }

      memoryStore.set(fullKey, {
        data,
        expiresAt: Date.now() + (ttl * 1000),
      });
      return;
    }

    try {
      const redis = tryGetRedis();
      if (!redis) {
        this.useMemoryFallback = true;
        return this.set(key, value, ttl);
      }

      await redis.setex(fullKey, ttl, data);
    } catch (error) {
      cacheLogger.error({
        msg: 'Cache set error',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
      // Fall back to memory
      this.useMemoryFallback = true;
      memoryStore.set(fullKey, {
        data,
        expiresAt: Date.now() + (ttl * 1000),
      });
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(this.getKey(key));
    } catch (error) {
      cacheLogger.error({
        msg: 'Cache delete error',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const redis = getRedis();
      const keys = await redis.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      cacheLogger.error({
        msg: 'Cache deletePattern error',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
      return 0;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   * Fetches from cache, or calls fetcher and caches result
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  /**
   * Increment a counter
   */
  async increment(key: string, ttl?: number): Promise<number> {
    const redis = getRedis();
    const fullKey = this.getKey(key);
    const count = await redis.incr(fullKey);

    if (count === 1 && ttl) {
      await redis.expire(fullKey, ttl);
    }

    return count;
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string): Promise<number> {
    const redis = getRedis();
    return redis.decr(this.getKey(key));
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const redis = getRedis();
    const result = await redis.exists(this.getKey(key));
    return result === 1;
  }

  /**
   * Get TTL of a key
   */
  async getTTL(key: string): Promise<number> {
    const redis = getRedis();
    return redis.ttl(this.getKey(key));
  }

  /**
   * Set with only if not exists (for locking)
   */
  async setNX(key: string, value: any, ttl: number): Promise<boolean> {
    const redis = getRedis();
    const result = await redis.set(
      this.getKey(key),
      JSON.stringify(value),
      'EX',
      ttl,
      'NX'
    );
    return result === 'OK';
  }

  /**
   * Hash operations for structured data
   */
  async hset(key: string, field: string, value: any): Promise<void> {
    const redis = getRedis();
    await redis.hset(this.getKey(key), field, JSON.stringify(value));
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const redis = getRedis();
    const data = await redis.hget(this.getKey(key), field);
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    }
    return data as unknown as T;
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const redis = getRedis();
    const data = await redis.hgetall(this.getKey(key));
    const result: Record<string, T> = {};
    for (const [field, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        try {
          result[field] = JSON.parse(value) as T;
        } catch {
          result[field] = null as unknown as T;
        }
      } else {
        result[field] = value as unknown as T;
      }
    }
    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    const redis = getRedis();
    await redis.hdel(this.getKey(key), ...fields);
  }
}

// Pre-configured caches for different data types
export const userCache = new Cache('user');
export const businessCache = new Cache('business');
export const dashboardCache = new Cache('dashboard');
export const sessionCache = new Cache('session');
export const aiCache = new Cache('ai');
export const apiCache = new Cache('api');
