import { getSystemHealth, getUptime } from '@/lib/monitoring';

jest.mock('@/lib/redis/client', () => ({
  checkRedisHealth: jest.fn().mockResolvedValue(true),
}));

describe('monitoring: system health', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.RESEND_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports degraded when external APIs not configured', async () => {
    const health = await getSystemHealth();
    expect(health.status).toBe('degraded');
    const apiStatuses = health.services.filter(s =>
      ['stripe', 'twilio', 'resend', 'openai'].includes(s.name)
    );
    expect(apiStatuses.every(s => s.status === 'degraded')).toBe(true);
  });

  it('reports unhealthy when redis fails', async () => {
    const { checkRedisHealth } = require('@/lib/redis/client');
    checkRedisHealth.mockResolvedValue(false);
    const health = await getSystemHealth();
    const redisSvc = health.services.find(s => s.name === 'redis');
    expect(redisSvc?.status).toBe('unhealthy');
    expect(health.status).toBe('unhealthy');
  });

  it('captures error message when redis throws', async () => {
    const { checkRedisHealth } = require('@/lib/redis/client');
    checkRedisHealth.mockImplementation(async () => {
      throw new Error('redis unavailable');
    });
    const health = await getSystemHealth();
    const redisSvc = health.services.find(s => s.name === 'redis');
    expect(redisSvc?.status).toBe('unhealthy');
    expect(redisSvc?.message).toContain('redis unavailable');
  });

  it('uptime increases over time', async () => {
    const u1 = getUptime();
    await new Promise(r => setTimeout(r, 10));
    const u2 = getUptime();
    expect(u2).toBeGreaterThanOrEqual(u1);
  });
});
