import { getSystemHealth, getUptime, reportWebVitals, performance, checkAlertRules } from '@/lib/monitoring';

jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('@/lib/redis/client', () => ({
  checkRedisHealth: jest.fn(async () => true),
}));

describe('monitoring: system health', () => {
  beforeEach(() => {
    const sentry = require('@sentry/nextjs');
    sentry.addBreadcrumb.mockReset();
    sentry.captureMessage.mockReset();
    const redis = require('@/lib/redis/client');
    redis.checkRedisHealth.mockReset();
    redis.checkRedisHealth.mockResolvedValue(true);
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.RESEND_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('computes degraded status when external APIs not configured and redis healthy', async () => {
    const health = await getSystemHealth();
    expect(health.status).toBe('degraded');
    const stripe = health.services.find(s => s.name === 'stripe');
    expect(stripe?.status).toBe('degraded');
    const redis = health.services.find(s => s.name === 'redis');
    expect(redis?.status).toBe('healthy');
    expect(getUptime()).toBeGreaterThanOrEqual(0);
  });

  it('computes unhealthy when redis check throws', async () => {
    const { checkRedisHealth } = require('@/lib/redis/client');
    checkRedisHealth.mockImplementation(async () => {
      throw new Error('redis down');
    });
    const health = await getSystemHealth();
    expect(health.status).toBe('unhealthy');
    const redis = health.services.find(s => s.name === 'redis');
    expect(redis?.status).toBe('unhealthy');
    expect(typeof health.version).toBe('string');
  });
});

describe('monitoring: performance utilities', () => {
  beforeEach(() => {
    const sentry = require('@sentry/nextjs');
    sentry.addBreadcrumb.mockReset();
    sentry.captureMessage.mockReset();
  });

  it('measure logs slow operation breadcrumb', async () => {
    const sentry = require('@sentry/nextjs');
    const base = Date.now();
    const spy = jest.spyOn(Date, 'now')
      .mockImplementationOnce(() => base)
      .mockImplementationOnce(() => base + 1500);
    const result = await performance.measure('op1', async () => 'ok');
    expect(result).toBe('ok');
    expect(sentry.addBreadcrumb).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('measure logs error breadcrumb and rethrows', async () => {
    const sentry = require('@sentry/nextjs');
    const base = Date.now();
    const spy = jest.spyOn(Date, 'now')
      .mockImplementationOnce(() => base)
      .mockImplementationOnce(() => base + 10);
    await expect(
      performance.measure('op2', async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');
    expect(sentry.addBreadcrumb).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('monitoring: web vitals and alerts', () => {
  beforeEach(() => {
    const sentry = require('@sentry/nextjs');
    sentry.addBreadcrumb.mockReset();
    sentry.captureMessage.mockReset();
  });

  it('reports web vitals and captures poor metrics', () => {
    const sentry = require('@sentry/nextjs');
    reportWebVitals({ id: '1', name: 'LCP', value: 1800, rating: 'good', delta: 100 });
    expect(sentry.addBreadcrumb).toHaveBeenCalled();
    reportWebVitals({ id: '2', name: 'CLS', value: 0.3, rating: 'poor', delta: 0.1 });
    expect(sentry.captureMessage).toHaveBeenCalled();
  });

  it('checks alert rules and respects cooldown', async () => {
    const sentry = require('@sentry/nextjs');
    const base = Date.now();
    const spy = jest.spyOn(Date, 'now')
      .mockImplementation(() => base);
    await checkAlertRules([
      {
        id: 'r1',
        name: 'rule one',
        condition: async () => true,
        severity: 'critical',
        cooldownMinutes: 5,
      },
    ]);
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
    await checkAlertRules([
      {
        id: 'r1',
        name: 'rule one',
        condition: async () => true,
        severity: 'critical',
        cooldownMinutes: 5,
      },
    ]);
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

