import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('logging', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('APIError toJSON returns structured payload', () => {
    const { APIError } = require('@/lib/logging');
    const err = new APIError('bad', 'BAD', 400);
    expect(err.toJSON()).toEqual({ error: { message: 'bad', code: 'BAD' } });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD');
  });

  it('APIErrors factory creates errors with correct codes', () => {
    const { APIErrors } = require('@/lib/logging');
    expect(APIErrors.badRequest('x').code).toBe('BAD_REQUEST');
    expect(APIErrors.unauthorized().statusCode).toBe(401);
    expect(APIErrors.serviceUnavailable('db').statusCode).toBe(503);
  });

  it('logger.apiRequest logs at info/warn/error based on status', () => {
    const { logger } = require('@/lib/logging');
    logger.apiRequest('GET', '/ok', 200, 10);
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
    logger.apiRequest('GET', '/warn', 404, 10);
    expect((console.warn as any).mock.calls.length).toBeGreaterThan(0);
    logger.apiRequest('GET', '/err', 500, 10);
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('dbQuery logs debug in development environment', () => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    const { logger } = require('@/lib/logging');
    logger.dbQuery('select', 'jobs', 12);
    expect((console.debug as any).mock.calls.length).toBeGreaterThan(0);
    process.env.NODE_ENV = 'test';
  });

  it('child logger merges base and override context', () => {
    const { logger } = require('@/lib/logging');
    const child = logger.child({ userId: 'u1', resource: 'jobs', resourceId: 'j1' });
    child.info('child info', { action: 'update' });
    expect((console.info as any).mock.calls.length).toBeGreaterThan(0);
    child.error('child error', new Error('oops'), { action: 'delete' });
    expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('withErrorHandling rethrows APIError and wraps generic errors', async () => {
    const { withErrorHandling, APIErrors, APIError } = require('@/lib/logging');
    await expect(
      withErrorHandling(async () => {
        throw APIErrors.badRequest('bad');
      })
    ).rejects.toBeInstanceOf(APIError);
    await expect(
      withErrorHandling(async () => {
        throw new Error('oops');
      })
    ).rejects.toBeInstanceOf(APIError);
  });
});
