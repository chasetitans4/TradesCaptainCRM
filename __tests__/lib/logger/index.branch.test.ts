import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('logger branch coverage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('respects LOG_LEVEL filter for output', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'error';
    const { logger } = require('@/lib/logger');
    logger.debug({ msg: 'no' });
    logger.info({ msg: 'no' });
    logger.warn({ msg: 'no' });
    expect((console.debug as any).mock.calls.length).toBe(0);
    expect((console.info as any).mock.calls.length).toBe(0);
    expect((console.warn as any).mock.calls.length).toBe(0);
    logger.error({ msg: 'yes' });
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('measureTime works with synchronous functions', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'debug';
    const { measureTime } = require('@/lib/logger');
    const result = measureTime('sync', () => 7);
    expect(result).toBe(7);
    expect((console.debug as any).mock.calls.length).toBeGreaterThan(0);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('logSync logs info for completed and error for failed', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'info';
    const { logSync } = require('@/lib/logger');
    logSync('calendar', 'push', 'completed', 'b1', 'event', 'e1');
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
    logSync('calendar', 'push', 'failed', 'b1', 'event', 'e1', 'oops');
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('createRequestLogger includes optional user and business', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'info';
    const { createRequestLogger } = require('@/lib/logger');
    const rlog = createRequestLogger('req1', 'u1', 'b1');
    rlog.info({ msg: 'context' });
    const out = (console.info as any).mock.calls.pop()?.[0] as string;
    expect(out.includes('\"userId\":\"u1\"')).toBe(true);
    expect(out.includes('\"businessId\":\"b1\"')).toBe(true);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('redacts sensitive fields and nested arrays', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'info';
    const { logger } = require('@/lib/logger');
    logger.info({
      msg: 'test redaction',
      password: 'supersecret',
      token: 'abc123',
      nested: { apiKey: 'key', other: 'x' },
      list: [{ token: 't1' }, { other: 'y' }],
    });
    const out = (console.info as any).mock.calls.pop()?.[0] as string;
    expect(out.includes('[REDACTED]')).toBe(true);
    expect(out.includes('supersecret')).toBe(false);
    expect(out.includes('abc123')).toBe(false);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('parseArgs handles string message and pretty output', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'info';
    const { logger } = require('@/lib/logger');
    logger.info('plain message');
    const out = (console.info as any).mock.calls.pop()?.[0] as string;
    expect(out.includes('plain message')).toBe(true);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('measureTime works with async functions', async () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'debug';
    const { measureTime } = require('@/lib/logger');
    const result = await measureTime('async', async () => {
      return 5;
    });
    expect(result).toBe(5);
    const out = (console.debug as any).mock.calls.pop()?.[0] as string;
    expect(out.includes('async completed')).toBe(true);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('logSms logs info for sent and error for failed', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'info';
    const { logSms } = require('@/lib/logger');
    logSms('+15551234567', 'sent', 'b1', 'c1');
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
    logSms('+15551234567', 'failed', 'b1', 'c1', 'bad');
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('logCacheOperation emits debug entries', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'debug';
    const { logCacheOperation } = require('@/lib/logger');
    logCacheOperation('get', 'key1', 10);
    expect((console.debug as any).mock.calls.length).toBeGreaterThan(0);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('logAiRequest logs info with model metadata', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'info';
    const { logAiRequest } = require('@/lib/logger');
    logAiRequest('gpt-4o', 120, 35, false, 'b1');
    const out = (console.info as any).mock.calls.pop()?.[0] as string;
    expect(out.includes('AI request: gpt-4o')).toBe(true);
    process.env.LOG_LEVEL = prevLevel;
  });

  it('logger.fatal logs regardless of LOG_LEVEL', () => {
    const prevLevel = process.env.LOG_LEVEL;
    jest.resetModules();
    process.env.LOG_LEVEL = 'error';
    const { logger } = require('@/lib/logger');
    const before = (console.error as any).mock.calls.length;
    logger.fatal({ msg: 'catastrophic' });
    expect((console.error as any).mock.calls.length).toBeGreaterThan(before);
    process.env.LOG_LEVEL = prevLevel;
  });
});
