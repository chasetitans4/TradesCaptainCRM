import { formatPhoneE164 } from '@/lib/twilio/sms';

describe('performance phone formatting', () => {
  it('formats 10k numbers under 1000ms', () => {
    const samples = Array.from({ length: 10000 }, (_, i) => `555-000-${String(1000 + i).slice(-4)}`);
    const start = performance.now();
    for (const s of samples) {
      formatPhoneE164(s);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
