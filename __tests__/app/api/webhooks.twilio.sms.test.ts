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
// Mock Leads Captain modules to avoid loading heavy AI clients during import
jest.mock('@/lib/leads-captain', () => ({
  handleComplianceKeywords: jest.fn(async () => ({ handled: false })),
  isPhoneSuppressed: jest.fn(async () => false),
  checkForAbuse: jest.fn(async () => ({ shouldBlock: false, violations: [] })),
  blockForAbuse: jest.fn(),
  incrementSMSUsage: jest.fn(),
  hasLeadsCaptainAccess: jest.fn(async () => false),
  handleLeadsCaptainInboundSMS: jest.fn(),
}));
jest.mock('@/lib/leads-captain/v2', () => ({
  processInboundMessage: jest.fn(async () => ({
    classification: { intent: 'none' },
    rule_matched: null,
    should_send: false,
    requires_approval: false,
    ai_used: false,
    response_content: null,
    template_used: null,
    notifications: [],
    decision_details: { ai_response: 0 },
  })),
}));
import { POST } from '@/app/api/webhooks/twilio/sms/route';

jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: (name: string) => (name === 'x-twilio-signature' ? 'bad-signature' : null),
  })),
}));

jest.mock('@/lib/twilio', () => ({
  validateTwilioSignature: jest.fn(() => false),
  getOrCreateConversation: jest.fn(),
  saveIncomingMessage: jest.fn(),
  handleIncomingWithAI: jest.fn(),
  formatPhoneE164: (s: string) => s,
}));

describe('twilio webhook POST', () => {
  it('rejects missing required fields with 400', async () => {
    const { validateTwilioSignature } = require('@/lib/twilio');
    validateTwilioSignature.mockReturnValueOnce(true);
    const req: any = {
      url: 'http://example.com/api/webhooks/twilio/sms',
      formData: async () => ({
        forEach: () => {},
      }),
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid signature with 403', async () => {
    const req: any = {
      url: 'http://example.com/api/webhooks/twilio/sms',
      formData: async () => ({
        forEach: (fn: (value: string, key: string) => void) => {
          fn('+15551234567', 'From');
          fn('+15557654321', 'To');
          fn('Hello', 'Body');
          fn('SM123', 'MessageSid');
        },
      }),
    };
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
