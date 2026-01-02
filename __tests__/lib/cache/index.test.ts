import { describe, it, expect, jest } from '@jest/globals';

function mockRedisModule() {
  const store = new Map<string, string>();
  const ttl = new Map<string, number>();
  class MockRedis {
    async get(key: string) {
      const exp = ttl.get(key);
      if (exp && Date.now() > exp) {
        store.delete(key);
        ttl.delete(key);
        return null;
      }
      return store.get(key) || null;
    }
    async setex(key: string, seconds: number, value: string) {
      store.set(key, value);
      ttl.set(key, Date.now() + seconds * 1000);
      return 'OK';
    }
    async del(...keys: string[]) {
      let c = 0;
      for (const k of keys) {
        if (store.delete(k)) c++;
        ttl.delete(k);
      }
      return c;
    }
    async keys(pattern: string) {
      const prefix = pattern.replace('*', '');
      return Array.from(store.keys()).filter(k => k.startsWith(prefix));
    }
    async incr(key: string) {
      const v = parseInt((await this.get(key)) || '0', 10) + 1;
      store.set(key, String(v));
      return v;
    }
    async expire(key: string, seconds: number) {
      ttl.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    async decr(key: string) {
      const v = parseInt((await this.get(key)) || '0', 10) - 1;
      store.set(key, String(v));
      return v;
    }
    async exists(key: string) {
      const v = await this.get(key);
      return v ? 1 : 0;
    }
    async ttl(key: string) {
      const exp = ttl.get(key);
      if (!exp) return -2;
      const rem = Math.floor((exp - Date.now()) / 1000);
      return rem >= 0 ? rem : -2;
    }
    async set(key: string, value: string, ex?: string, seconds?: number, nx?: string) {
      if (nx === 'NX' && store.has(key)) return null;
      store.set(key, value);
      if (ex === 'EX' && typeof seconds === 'number') {
        ttl.set(key, Date.now() + seconds * 1000);
      }
      return 'OK';
    }
    async hset(key: string, field: string, value: string) {
      const cur = store.get(key);
      const obj = cur ? JSON.parse(cur) : {};
      obj[field] = value;
      store.set(key, JSON.stringify(obj));
      return 1;
    }
    async hget(key: string, field: string) {
      const cur = store.get(key);
      if (!cur) return null;
      const obj = JSON.parse(cur);
      return obj[field] || null;
    }
    async hgetall(key: string) {
      const cur = store.get(key);
      return cur ? JSON.parse(cur) : {};
    }
    async hdel(key: string, ...fields: string[]) {
      const cur = store.get(key);
      if (!cur) return 0;
      const obj = JSON.parse(cur);
      for (const f of fields) delete obj[f];
      store.set(key, JSON.stringify(obj));
      return fields.length;
    }
  }
  jest.doMock('@/lib/redis/client', () => ({ getRedis: () => new MockRedis() }));
  return { store, ttl };
}

describe('lib/cache/index', () => {
  it('sets and gets values with TTL', async () => {
    await jest.isolateModulesAsync(async () => {
      mockRedisModule();
      const { Cache } = require('@/lib/cache/index');
      const cache = new Cache('t');
      await cache.set('k', { a: 1 }, 1);
      const v = await cache.get<{ a: number }>('k');
      expect(v?.a).toBe(1);
      const ttl = await cache.getTTL('k');
      expect(ttl).toBeGreaterThanOrEqual(0);
    });
  });

  it('deletes keys and patterns', async () => {
    await jest.isolateModulesAsync(async () => {
      const { store } = mockRedisModule();
      const { Cache } = require('@/lib/cache/index');
      const cache = new Cache('p');
      await cache.set('a', 'x', 10);
      await cache.set('b', 'y', 10);
      const deleted = await cache.deletePattern('*');
      expect(deleted).toBe(2);
      const v = store.size;
      expect(v).toBe(0);
    });
  });

  it('getOrSet uses fetcher and caches result', async () => {
    await jest.isolateModulesAsync(async () => {
      mockRedisModule();
      const { Cache } = require('@/lib/cache/index');
      const cache = new Cache('gos');
      const v1 = await cache.getOrSet('foo', async () => ({ n: 1 }), 5);
      expect(v1.n).toBe(1);
      const v2 = await cache.getOrSet('foo', async () => ({ n: 2 }), 5);
      expect(v2.n).toBe(1);
    });
  });

  it('increments and decrements counters with TTL', async () => {
    await jest.isolateModulesAsync(async () => {
      mockRedisModule();
      const { Cache } = require('@/lib/cache/index');
      const cache = new Cache('cnt');
      const c1 = await cache.increment('rate', 1);
      expect(c1).toBe(1);
      const c2 = await cache.increment('rate', 1);
      expect(c2).toBe(2);
      const c3 = await cache.decrement('rate');
      expect(c3).toBe(1);
      const exists = await cache.exists('rate');
      expect(exists).toBe(true);
      const ttl = await cache.getTTL('rate');
      expect(ttl).toBeGreaterThanOrEqual(0);
    });
  });

  it('setNX returns false when key exists and true otherwise', async () => {
    await jest.isolateModulesAsync(async () => {
      mockRedisModule();
      const { Cache } = require('@/lib/cache/index');
      const cache = new Cache('lock');
      const ok1 = await cache.setNX('k', { v: 1 }, 1);
      expect(ok1).toBe(true);
      const ok2 = await cache.setNX('k', { v: 2 }, 1);
      expect(ok2).toBe(false);
    });
  });

  it('hash operations set, get, getall, del', async () => {
    await jest.isolateModulesAsync(async () => {
      mockRedisModule();
      const { Cache } = require('@/lib/cache/index');
      const cache = new Cache('h');
      await cache.hset('x', 'a', { n: 1 });
      await cache.hset('x', 'b', { n: 2 });
      const a = await cache.hget<{ n: number }>('x', 'a');
      expect(a?.n).toBe(1);
      const all = await cache.hgetall<{ n: number }>('x');
      expect(all.a.n).toBe(1);
      expect(all.b.n).toBe(2);
      await cache.hdel('x', 'a');
      const a2 = await cache.hget<{ n: number }>('x', 'a');
      expect(a2).toBeNull();
    });
  });

  it('uses memory fallback when Redis fails', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/redis/client', () => ({ getRedis: () => { throw new Error('no'); } }));
      const { Cache } = require('@/lib/cache/index');
      const cache = new Cache('mem');
      await cache.set('m', { x: 1 }, 1);
      const v = await cache.get<{ x: number }>('m');
      expect(v?.x).toBe(1);
      await new Promise(r => setTimeout(r, 1100));
      const v2 = await cache.get<{ x: number }>('m');
      expect(v2).toBeNull();
    });
  });
});
