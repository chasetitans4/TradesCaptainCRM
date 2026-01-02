import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('logger (structured)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('logApiRequest logs info/warn/error by status code', () => {
    const { logApiRequest, logApiError } = require('@/lib/logger');
    logApiRequest('GET', '/x', 200, 5);
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
    logApiRequest('GET', '/y', 404, 5);
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
    logApiError('GET', '/z', new Error('bad'), 500);
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('logAuthEvent logs warn for failed_login and info otherwise', () => {
    const { logAuthEvent } = require('@/lib/logger');
    logAuthEvent('failed_login', 'u1', 'e@x.com', '1.2.3.4');
    expect((console.warn as any).mock.calls.length).toBeGreaterThan(0);
    logAuthEvent('login', 'u1', 'e@x.com', '1.2.3.4');
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('logQueueJob logs error for failed and info for others', () => {
    const { logQueueJob } = require('@/lib/logger');
    logQueueJob('q', 'id1', 'failed', 10, new Error('bad'));
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
    logQueueJob('q', 'id2', 'completed', 10);
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('logCacheOperation logs debug', () => {
    const { logCacheOperation } = require('@/lib/logger');
    logCacheOperation('get', 'k1', 2);
    expect((console.debug as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('logSms logs error on failed and info on sent', () => {
    const { logSms } = require('@/lib/logger');
    logSms('+15551234567', 'failed', 'b1', 'c1', 'oops');
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
    logSms('+15551234567', 'sent', 'b1', 'c1');
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('measureTime returns value and logs debug', async () => {
    const { measureTime } = require('@/lib/logger');
    const result = await measureTime('x', async () => 42);
    expect(result).toBe(42);
    expect((console.debug as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('logger.fatal logs to error', () => {
    const { logger } = require('@/lib/logger');
    logger.fatal({ msg: 'fatal', reason: 'boom' });
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('redacts sensitive fields in output', () => {
    const { logger } = require('@/lib/logger');
    logger.info({ msg: 'ok', password: 'secret', token: 't', nested: { authorization: 'a' } });
    const out = (console.info as any).mock.calls.pop()?.[0] as string;
    expect(out.includes('[REDACTED]')).toBe(true);
    expect(out.includes('secret')).toBe(false);
  });

  it('child logger includes context', () => {
    const { logger } = require('@/lib/logger');
    const child = logger.child({ context: 'test', reqId: 'r1' });
    child.info({ msg: 'child' });
    const out = (console.info as any).mock.calls.pop()?.[0] as string;
    expect(out.includes('[test]')).toBe(true);
  });

  it('production formatting outputs JSON', () => {
    const prev = process.env.NODE_ENV;
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    const { logger } = require('@/lib/logger');
    logger.info({ msg: 'json' });
    const out = (console.info as any).mock.calls.pop()?.[0] as string;
    const parsed = JSON.parse(out);
    expect(parsed.level).toBe('info');
    process.env.NODE_ENV = prev;
  });
});
