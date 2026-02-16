import { describe, it, expect, jest } from '@jest/globals';
import type { NextResponse } from 'next/server';

function mockNextServer() {
  jest.doMock('next/server', () => {
    class SimpleResponse {
      status: number;
      headers: Record<string, string>;
      body: any;
      constructor(body: any, init: any) {
        this.body = body;
        this.status = init?.status ?? 200;
        this.headers = init?.headers ?? {};
      }
      text() {
        return Promise.resolve(typeof this.body === 'string' ? this.body : '');
      }
    }
    return { NextResponse: SimpleResponse };
  });
}

function makeRequest(form: Record<string, string>) {
  return {
    url: 'https://example.com/api/webhooks/twilio/status',
    async formData() {
      const FD = (global as any).FormData || require('formdata-node').FormData;
      const fd = new FD();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      return fd;
    },
  } as any;
}

describe('Twilio status webhook route', () => {
  it('returns 400 for missing required fields', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('next/headers', () => ({
        headers: async () => ({
          get: (key: string) => (key === 'x-twilio-signature' ? 'valid' : null),
        }),
      }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: jest.fn(async () => ({ applied: true })),
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageStatus: 'sent' }));
      expect(res.status).toBe(400);
    });
  });

  it('returns 403 when signature is invalid', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('next/headers', () => ({
        headers: async () => ({
          get: (key: string) => (key === 'x-twilio-signature' ? 'bad' : null),
        }),
      }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => false,
        updateMessageStatus: jest.fn(async () => ({ applied: true })),
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageSid: 'SMX', MessageStatus: 'sent' }));
      expect(res.status).toBe(403);
    });
  });

  it('maps accepted -> queued and updates status', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const updateMock = jest.fn(async () => ({ applied: true }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: updateMock,
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageSid: 'SM1', MessageStatus: 'accepted' }));
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith('SM1', 'queued', undefined);
    });
  });

  it('maps sending -> sent and includes error details when provided', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const updateMock = jest.fn(async () => ({ applied: true }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: updateMock,
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(
        makeRequest({ MessageSid: 'SM2', MessageStatus: 'sending', ErrorCode: '30003', ErrorMessage: 'unreachable' })
      );
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith('SM2', 'sent', '30003: unreachable');
    });
  });

  it('maps read -> delivered', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const updateMock = jest.fn(async () => ({ applied: true }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: updateMock,
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageSid: 'SM3', MessageStatus: 'read' }));
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith('SM3', 'delivered', undefined);
    });
  });

  it('maps undelivered -> failed', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const updateMock = jest.fn(async () => ({ applied: true }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: updateMock,
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageSid: 'SM4', MessageStatus: 'undelivered' }));
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith('SM4', 'failed', undefined);
    });
  });

  it('maps unknown -> sent by default', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      const updateMock = jest.fn(async () => ({ applied: true }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: updateMock,
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageSid: 'SM5', MessageStatus: 'xyz' }));
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith('SM5', 'sent', undefined);
    });
  });

  it('returns 500 when updateMessageStatus throws', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: async () => { throw new Error('db down'); },
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageSid: 'SM6', MessageStatus: 'sent' }));
      expect(res.status).toBe(500);
      const text = await (res as any).text?.() || '';
      expect(text).toContain('Internal Server Error');
    });
  });

  it('processes when signature is valid', async () => {
    await jest.isolateModulesAsync(async () => {
      mockNextServer();
      jest.doMock('next/headers', () => ({
        headers: async () => ({ get: (k: string) => (k === 'x-twilio-signature' ? 'good' : null) }),
      }));
      const updateMock = jest.fn(async () => ({ applied: true }));
      jest.doMock('@/lib/twilio', () => ({
        validateTwilioSignature: () => true,
        updateMessageStatus: updateMock,
      }));
      const route = require('@/app/api/webhooks/twilio/status/route');
      const res: NextResponse = await route.POST(makeRequest({ MessageSid: 'SM7', MessageStatus: 'queued' }));
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith('SM7', 'queued', undefined);
    });
  });
});
