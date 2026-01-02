import { logSms, smsLogger } from '@/lib/logger';

describe('logger sms redaction', () => {
  it('logs only last 4 digits of phone', () => {
    const spy = jest.spyOn(smsLogger, 'info').mockImplementation(() => {});
    logSms('+15551234567', 'sent', 'biz-1', 'cust-1');
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0] as any;
    expect(arg.to).toBe('4567');
    spy.mockRestore();
  });

  it('logs error with last 4 digits on failure', () => {
    const spy = jest.spyOn(smsLogger, 'error').mockImplementation(() => {});
    logSms('+15559876543', 'failed', 'biz-1', undefined, 'Unit test failure');
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0] as any;
    expect(arg.to).toBe('6543');
    expect(arg.status).toBe('failed');
    spy.mockRestore();
  });
});
