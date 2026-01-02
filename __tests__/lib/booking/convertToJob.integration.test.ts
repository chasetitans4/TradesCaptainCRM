let supabaseMock: any;
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => supabaseMock),
}));
import { convertToJob } from '@/lib/booking/requests';

const confirmedRequest = {
  id: 'req-1',
  business_id: 'biz-1',
  customer_id: null,
  customer_name: 'Test User',
  customer_email: 'test@example.com',
  customer_phone: '+15551234567',
  service_type: 'repair',
  description: 'Leaky faucet',
  urgency: 'normal',
  confirmed_date: '2025-01-01',
  confirmed_time: '10:30',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  status: 'confirmed',
};

describe('convertToJob integration', () => {
  it('maps fields to jobs with job_address_* and computes end time', async () => {
    const bookingRequestsQB = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: confirmedRequest }),
      update: jest.fn().mockReturnThis(),
    };

    const customersQB = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'cust-1' } }),
    };

    const jobsQB = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'job-1' } }),
    };

    const bookingRequestsUpdateQB = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };

    supabaseMock = {
      from: (table: string) => {
        if (table === 'booking_requests') {
          return bookingRequestsQB as any;
        }
        if (table === 'customers') {
          return customersQB as any;
        }
        if (table === 'jobs') {
          return jobsQB as any;
        }
        return bookingRequestsUpdateQB as any;
      },
    };

    const result = await convertToJob('req-1', 'user-1', { estimatedDuration: 60 });
    expect(result.success).toBe(true);
    expect(result.jobId).toBe('job-1');
    expect(jobsQB.insert).toHaveBeenCalled();
    const payload = (jobsQB.insert as any).mock.calls[0][0];
    expect(payload.job_address_line1).toBe('123 Main St');
    expect(payload.job_address_city).toBe('Austin');
    expect(payload.job_address_state).toBe('TX');
    expect(payload.job_address_zip).toBe('78701');
    expect(payload.scheduled_time_start).toBe('10:30');
    expect(payload.scheduled_time_end).toBeDefined();
  });
});
