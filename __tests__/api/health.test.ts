import { getSystemHealth } from '@/lib/monitoring';

describe('Monitoring integration: getSystemHealth', () => {
  it('returns overall status and services with timestamps', async () => {
    const health = await getSystemHealth();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('version');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('timestamp');
    expect(Array.isArray(health.services)).toBe(true);
    for (const svc of health.services) {
      expect(svc).toHaveProperty('name');
      expect(svc).toHaveProperty('status');
      expect(svc).toHaveProperty('lastChecked');
    }
  });
});
