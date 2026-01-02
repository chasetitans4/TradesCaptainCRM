import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('logging Sentry integration', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@sentry/nextjs', () => ({
      withScope: (fn: any) => fn({ setContext: jest.fn(), setUser: jest.fn(), setTag: jest.fn() }),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
    }));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
  });

  it('warn level adds breadcrumb', () => {
    const sentry = require('@sentry/nextjs');
    const { logger } = require('@/lib/logging');
    logger.warn('warning message');
    expect(sentry.addBreadcrumb).toHaveBeenCalled();
  });

  it('error level captures exception', () => {
    const sentry = require('@sentry/nextjs');
    const { logger } = require('@/lib/logging');
    const err = new Error('boom');
    logger.error('error message', err);
    expect(sentry.captureException).toHaveBeenCalled();
  });

  it('fatal without error captures message with fatal severity', () => {
    const sentry = require('@sentry/nextjs');
    const { logger } = require('@/lib/logging');
    logger.fatal('catastrophic');
    expect(sentry.captureMessage).toHaveBeenCalledWith('catastrophic', 'fatal');
  });

  it('error without error captures message with error severity', () => {
    const sentry = require('@sentry/nextjs');
    const { logger } = require('@/lib/logging');
    logger.error('just a message');
    expect(sentry.captureMessage).toHaveBeenCalledWith('just a message', 'error');
  });

  it('debug does not log in production (min level info)', () => {
    const { logger } = require('@/lib/logging');
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('no output');
    expect(debugSpy).not.toHaveBeenCalled();
  });
});
