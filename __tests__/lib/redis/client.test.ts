import { describe, it, expect, jest } from '@jest/globals';

function mockIoredis(initialInfo?: Record<string, string>) {
  const store = new Map<string, string>();
  const ttl = new Map<string, number>();
  let info: Record<string, string> = initialInfo || { used_memory: '1024', used_memory_peak: '2048', maxmemory: '0' };
  class MockRedis {
    private handlers: Record<string, Function[]> = {};
    constructor(_config?: any, _options?: any) {}
    on(event: string, handler: Function) {
      this.handlers[event] = this.handlers[event] || [];
      this.handlers[event].push(handler);
    }
    async ping() {
      return 'PONG';
    }
    async info() {
      return Object.entries(info).map(([k, v]) => `${k}:${v}`).join('\r\n');
    }
    async quit() {
      return 'OK';
    }
    async flushdb() {
      store.clear();
      ttl.clear();
      return 'OK';
    }
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
    async expire(key: string, seconds: number) {
      ttl.set(key, Date.now() + seconds * 1000);
      return 1;
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
  jest.doMock('ioredis', () => MockRedis);
  return { setInfo: (newInfo: Record<string, string>) => { info = newInfo; } };
}

describe('lib/redis/client', () => {
  it('initializes singleton and reports health', async () => {
    await jest.isolateModulesAsync(async () => {
      mockIoredis();
      const client = require('@/lib/redis/client');
      const r1 = client.getRedis();
      const r2 = client.getRedis();
      expect(r1).toBe(r2);
      const healthy = await client.checkRedisHealth();
      expect(healthy).toBe(true);
      await client.closeRedis();
      const r3 = client.getRedis();
      expect(r3).not.toBe(r1);
    });
  });

  it('parses info and memory usage', async () => {
    await jest.isolateModulesAsync(async () => {
      const ctl = mockIoredis({ used_memory: '4096', used_memory_peak: '8192', maxmemory: '16384' });
      const client = require('@/lib/redis/client');
      const info = await client.getRedisInfo();
      expect(info.used_memory).toBe('4096');
      const mem = await client.getRedisMemoryUsage();
      expect(mem.used).toBe(4096);
      expect(mem.peak).toBe(8192);
      expect(mem.maxmemory).toBe(16384);
      ctl.setInfo({ used_memory: '100', used_memory_peak: '200', maxmemory: '0' });
      const info2 = await client.getRedisInfo();
      expect(info2.used_memory).toBe('100');
    });
  });

  it('guards flush in production', async () => {
    await jest.isolateModulesAsync(async () => {
      mockIoredis();
      process.env.NODE_ENV = 'production';
      const client = require('@/lib/redis/client');
      await expect(client.flushRedis()).rejects.toThrow();
      process.env.NODE_ENV = 'test';
    });
  });

  it('health returns false on ping error', async () => {
    await jest.isolateModulesAsync(async () => {
      const store = mockIoredis();
      const client = require('@/lib/redis/client');
      const r = client.getRedis();
      (r as any).ping = async () => { throw new Error('down'); };
      const ok = await client.checkRedisHealth();
      expect(ok).toBe(false);
    });
  });
});
