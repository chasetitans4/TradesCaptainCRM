import { describe, it, expect, jest, beforeEach } from '@jest/globals';

function mockNextServer() {
  class NextResponse {
    static json(obj: any, init?: { status?: number }) {
      return { status: init?.status ?? 200, body: obj };
    }
  }
  class NextRequest {}
  jest.doMock('next/server', () => ({ NextResponse, NextRequest }));
}

describe('POST /api/invoices/[id]/payment-link', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns 401 when no profile', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: jest.fn(async () => ({ from: jest.fn() })),
        getServerUserProfile: jest.fn(async () => null),
      }));
      jest.doMock('@/lib/invoices', () => ({
        generatePaymentLinkForInvoice: jest.fn(async () => 'https://link'),
      }));
      const { POST } = require('@/app/api/invoices/[id]/payment-link/route');
      const req: any = {};
      const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_x' }) });
      expect(res.status).toBe(401);
    });
  });

  it('returns 404 when invoice not found for business', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: jest.fn(async () => ({
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: null, error: { message: 'not found' } }),
                }),
              }),
            }),
          }),
        })),
        getServerUserProfile: jest.fn(async () => ({ id: 'u1', business_id: 'biz_1' })),
      }));
      jest.doMock('@/lib/invoices', () => ({
        generatePaymentLinkForInvoice: jest.fn(async () => 'https://link'),
      }));
      const { POST } = require('@/app/api/invoices/[id]/payment-link/route');
      const req: any = {};
      const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_missing' }) });
      expect(res.status).toBe(404);
    });
  });

  it('returns existing payment link if already present', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: jest.fn(async () => ({
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'inv_1',
                      business_id: 'biz_1',
                      stripe_payment_link_url: 'https://existing',
                      status: 'sent',
                      amount_due: 50,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })),
        getServerUserProfile: jest.fn(async () => ({ id: 'u1', business_id: 'biz_1' })),
      }));
      jest.doMock('@/lib/invoices', () => ({
        generatePaymentLinkForInvoice: jest.fn(async () => 'https://link'),
      }));
      const { POST } = require('@/app/api/invoices/[id]/payment-link/route');
      const req: any = {};
      const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_1' }) });
      expect(res.body.url).toBe('https://existing');
    });
  });

  it('rejects void invoice', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: jest.fn(async () => ({
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'inv_2',
                      business_id: 'biz_1',
                      status: 'void',
                      amount_due: 50,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })),
        getServerUserProfile: jest.fn(async () => ({ id: 'u1', business_id: 'biz_1' })),
      }));
      jest.doMock('@/lib/invoices', () => ({
        generatePaymentLinkForInvoice: jest.fn(async () => 'https://link'),
      }));
      const { POST } = require('@/app/api/invoices/[id]/payment-link/route');
      const req: any = {};
      const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_2' }) });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('voided');
    });
  });

  it('rejects already paid invoice', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: jest.fn(async () => ({
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'inv_3',
                      business_id: 'biz_1',
                      status: 'sent',
                      amount_due: 0,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })),
        getServerUserProfile: jest.fn(async () => ({ id: 'u1', business_id: 'biz_1' })),
      }));
      jest.doMock('@/lib/invoices', () => ({
        generatePaymentLinkForInvoice: jest.fn(async () => 'https://link'),
      }));
      const { POST } = require('@/app/api/invoices/[id]/payment-link/route');
      const req: any = {};
      const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_3' }) });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already paid');
    });
  });

  it('generates payment link successfully', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const mockGenerate = jest.fn(async () => 'https://link');
      jest.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: jest.fn(async () => ({
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'inv_4',
                      business_id: 'biz_1',
                      status: 'sent',
                      amount_due: 25,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })),
        getServerUserProfile: jest.fn(async () => ({ id: 'u1', business_id: 'biz_1' })),
      }));
      jest.doMock('@/lib/invoices', () => ({
        generatePaymentLinkForInvoice: mockGenerate,
      }));
      const { POST } = require('@/app/api/invoices/[id]/payment-link/route');
      const req: any = {};
      const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_4' }) });
      expect(res.body.url).toBe('https://link');
      expect(mockGenerate).toHaveBeenCalledWith('inv_4');
    });
  });

  it('handles generator error', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: jest.fn(async () => ({
          from: (_table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'inv_5',
                      business_id: 'biz_1',
                      status: 'sent',
                      amount_due: 25,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })),
        getServerUserProfile: jest.fn(async () => ({ id: 'u1', business_id: 'biz_1' })),
      }));
      jest.doMock('@/lib/invoices', () => ({
        generatePaymentLinkForInvoice: jest.fn(async () => { throw new Error('bad'); }),
      }));
      const { POST } = require('@/app/api/invoices/[id]/payment-link/route');
      const req: any = {};
      const res: any = await POST(req, { params: Promise.resolve({ id: 'inv_5' }) });
      expect(res.status).toBe(500);
    });
  });
});
