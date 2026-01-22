// =====================================================
// REDIS 8.4 CLIENT
// Singleton connection with automatic reconnection
// =====================================================

import Redis from 'ioredis';
import { cacheLogger } from '@/lib/logger';

const getRedisConfig = () => {
  const url = process.env.REDIS_URL;

  if (url) {
    return url;
  }

  // Local development defaults
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  };
};

// Singleton pattern for Redis connection
let redis: Redis | null = null;
let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL_MS = 60000; // Only log Redis errors once per minute

export function getRedis(): Redis {
  if (!redis) {
    const config = getRedisConfig();

    redis = new Redis(config as any, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Exponential backoff with max 30 seconds between retries
        const delay = Math.min(times * 1000, 30000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      // Only log errors once per minute to avoid spam
      const now = Date.now();
      if (now - lastErrorLogTime >= ERROR_LOG_INTERVAL_MS) {
        lastErrorLogTime = now;
        cacheLogger.error({ msg: 'Redis connection error', error: { message: err.message || 'Connection failed' } });
      }
    });

  }

  return redis;
}

/**
 * Check if Redis is healthy
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

/**
 * Get Redis server info (useful for debugging)
 */
export async function getRedisInfo(): Promise<Record<string, string>> {
  const redis = getRedis();
  const info = await redis.info();
  const lines = info.split('\r\n');
  const result: Record<string, string> = {};

  for (const line of lines) {
    if (line.includes(':')) {
      const [key, value] = line.split(':');
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get Redis memory usage
 */
export async function getRedisMemoryUsage(): Promise<{
  used: number;
  peak: number;
  maxmemory: number;
}> {
  const info = await getRedisInfo();
  return {
    used: parseInt(info['used_memory'] || '0'),
    peak: parseInt(info['used_memory_peak'] || '0'),
    maxmemory: parseInt(info['maxmemory'] || '0'),
  };
}

/**
 * Flush all keys (use with caution!)
 */
export async function flushRedis(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot flush Redis in production');
  }
  const redis = getRedis();
  await redis.flushdb();
}
