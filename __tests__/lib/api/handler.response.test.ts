import { describe, it, expect, jest } from '@jest/globals';

describe('api/handler APIResponse helpers', () => {
  beforeAll(() => {
    jest.resetModules();
    jest.doMock('next/server', () => {
      class NextResponse {
        status: number;
        body: any;
        constructor(body?: any, init?: any) {
          this.status = (init && init.status) || 200;
          this.body = body;
        }
        static json(data: any, init?: any) {
          return new NextResponse({ data }, init);
        }
      }
      return { NextResponse };
    });
  });

  it('success and created responses set status', () => {
    const { APIResponse } = require('@/lib/api/handler');
    const r1 = APIResponse.success({ ok: true });
    expect(r1.status).toBe(200);
    const r2 = APIResponse.created({ id: '1' });
    expect(r2.status).toBe(201);
  });

  it('noContent returns 204 status', () => {
    const { APIResponse } = require('@/lib/api/handler');
    const r = APIResponse.noContent();
    expect(r.status).toBe(204);
  });

  it('error helpers wrap APIErrors with proper status', () => {
    const { APIResponse, APIErrors } = require('@/lib/api/handler');
    expect(APIResponse.badRequest('x').status).toBe(400);
    expect(APIResponse.unauthorized().status).toBe(401);
    expect(APIResponse.forbidden().status).toBe(403);
    expect(APIResponse.notFound('r').status).toBe(404);
    expect(APIResponse.conflict('c').status).toBe(409);
    expect(APIResponse.validationError('v').status).toBe(422);
    const r = APIResponse.rateLimited(5);
    expect(r.status).toBe(429);
  });
});
