import * as Sentry from '@sentry/nextjs';
import { checkAlertRules } from '@/lib/monitoring';

jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
}));

describe('monitoring: alert rules', () => {
  it('fires alert and respects cooldown', async () => {
    const rules = [
      {
        id: 'r1',
        name: 'rule',
        condition: async () => true,
        severity: 'warning',
        cooldownMinutes: 1,
      },
    ];
    await checkAlertRules(rules as any);
    await checkAlertRules(rules as any);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });
});
