import {
  calculateCommission,
  calculateUpgradeCommission,
  getCommissionQuickReference,
  getCurrentRates,
  getRetentionBonuses,
  getOfferAdjustments,
} from '@/lib/admin/commission-calculator';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => ({
      from: (table: string) => {
        const m: any = (globalThis as any).__commMock || {};
        const buildChain = (resolver: (filters: any[], state: any) => any[]) => {
          const state: any = { filters: [], orderBy: null, singleOnly: false };
          const compute = () => {
            let data = resolver(state.filters, state) ?? null;
            if (Array.isArray(data) && state.orderBy) {
              data = [...data].sort((a: any, b: any) => {
                const k = state.orderBy.key;
                const asc = state.orderBy.asc;
                const av = a[k];
                const bv = b[k];
                const cmp = typeof av === 'string' && typeof bv === 'string'
                  ? av.localeCompare(bv)
                  : (av > bv ? 1 : av < bv ? -1 : 0);
                return asc ? cmp : -cmp;
              });
            }
            return data;
          };
          const chain: any = {
            select: (_fields?: string) => chain,
            eq: (col: string, val: any) => {
              state.filters.push({ type: 'eq', col, val });
              return Object.assign({}, chain, { data: compute() });
            },
            order: (key: string, opts: any) => {
              state.orderBy = { key, asc: !!(opts && opts.ascending) };
              return Object.assign({}, chain, { data: compute() });
            },
            single: () => {
              const d = compute();
              return { data: Array.isArray(d) ? (d[0] || null) : d };
            },
            then: (resolve: any) => resolve({ data: compute() }),
          };
          return chain;
        };
        if (table === 'plan_commission_lookup') {
          return buildChain((_filters) => (m.planLookup !== undefined ? m.planLookup : null)) as any;
        }
        if (table === 'offer_commission_adjustments') {
          return buildChain((filters) => {
            const getEq = (c: string) => filters.find((f: any) => f.type === 'eq' && f.col === c)?.val;
            const code = getEq('offer_code');
            const isActive = getEq('is_active');
            const rows = (m.offerAdjustments || []).filter((r: any) => {
              return (code ? r.offer_code === code : true) && (typeof isActive === 'boolean' ? r.is_active === isActive : true);
            });
            return rows;
          }) as any;
        }
        if (table === 'commission_rates') {
          return buildChain((_filters) => m.commissionRates || []) as any;
        }
        if (table === 'retention_bonuses') {
          return buildChain((_filters) => m.retentionBonuses || []) as any;
        }
        return {} as any;
      },
    })),
  };
});

describe('commission-calculator: calculateCommission monthly', () => {
  beforeEach(() => {
    (globalThis as any).__commMock = {};

  });

  it('computes monthly commission using fallback pricing without offer', async () => {
    const res = await calculateCommission({ planSlug: 'blue_pro', billingPeriod: 'monthly' });
    expect(res.planName.toLowerCase()).toContain('blue pro');
    expect(res.billingPeriod).toBe('monthly');
    expect(res.planPrice).toBe(99);
    expect(res.upfront).toBeCloseTo(49.5, 2);
    expect(res.recurring.rate10).toBeCloseTo(9.9, 2);
    expect(res.recurring.rate15).toBeCloseTo(14.85, 2);
    expect(res.recurring.totalRecurring).toBeCloseTo(163.35, 2);
    expect(res.bonuses.total).toBe(190);
    expect(res.maxCommission).toBeCloseTo(402.85, 2);
  });

  it('includes add-on users note without altering amounts', async () => {
    const res = await calculateCommission({ planSlug: 'blue_pro', billingPeriod: 'monthly', addOnUsers: 3 });
    expect(res.upfront).toBeCloseTo(49.5, 2);
    expect(res.recurring.totalRecurring).toBeCloseTo(163.35, 2);
    const joined = res.notes.join(' ');
    expect(joined).toContain('+3 users');
    expect(joined).toContain('Additional $57/mo');
  });
});

describe('commission-calculator: calculateCommission annual with VIP20 offer', () => {
  beforeEach(() => {
    (globalThis as any).__commMock = {
      offerAdjustments: [
        {
          offer_code: 'VIP20',
          offer_name: 'VIP 20% Off',
          upfront_adjustment_type: null,
          upfront_adjustment_value: null,
          recurring_adjustment_type: null,
          recurring_adjustment_value: null,
          notes: 'VIP annual discount',
          is_active: true,
        },
      ],
    };
  });

  it('applies VIP20 annual discount and computes one-time commission', async () => {
    const res = await calculateCommission({ planSlug: 'gold_pro', billingPeriod: 'annual', offerCode: 'VIP20' });
    expect(res.billingPeriod).toBe('annual');
    expect(res.effectivePrice).toBeCloseTo(2872.8, 2);
    expect(res.upfront).toBeCloseTo(1005.48, 2);
    expect(res.recurring.totalRecurring).toBe(0);
    expect(res.bonuses.total).toBe(0);
    expect(res.maxCommission).toBeCloseTo(1005.48, 2);
    expect(res.notes.join(' ').toLowerCase()).toContain('annual plans');
  });
});

describe('commission-calculator: calculateCommission monthly with VIP20 offer', () => {
  beforeEach(() => {
    (globalThis as any).__commMock = {
      offerAdjustments: [
        {
          offer_code: 'VIP20',
          offer_name: 'VIP 20% Off',
          upfront_adjustment_type: null,
          upfront_adjustment_value: null,
          recurring_adjustment_type: null,
          recurring_adjustment_value: null,
          notes: 'VIP monthly discount',
          is_active: true,
        },
      ],
    };
  });

  it('applies VIP20 monthly discount and computes recurring on discounted price', async () => {
    const res = await calculateCommission({ planSlug: 'blue_pro', billingPeriod: 'monthly', offerCode: 'VIP20' });
    expect(res.billingPeriod).toBe('monthly');
    expect(res.effectivePrice).toBeCloseTo(79.2, 2);
    expect(res.upfront).toBeCloseTo(39.6, 2);
    expect(res.recurring.rate10).toBeCloseTo(7.92, 2);
    expect(res.recurring.rate15).toBeCloseTo(11.88, 2);
    expect(res.recurring.totalRecurring).toBeCloseTo(130.68, 2);
    expect(res.maxCommission).toBeCloseTo(39.6 + 130.68 + 190, 2);
    const joined = res.notes.join(' ');
    expect(joined).toContain('20% discounted price');
  });
});

describe('commission-calculator: calculateCommission monthly with delay offer', () => {
  beforeEach(() => {
    (globalThis as any).__commMock = {
      offerAdjustments: [
        {
          offer_code: 'FREETRIAL',
          offer_name: 'Free Trial',
          upfront_adjustment_type: 'delay',
          upfront_adjustment_value: 14,
          recurring_adjustment_type: null,
          recurring_adjustment_value: null,
          notes: 'Upfront delayed until service starts',
          is_active: true,
        },
      ],
    };
  });

  it('delays upfront date and adds note for trial', async () => {
    const res = await calculateCommission({ planSlug: 'blue_pro', billingPeriod: 'monthly', offerCode: 'FREETRIAL' });
    expect(res.upfrontDate).toContain('14 day delay');
    const joined = res.notes.join(' ');
    expect(joined.toLowerCase()).toContain('upfront delayed');
  });
});

describe('commission-calculator: calculateCommission monthly with FIRST50 offer', () => {
  beforeEach(() => {
    (globalThis as any).__commMock = {
      offerAdjustments: [
        {
          offer_code: 'FIRST50',
          offer_name: 'First Month 50% Off',
          upfront_adjustment_type: 'reduce_base',
          upfront_adjustment_value: 50,
          recurring_adjustment_type: null,
          recurring_adjustment_value: null,
          notes: 'First month discount',
          is_active: true,
        },
      ],
    };
  });

  it('adds FIRST50 note and keeps upfront based on Month 2 price', async () => {
    const res = await calculateCommission({ planSlug: 'blue_pro', billingPeriod: 'monthly', offerCode: 'FIRST50' });
    expect(res.upfront).toBeCloseTo(49.5, 2);
    expect(res.upfrontDate).toBe('After Month 2 payment');
    const joined = res.notes.join(' ');
    expect(joined.toLowerCase()).toContain('first month discounted');
    expect(joined).toContain('First Month 50% Off');
  });
});

describe('commission-calculator: calculateUpgradeCommission', () => {
  it('computes upgrade commission and continued recurring before month 6', async () => {
    const res = await calculateUpgradeCommission({
      currentPlanSlug: 'blue_starter',
      newPlanSlug: 'blue_pro',
      customerMonth: 4,
      isRateLocked: false,
    });
    expect(res.priceDifference).toBe(50);
    expect(res.upgradeUpfront).toBe(25);
    expect(res.newRecurring.total).toBeCloseTo(82.5, 2);
    expect(res.continuedOriginalRecurring.rate).toBeCloseTo(4.9, 2);
    expect(res.continuedOriginalRecurring.monthsRemaining).toBe(10);
    expect(res.continuedOriginalRecurring.total).toBeCloseTo(49, 2);
    expect(res.totalUpgradeCommission).toBeCloseTo(25 + 82.5, 2);
  });

  it('adds rate-locked notes and uses 15% on original after month 6', async () => {
    const res = await calculateUpgradeCommission({
      currentPlanSlug: 'blue_starter',
      newPlanSlug: 'blue_pro',
      customerMonth: 8,
      isRateLocked: true,
    });
    expect(res.priceDifference).toBe(50);
    expect(res.upgradeUpfront).toBe(25);
    expect(res.newRecurring.total).toBeCloseTo(82.5, 2);
    expect(res.continuedOriginalRecurring.rate).toBeCloseTo(7.35, 2);
    expect(res.continuedOriginalRecurring.monthsRemaining).toBe(6);
    expect(res.continuedOriginalRecurring.total).toBeCloseTo(44.1, 2);
    const joined = res.notes.join(' ');
    expect(joined).toContain('Upgrade AFTER Month 6');
    expect(joined).toContain('15% rate locked');
  });

  it('throws for invalid plan slug', async () => {
    await expect(
      calculateUpgradeCommission({
        currentPlanSlug: 'invalid_plan',
        newPlanSlug: 'blue_pro',
        customerMonth: 3,
        isRateLocked: false,
      })
    ).rejects.toThrow('Invalid plan slug');
  });

  it('throws when new plan is not higher priced', async () => {
    await expect(
      calculateUpgradeCommission({
        currentPlanSlug: 'blue_pro',
        newPlanSlug: 'blue_starter',
        customerMonth: 3,
        isRateLocked: false,
      })
    ).rejects.toThrow('New plan must be higher priced than current plan');
  });
});

describe('commission-calculator: quick reference and rates/bonuses', () => {
  beforeEach(() => {
    (globalThis as any).__commMock = {};
  });

  it('returns fallback quick reference when DB lookup is empty', async () => {
    const rows = await getCommissionQuickReference();
    const bluePro = rows.find((r) => r.planType === 'blue_pro');
    expect(rows.length).toBeGreaterThan(5);
    expect(bluePro?.monthlyPrice).toBe(99);
    expect(bluePro?.upfront).toBeCloseTo(49.5, 2);
  });

  it('returns default commission rates when DB is empty', async () => {
    const r = await getCurrentRates();
    expect(r.upfront).toBe(50);
    expect(r.recurring10).toBe(10);
    expect(r.recurring15).toBe(15);
    expect(r.annual).toBe(35);
  });

  it('returns configured commission rates when DB has values', async () => {
    (globalThis as any).__commMock = {
      commissionRates: [
        { rate_type: 'upfront', rate_percentage: 55 },
        { rate_type: 'recurring_10', rate_percentage: 12 },
        { rate_type: 'recurring_15', rate_percentage: 17 },
        { rate_type: 'annual', rate_percentage: 40 },
      ],
    };
    const r = await getCurrentRates();
    expect(r.upfront).toBe(55);
    expect(r.recurring10).toBe(12);
    expect(r.recurring15).toBe(17);
    expect(r.annual).toBe(40);
  });

  it('returns default retention bonuses when DB is empty', async () => {
    const b = await getRetentionBonuses();
    expect(b.total).toBe(190);
    expect(b.month3).toBe(15);
    expect(b.month12).toBe(100);
  });

  it('returns configured retention bonuses when DB has values', async () => {
    (globalThis as any).__commMock = {
      retentionBonuses: [
        { milestone: 'month_3', bonus_amount_cents: 2000 },
        { milestone: 'month_4', bonus_amount_cents: 3000 },
        { milestone: 'month_6', bonus_amount_cents: 6000 },
        { milestone: 'month_12', bonus_amount_cents: 11000 },
      ],
    };
    const b = await getRetentionBonuses();
    expect(b.month3).toBe(20);
    expect(b.month4).toBe(30);
    expect(b.month6).toBe(60);
    expect(b.month12).toBe(110);
    expect(b.total).toBe(220);
  });

  it('lists active offer adjustments', async () => {
    (globalThis as any).__commMock = {
      offerAdjustments: [
        { offer_code: 'VIP20', offer_name: 'VIP 20% Off', is_active: true },
        { offer_code: 'FIRST50', offer_name: 'First Month 50% Off', is_active: true },
      ],
    };
    const rows = await getOfferAdjustments();
    expect(rows.length).toBe(2);
    expect(rows[0].offer_code).toBe('VIP20');
  });

  it('returns quick reference from DB mapping when data exists', async () => {
    (globalThis as any).__commMock = {
      planLookup: [
        {
          plan_type: 'blue_pro',
          monthly_price_cents: 9900,
          upfront_cents: 4950,
          rate_10_cents: 990,
          rate_15_cents: 1485,
          total_recurring_cents: 16335,
          total_bonuses_cents: 19000,
          max_commission_cents: 40285,
          annual_price_cents: 89100,
          annual_commission_cents: 31185,
        },
      ],
    };
    const rows = await getCommissionQuickReference();
    const bp = rows.find((r) => r.planType === 'blue_pro');
    expect(bp).toBeTruthy();
    expect(bp?.planName.toLowerCase()).toContain('blue pro');
    expect(bp?.monthlyPrice).toBe(99);
    expect(bp?.upfront).toBe(49.5);
    expect(bp?.rate10).toBe(9.9);
    expect(bp?.rate15).toBe(14.85);
    expect(bp?.maxMonthly).toBeCloseTo(402.85, 2);
    expect(bp?.annualCommission).toBeCloseTo(311.85, 2);
  });

  it('throws for annual billing when plan has no annual option', async () => {
    await expect(
      calculateCommission({ planSlug: 'leads_captain_user', billingPeriod: 'annual' })
    ).rejects.toThrow('Annual billing not available for this plan');
  });
});
