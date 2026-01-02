// =====================================================
// PAYOUT SCHEDULER TESTS - v5.9
// Tests for 1st/15th payout scheduling with same-day rule
// =====================================================

import {
  getNextPayoutDate,
  getFollowingPayoutDate,
  isPayoutDate,
  applyPayoutDateRule,
  formatPayoutDate,
  getPayoutDateISO,
  getUpcomingPayoutDates,
  scheduleCommissionPayout,
} from '@/lib/admin/payout-scheduler';

describe('payout-scheduler: getNextPayoutDate', () => {
  describe('payments on 1st (same-day rule applies)', () => {
    it('payment on Jan 1 should payout on Jan 15', () => {
      const paymentDate = new Date(2025, 0, 1); // Jan 1, 2025
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(15);
      expect(payoutDate.getMonth()).toBe(0); // January
      expect(payoutDate.getFullYear()).toBe(2025);
    });

    it('payment on Dec 1 should payout on Dec 15', () => {
      const paymentDate = new Date(2025, 11, 1); // Dec 1, 2025
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(15);
      expect(payoutDate.getMonth()).toBe(11); // December
    });
  });

  describe('payments between 2nd-14th', () => {
    it('payment on Jan 2 should payout on Jan 15', () => {
      const paymentDate = new Date(2025, 0, 2);
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(15);
      expect(payoutDate.getMonth()).toBe(0);
    });

    it('payment on Jan 7 should payout on Jan 15', () => {
      const paymentDate = new Date(2025, 0, 7);
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(15);
      expect(payoutDate.getMonth()).toBe(0);
    });

    it('payment on Jan 14 should payout on Jan 15', () => {
      const paymentDate = new Date(2025, 0, 14);
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(15);
      expect(payoutDate.getMonth()).toBe(0);
    });
  });

  describe('payments on 15th (same-day rule applies)', () => {
    it('payment on Jan 15 should payout on Feb 1', () => {
      const paymentDate = new Date(2025, 0, 15); // Jan 15, 2025
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(1);
      expect(payoutDate.getMonth()).toBe(1); // February
    });

    it('payment on Dec 15 should payout on Jan 1 next year', () => {
      const paymentDate = new Date(2025, 11, 15); // Dec 15, 2025
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(1);
      expect(payoutDate.getMonth()).toBe(0); // January
      expect(payoutDate.getFullYear()).toBe(2026);
    });
  });

  describe('payments between 16th-31st', () => {
    it('payment on Jan 16 should payout on Feb 1', () => {
      const paymentDate = new Date(2025, 0, 16);
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(1);
      expect(payoutDate.getMonth()).toBe(1); // February
    });

    it('payment on Jan 20 should payout on Feb 1', () => {
      const paymentDate = new Date(2025, 0, 20);
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(1);
      expect(payoutDate.getMonth()).toBe(1);
    });

    it('payment on Jan 31 should payout on Feb 1', () => {
      const paymentDate = new Date(2025, 0, 31);
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(1);
      expect(payoutDate.getMonth()).toBe(1);
    });

    it('payment on Dec 31 should payout on Jan 1 next year', () => {
      const paymentDate = new Date(2025, 11, 31); // Dec 31, 2025
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(1);
      expect(payoutDate.getMonth()).toBe(0); // January
      expect(payoutDate.getFullYear()).toBe(2026);
    });
  });

  describe('edge cases', () => {
    it('handles leap year February correctly', () => {
      const paymentDate = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(1);
      expect(payoutDate.getMonth()).toBe(2); // March
    });

    it('handles February payment on 14th correctly', () => {
      const paymentDate = new Date(2025, 1, 14); // Feb 14
      const payoutDate = getNextPayoutDate(paymentDate);
      expect(payoutDate.getDate()).toBe(15);
      expect(payoutDate.getMonth()).toBe(1); // February
    });
  });
});

describe('payout-scheduler: getFollowingPayoutDate', () => {
  it('from Jan 1 returns Jan 15', () => {
    const date = new Date(2025, 0, 1);
    const next = getFollowingPayoutDate(date);
    expect(next.getDate()).toBe(15);
    expect(next.getMonth()).toBe(0);
  });

  it('from Jan 14 returns Jan 15', () => {
    const date = new Date(2025, 0, 14);
    const next = getFollowingPayoutDate(date);
    expect(next.getDate()).toBe(15);
    expect(next.getMonth()).toBe(0);
  });

  it('from Jan 15 returns Feb 1', () => {
    const date = new Date(2025, 0, 15);
    const next = getFollowingPayoutDate(date);
    expect(next.getDate()).toBe(1);
    expect(next.getMonth()).toBe(1);
  });

  it('from Jan 20 returns Feb 1', () => {
    const date = new Date(2025, 0, 20);
    const next = getFollowingPayoutDate(date);
    expect(next.getDate()).toBe(1);
    expect(next.getMonth()).toBe(1);
  });
});

describe('payout-scheduler: isPayoutDate', () => {
  it('returns true for 1st of month', () => {
    expect(isPayoutDate(new Date(2025, 0, 1))).toBe(true);
    expect(isPayoutDate(new Date(2025, 5, 1))).toBe(true);
    expect(isPayoutDate(new Date(2025, 11, 1))).toBe(true);
  });

  it('returns true for 15th of month', () => {
    expect(isPayoutDate(new Date(2025, 0, 15))).toBe(true);
    expect(isPayoutDate(new Date(2025, 5, 15))).toBe(true);
    expect(isPayoutDate(new Date(2025, 11, 15))).toBe(true);
  });

  it('returns false for other days', () => {
    expect(isPayoutDate(new Date(2025, 0, 2))).toBe(false);
    expect(isPayoutDate(new Date(2025, 0, 14))).toBe(false);
    expect(isPayoutDate(new Date(2025, 0, 16))).toBe(false);
    expect(isPayoutDate(new Date(2025, 0, 31))).toBe(false);
  });
});

describe('payout-scheduler: applyPayoutDateRule', () => {
  it('pushes to next payout when payment and payout are same day', () => {
    const paymentDate = new Date(2025, 0, 15);
    const calculatedPayout = new Date(2025, 0, 15);
    const result = applyPayoutDateRule(paymentDate, calculatedPayout);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(1); // February
  });

  it('keeps payout date when not same day', () => {
    const paymentDate = new Date(2025, 0, 10);
    const calculatedPayout = new Date(2025, 0, 15);
    const result = applyPayoutDateRule(paymentDate, calculatedPayout);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(0); // January
  });

  it('ignores time component when comparing dates', () => {
    const paymentDate = new Date(2025, 0, 15, 10, 30, 0);
    const calculatedPayout = new Date(2025, 0, 15, 14, 0, 0);
    const result = applyPayoutDateRule(paymentDate, calculatedPayout);
    // Should be pushed to Feb 1 since same calendar day
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(1);
  });
});

describe('payout-scheduler: formatPayoutDate', () => {
  it('formats date in long format', () => {
    const date = new Date(2025, 0, 15);
    const formatted = formatPayoutDate(date);
    expect(formatted).toBe('January 15, 2025');
  });

  it('formats December correctly', () => {
    const date = new Date(2025, 11, 1);
    const formatted = formatPayoutDate(date);
    expect(formatted).toBe('December 1, 2025');
  });
});

describe('payout-scheduler: getPayoutDateISO', () => {
  it('returns YYYY-MM-DD format', () => {
    const date = new Date(2025, 0, 15);
    expect(getPayoutDateISO(date)).toBe('2025-01-15');
  });

  it('pads single digit months and days', () => {
    const date = new Date(2025, 0, 1);
    expect(getPayoutDateISO(date)).toBe('2025-01-01');
  });

  it('handles December correctly', () => {
    const date = new Date(2025, 11, 15);
    expect(getPayoutDateISO(date)).toBe('2025-12-15');
  });
});

describe('payout-scheduler: getUpcomingPayoutDates', () => {
  it('returns 3 upcoming payout dates', () => {
    const fromDate = new Date(2025, 0, 5); // Jan 5
    const dates = getUpcomingPayoutDates(fromDate);
    expect(dates.length).toBe(3);
    expect(dates[0].getDate()).toBe(15); // Jan 15
    expect(dates[1].getDate()).toBe(1);  // Feb 1
    expect(dates[2].getDate()).toBe(15); // Feb 15
  });

  it('includes current day if it is a payout date', () => {
    const fromDate = new Date(2025, 0, 15); // Jan 15 (payout day)
    const dates = getUpcomingPayoutDates(fromDate);
    expect(dates.length).toBe(3);
    expect(dates[0].getDate()).toBe(15);
    expect(dates[0].getMonth()).toBe(0); // Jan 15 included
  });

  it('handles end of year correctly', () => {
    const fromDate = new Date(2025, 11, 20); // Dec 20
    const dates = getUpcomingPayoutDates(fromDate);
    expect(dates[0].getDate()).toBe(1);
    expect(dates[0].getMonth()).toBe(0); // Jan 1, 2026
    expect(dates[0].getFullYear()).toBe(2026);
  });
});

describe('payout-scheduler: scheduleCommissionPayout', () => {
  it('returns both trigger date and scheduled payout date', () => {
    const triggerDate = new Date(2025, 0, 10);
    const result = scheduleCommissionPayout(triggerDate);

    expect(result.triggerPaymentDate.getTime()).toBe(triggerDate.getTime());
    expect(result.scheduledPayoutDate.getDate()).toBe(15);
    expect(result.scheduledPayoutDate.getMonth()).toBe(0);
  });

  it('applies same-day rule for 1st', () => {
    const triggerDate = new Date(2025, 0, 1);
    const result = scheduleCommissionPayout(triggerDate);

    expect(result.scheduledPayoutDate.getDate()).toBe(15);
    expect(result.scheduledPayoutDate.getMonth()).toBe(0);
  });

  it('applies same-day rule for 15th', () => {
    const triggerDate = new Date(2025, 0, 15);
    const result = scheduleCommissionPayout(triggerDate);

    expect(result.scheduledPayoutDate.getDate()).toBe(1);
    expect(result.scheduledPayoutDate.getMonth()).toBe(1); // February
  });
});

describe('payout-scheduler: database operations', () => {
  it('getScheduledCommissions returns eligible commissions', async () => {
    jest.isolateModules(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      data: [
                        { id: 'c1', commission_amount: 50 },
                        { id: 'c2', commission_amount: 75 },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      const { getScheduledCommissions } = require('@/lib/admin/payout-scheduler');
      const res = await getScheduledCommissions(new Date(2025, 0, 15), 'eligible');
      expect(res.length).toBe(2);
      expect(res[0].id).toBe('c1');
      expect(res[1].id).toBe('c2');
    });
  });

  it('processScheduledPayouts approves and sums totals, handles errors', async () => {
    jest.isolateModules(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      data: [
                        { id: 'c1', commission_amount: 123.45 },
                        { id: 'c2', commission_amount: 10 },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (_updates: any) => ({
                eq: (_col: string, id: string) => {
                  if (id === 'c2') {
                    return { error: { message: 'bad' } };
                  }
                  return { error: null };
                },
              }),
            }),
          }),
        };
      });
      const { processScheduledPayouts } = require('@/lib/admin/payout-scheduler');
      const res = await processScheduledPayouts(new Date(2025, 0, 15), 'admin-1');
      expect(res.processed).toBe(1);
      expect(res.failed).toBe(1);
      expect(res.totalAmountCents).toBe(Math.round(123.45 * 100));
      expect(res.commissionIds).toEqual(['c1']);
      expect(res.errors.length).toBe(1);
      expect(res.errors[0].commissionId).toBe('c2');
    });
  });

  it('getScheduledCommissions throws on error', async () => {
    jest.isolateModules(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      data: null,
                      error: new Error('bad'),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      const { getScheduledCommissions } = require('@/lib/admin/payout-scheduler');
      await expect(getScheduledCommissions(new Date(2025, 0, 15), 'approved')).rejects.toBeTruthy();
    });
  });

  it('processScheduledPayouts returns early when no eligible commissions', async () => {
    jest.isolateModules(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (_updates: any) => ({
                eq: () => ({ error: null }),
              }),
            }),
          }),
        };
      });
      const { processScheduledPayouts } = require('@/lib/admin/payout-scheduler');
      const res = await processScheduledPayouts(new Date(2025, 0, 15), 'admin-2');
      expect(res.processed).toBe(0);
      expect(res.failed).toBe(0);
      expect(res.totalAmountCents).toBe(0);
      expect(res.commissionIds.length).toBe(0);
      expect(res.errors.length).toBe(0);
    });
  });

  it('processScheduledPayouts catches thrown update errors', async () => {
    jest.isolateModules(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      data: [
                        { id: 'c9', commission_amount: 99.99 },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (_updates: any) => ({
                eq: () => {
                  throw new Error('boom');
                },
              }),
            }),
          }),
        };
      });
      const { processScheduledPayouts } = require('@/lib/admin/payout-scheduler');
      const res = await processScheduledPayouts(new Date(2025, 0, 15), 'admin-3');
      expect(res.processed).toBe(0);
      expect(res.failed).toBe(1);
      expect(res.totalAmountCents).toBe(0);
      expect(res.errors.length).toBe(1);
      expect(res.errors[0].commissionId).toBe('c9');
      expect(res.errors[0].error).toBe('boom');
    });
  });

  it('getPayoutSummary aggregates by agent and type', async () => {
    jest.isolateModules(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  in: () => ({
                    data: [
                      { id: 'c1', agent_id: 'a1', commission_type: 'bonus', commission_amount: 100 },
                      { id: 'c2', agent_id: 'a1', commission_type: 'recurring', commission_amount: 50 },
                      { id: 'c3', agent_id: 'a2', commission_type: 'recurring', commission_amount: 25 },
                      { id: 'c4', agent_id: null, commission_type: null, commission_amount: 5 },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      });
      const { getPayoutSummary } = require('@/lib/admin/payout-scheduler');
      const res = await getPayoutSummary(new Date(2025, 0, 15));
      expect(res.totalCommissions).toBe(4);
      expect(res.totalAmountCents).toBe(Math.round((100 + 50 + 25 + 5) * 100));
      const a1 = res.byAgent.find((a: any) => a.agentId === 'a1');
      const a2 = res.byAgent.find((a: any) => a.agentId === 'a2');
      const unknown = res.byAgent.find((a: any) => a.agentId === 'unknown');
      expect(a1?.count).toBe(2);
      expect(a2?.count).toBe(1);
      expect(unknown?.count).toBe(1);
      const bonus = res.byType.find((t: any) => t.type === 'bonus');
      const recurring = res.byType.find((t: any) => t.type === 'recurring');
      const unkType = res.byType.find((t: any) => t.type === 'unknown');
      expect(bonus?.count).toBe(1);
      expect(recurring?.count).toBe(2);
      expect(unkType?.count).toBe(1);
    });
  });

  it('getPayoutSummary throws on error', async () => {
    jest.isolateModules(async () => {
      jest.doMock('@/lib/supabase/server', () => {
        return {
          createAdminClient: () => ({
            from: (_table: string) => ({
              select: () => ({
                eq: () => ({
                  in: () => ({
                    data: null,
                    error: new Error('bad'),
                  }),
                }),
              }),
            }),
          }),
        };
      });
      const { getPayoutSummary } = require('@/lib/admin/payout-scheduler');
      await expect(getPayoutSummary(new Date(2025, 0, 15))).rejects.toBeTruthy();
    });
  });
});
