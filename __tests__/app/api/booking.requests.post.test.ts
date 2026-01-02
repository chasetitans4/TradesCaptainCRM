jest.mock('next/server', () => {
  class NextResponse {
    status: number;
    body: any;
    headers: Record<string, string>;
    constructor(body?: any, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = {};
    }
    static json(obj: any, init?: { status?: number }) {
      return { status: init?.status || 200, body: obj, headers: {} };
    }
  }
  return { NextResponse };
});
import { POST } from '@/app/api/booking/requests/route';

jest.mock('@/lib/booking/requests', () => ({
  createBookingRequest: jest.fn(async () => ({ success: true, requestId: 'req-123' })),
  getBookingRequests: jest.fn(),
}));

describe('booking requests POST validation', () => {
  it('rejects invalid email', async () => {
    const body = {
      businessId: 'biz-1',
      customerName: 'Test User',
      customerEmail: 'invalid-email',
      customerPhone: '555-123-4567',
      serviceType: 'repair',
      preferredDate: '2025-01-01',
      address: '123 Main St',
    };
    const req: any = {
      json: async () => body,
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('accepts valid input and normalizes phone', async () => {
    const body = {
      businessId: 'biz-1',
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      customerPhone: '555-123-4567',
      serviceType: 'repair',
      preferredDate: '2025-01-01',
      address: '123 Main St',
    };
    const req: any = {
      json: async () => body,
    };
    const res = await POST(req);
    expect(res.status).toBe(200);
    const { createBookingRequest } = require('@/lib/booking/requests');
    const call = createBookingRequest.mock.calls[0][1];
    expect(call.customerPhone).toBe('+15551234567');
  });
});
