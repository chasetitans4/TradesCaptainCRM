import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('lib/api/response', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('next/server', () => {
      class NextResponseMock {
        status: number;
        headers: Map<string, string>;
        body: any;
        constructor(body?: any, init?: any) {
          this.body = body;
          this.status = init?.status || 200;
          this.headers = new Map(Object.entries(init?.headers || {}));
        }
        static json(data: any, init?: any) {
          return new NextResponseMock(data, init);
        }
      }
      return { NextResponse: NextResponseMock };
    });
    jest.doMock('@/lib/logger', () => ({
      apiLogger: {
        error: jest.fn(),
      },
    }));
  });

  it('getCorrelationId returns provided or generates new', () => {
    const { getCorrelationId } = require('@/lib/api/response');
    expect(getCorrelationId('abc')).toBe('abc');
    const id = getCorrelationId(null);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('errorResponse sets status, headers, and body fields', () => {
    const { errorResponse } = require('@/lib/api/response');
    const res = errorResponse('Bad', 400, {
      message: 'm',
      code: 'C',
      details: { a: 1 },
      correlationId: 'cid-1',
    });
    expect(res.status).toBe(400);
    expect(res.headers.get('X-Correlation-ID')).toBe('cid-1');
    expect(res.body.error).toBe('Bad');
    expect(res.body.message).toBe('m');
    expect(res.body.code).toBe('C');
    expect(res.body.correlationId).toBe('cid-1');
    expect(res.body.details).toEqual({ a: 1 });
  });

  it('successResponse sets correlation header and status', () => {
    const { successResponse } = require('@/lib/api/response');
    const res = successResponse({ ok: true }, { status: 201, correlationId: 'cid-2' });
    expect(res.status).toBe(201);
    expect(res.headers.get('X-Correlation-ID')).toBe('cid-2');
    expect(res.body.data).toEqual({ ok: true });
    expect(res.body.correlationId).toBe('cid-2');
  });

  it('ApiErrors.rateLimited sets Retry-After header when provided', () => {
    const { ApiErrors } = require('@/lib/api/response');
    const res = ApiErrors.rateLimited(5, 'cid-3');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('5');
    expect(res.headers.get('X-Correlation-ID')).toBe('cid-3');
    expect(res.body.retryAfter).toBe(5);
    const res2 = ApiErrors.rateLimited(undefined, 'cid-4');
    expect(res2.status).toBe(429);
    expect(res2.headers.get('Retry-After')).toBeUndefined();
    expect(res2.headers.get('X-Correlation-ID')).toBe('cid-4');
  });
  
  it('ApiErrors helpers cover default parameter branches', () => {
    const { ApiErrors } = require('@/lib/api/response');
    const r1 = ApiErrors.unauthorized();
    expect(r1.status).toBe(401);
    expect(r1.body.message).toBe('Authentication required');
    const r2 = ApiErrors.forbidden();
    expect(r2.status).toBe(403);
    expect(r2.body.message).toBe('Access denied');
    const r3 = ApiErrors.notFound();
    expect(r3.status).toBe(404);
    expect(r3.body.message).toBe('Resource not found');
    const r4 = ApiErrors.validationError({ field: 'required' });
    expect(r4.status).toBe(422);
    expect(r4.body.code).toBe('VALIDATION_ERROR');
    expect(r4.body.details).toEqual({ field: 'required' });
    const r5 = ApiErrors.internalError();
    expect(r5.status).toBe(500);
    const cid = r5.headers.get('X-Correlation-ID');
    expect(cid).toBeTruthy();
    expect(r5.body.correlationId).toBe(cid);
    expect(r5.body.message).toContain(cid as string);
    const r6 = ApiErrors.serviceUnavailable();
    expect(r6.status).toBe(503);
    expect(r6.body.message).toBe('Service temporarily unavailable');
  });

  it('ApiErrors.rateLimited generates correlationId when omitted', () => {
    const { ApiErrors } = require('@/lib/api/response');
    const res = ApiErrors.rateLimited(1);
    expect(res.status).toBe(429);
    const cid = res.headers.get('X-Correlation-ID');
    expect(cid).toBeTruthy();
    expect(res.body.correlationId).toBeTruthy();
    expect(res.headers.get('Retry-After')).toBe('1');
  });

  it('withErrorHandling returns internal error and preserves correlation id', async () => {
    const { withErrorHandling } = require('@/lib/api/response');
    const handler = withErrorHandling(async () => {
      throw new Error('boom');
    });
    const req: any = {
      headers: {
        get: (k: string) => (k === 'X-Correlation-ID' ? 'cid-5' : null),
      },
    };
    const res = await handler(req);
    expect(res.status).toBe(500);
    expect(res.headers.get('X-Correlation-ID')).toBe('cid-5');
    expect(res.body.error).toBe('Internal Server Error');
    expect(res.body.correlationId).toBe('cid-5');
  });

  it('extractCorrelationId prefers X-Request-ID when present', () => {
    const { extractCorrelationId } = require('@/lib/api/response');
    const req: any = {
      headers: {
        get: (k: string) => (k === 'X-Request-ID' ? 'req-1' : null),
      },
    };
    expect(extractCorrelationId(req)).toBe('req-1');
  });
});
