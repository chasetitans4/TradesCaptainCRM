import { describe, it, expect, jest } from '@jest/globals';

describe('Twilio phone numbers provisioning', () => {
  it('lists available numbers and maps capabilities', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          availablePhoneNumbers: () => ({
            local: {
              list: async () => [
                {
                  phoneNumber: '+15551234567',
                  friendlyName: 'Austin Number',
                  locality: 'Austin',
                  region: 'TX',
                  capabilities: { sms: true, mms: false, voice: true },
                },
              ],
            },
          }),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      const { listAvailableNumbers } = require('@/lib/twilio/phone-numbers');
      const res = await listAvailableNumbers('512', 1);
      expect(res.length).toBe(1);
      expect(res[0].phone_number).toBe('+15551234567');
      expect(res[0].capabilities.sms).toBe(true);
      expect(res[0].capabilities.mms).toBe(false);
      expect(res[0].capabilities.voice).toBe(true);
    });
  });

  it('listAvailableNumbers throws on client error', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          availablePhoneNumbers: () => ({
            local: {
              list: async () => {
                throw new Error('Twilio error');
              },
            },
          }),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      const { listAvailableNumbers } = require('@/lib/twilio/phone-numbers');
      await expect(listAvailableNumbers('512', 1)).rejects.toThrow();
    });
  });

  it('provisions phone number and updates business', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          incomingPhoneNumbers: {
            create: async (_opts: any) => ({
              phoneNumber: '+15559998888',
              sid: 'PN123',
            }),
            remove: async () => {},
          },
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (_table: string) => ({
            update: (_rec: any) => ({
              eq: (_f: string, _v: any) => Promise.resolve({ error: null }),
            }),
          }),
        }),
      }));
      const { provisionPhoneNumber } = require('@/lib/twilio/phone-numbers');
      const res = await provisionPhoneNumber('+15559998888', 'biz1');
      expect(res.phoneNumber).toBe('+15559998888');
      expect(res.phoneSid).toBe('PN123');
    });
  });

  it('provisionPhoneNumber releases number on DB update error', async () => {
    await jest.isolateModulesAsync(async () => {
      const removeMock = jest.fn(async () => {});
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          incomingPhoneNumbers: Object.assign(
            (sid: string) => ({
              remove: removeMock,
            }),
            {
              create: async (_opts: any) => ({
                phoneNumber: '+15558887777',
                sid: 'PN999',
              }),
            }
          ),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (_table: string) => ({
            update: (_rec: any) => ({
              eq: (_f: string, _v: any) =>
                Promise.resolve({ error: { message: 'db error' } }),
            }),
          }),
        }),
      }));
      const { provisionPhoneNumber } = require('@/lib/twilio/phone-numbers');
      await expect(provisionPhoneNumber('+15558887777', 'biz1')).rejects.toThrow();
      expect(removeMock).toHaveBeenCalled();
    });
  });

  it('releases phone number and clears business fields', async () => {
    await jest.isolateModulesAsync(async () => {
      const removeMock = jest.fn(async () => {});
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          incomingPhoneNumbers: (sid: string) => ({
            remove: removeMock,
          }),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (_table: string) => ({
            update: (_rec: any) => ({
              eq: (_f: string, _v: any) => Promise.resolve({}),
            }),
          }),
        }),
      }));
      const { releasePhoneNumber } = require('@/lib/twilio/phone-numbers');
      await expect(releasePhoneNumber('PN123', 'biz1')).resolves.toBeUndefined();
      expect(removeMock).toHaveBeenCalled();
    });
  });

  it('updatePhoneWebhooks throws on client error', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          incomingPhoneNumbers: (_sid: string) => ({
            update: async () => {
              throw new Error('update error');
            },
          }),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      const { updatePhoneWebhooks } = require('@/lib/twilio/phone-numbers');
      await expect(updatePhoneWebhooks('PN777')).rejects.toThrow();
    });
  });

  it('updatePhoneWebhooks updates successfully', async () => {
    await jest.isolateModulesAsync(async () => {
      const updateMock = jest.fn(async () => ({}));
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          incomingPhoneNumbers: (_sid: string) => ({
            update: updateMock,
          }),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      const { updatePhoneWebhooks } = require('@/lib/twilio/phone-numbers');
      await expect(updatePhoneWebhooks('PN777')).resolves.toBeUndefined();
      expect(updateMock).toHaveBeenCalled();
    });
  });
  it('releasePhoneNumber throws on Twilio remove error', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          incomingPhoneNumbers: (sid: string) => ({
            remove: async () => {
              throw new Error('remove failed');
            },
          }),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      const { releasePhoneNumber } = require('@/lib/twilio/phone-numbers');
      await expect(releasePhoneNumber('PNERR', 'biz1')).rejects.toThrow();
    });
  });

  it('provisionPhoneNumber throws when Twilio create fails', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          incomingPhoneNumbers: {
            create: async () => {
              throw new Error('create failed');
            },
          },
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      const { provisionPhoneNumber } = require('@/lib/twilio/phone-numbers');
      await expect(provisionPhoneNumber('+15550000000', 'biz1')).rejects.toThrow();
    });
  });

  it('listAvailableNumbers maps default capabilities when missing', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/twilio/client', () => ({
        twilioClient: {
          availablePhoneNumbers: () => ({
            local: {
              list: async () => [
                {
                  phoneNumber: '+15551230000',
                  friendlyName: 'No Caps',
                  locality: undefined,
                  region: undefined,
                  capabilities: undefined,
                },
              ],
            },
          }),
        },
        getWebhookUrl: (path: string) => `https://example.com${path}`,
      }));
      const { listAvailableNumbers } = require('@/lib/twilio/phone-numbers');
      const res = await listAvailableNumbers('512', 1);
      expect(res[0].capabilities.sms).toBe(false);
      expect(res[0].capabilities.mms).toBe(false);
      expect(res[0].capabilities.voice).toBe(false);
      expect(res[0].locality).toBeNull();
      expect(res[0].region).toBeNull();
    });
  });
});
