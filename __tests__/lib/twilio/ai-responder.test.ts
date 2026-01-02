import { describe, it, expect, jest } from '@jest/globals';

describe('Twilio AI responder', () => {
  it('detects human handoff requests and OpenAI config', async () => {
    await jest.isolateModulesAsync(async () => {
      const { isHumanHandoffRequest, isOpenAIConfigured } = require('@/lib/twilio/ai-responder');
      process.env.OPENAI_API_KEY = 'key';
      expect(isOpenAIConfigured()).toBe(true);
      delete process.env.OPENAI_API_KEY;
      expect(isOpenAIConfigured()).toBe(false);
      expect(isHumanHandoffRequest('Can I talk to a human?')).toBe(true);
      expect(isHumanHandoffRequest('Just a question')).toBe(false);
    });
  });

  it('shouldAutoRespond blocks during quiet hours and allows recent customer initiation', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => {
          const lastRecent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          return {
            from: (table: string) => {
              if (table === 'businesses') {
                return {
                  select: () => ({
                    eq: () => ({
                      single: async () => ({
                        data: {
                          ai_sms_enabled: true,
                          ai_sms_quiet_start: '00:00',
                          ai_sms_quiet_end: '23:59',
                          timezone: 'UTC',
                        },
                      }),
                    }),
                  }),
                };
              }
              if (table === 'sms_conversations') {
                return {
                  select: () => ({
                    eq: () => ({
                      single: async () => ({
                        data: {
                          is_customer_initiated: true,
                          last_customer_message_at: lastRecent,
                        },
                      }),
                    }),
                  }),
                };
              }
              return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
            },
          };
        },
      }));
      const { shouldAutoRespond } = require('@/lib/twilio/ai-responder');
      const res = await shouldAutoRespond('biz1', 'conv1');
      expect(res.canRespond).toBe(true);
    });
  });

  it('shouldAutoRespond returns AI SMS disabled when feature off', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        ai_sms_enabled: false,
                        ai_sms_quiet_start: '00:00',
                        ai_sms_quiet_end: '00:00',
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      const { shouldAutoRespond } = require('@/lib/twilio/ai-responder');
      const res = await shouldAutoRespond('biz1', 'conv1');
      expect(res.canRespond).toBe(false);
      expect(res.reason).toBe('AI SMS disabled');
    });
  });

  it('shouldAutoRespond returns Business not found', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: table === 'businesses' ? null : { is_customer_initiated: false },
                }),
              }),
            }),
          }),
        }),
      }));
      const { shouldAutoRespond } = require('@/lib/twilio/ai-responder');
      const res = await shouldAutoRespond('biz1', 'conv1');
      expect(res.canRespond).toBe(false);
      expect(res.reason).toBe('Business not found');
    });
  });

  it('shouldAutoRespond allows response when outside quiet hours', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        ai_sms_enabled: true,
                        ai_sms_quiet_start: '08:00',
                        ai_sms_quiet_end: '09:00',
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        is_customer_initiated: false,
                        last_customer_message_at: new Date().toISOString(),
                      },
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      const { shouldAutoRespond } = require('@/lib/twilio/ai-responder');
      const res = await shouldAutoRespond('biz-out', 'conv-out');
      expect(res.canRespond).toBe(true);
      jest.useRealTimers();
    });
  });

  it('shouldAutoRespond treats equal quiet start/end as no quiet hours', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:30:00Z'));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        ai_sms_enabled: true,
                        ai_sms_quiet_start: '00:00',
                        ai_sms_quiet_end: '00:00',
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      const { shouldAutoRespond } = require('@/lib/twilio/ai-responder');
      const res = await shouldAutoRespond('biz-eq', 'conv-eq');
      expect(res.canRespond).toBe(true);
      jest.useRealTimers();
    });
  });

  it('shouldAutoRespond blocks when initiated but last message older than 2 hours', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T02:00:00Z'));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        ai_sms_enabled: true,
                        ai_sms_quiet_start: '20:00',
                        ai_sms_quiet_end: '08:00',
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        is_customer_initiated: true,
                        last_customer_message_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                      },
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      const { shouldAutoRespond } = require('@/lib/twilio/ai-responder');
      const res = await shouldAutoRespond('biz-old', 'conv-old');
      expect(res.canRespond).toBe(false);
      expect(res.reason).toBe('quiet_hours');
      jest.useRealTimers();
    });
  });
  it('shouldAutoRespond returns quiet_hours spanning midnight when not initiated', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T02:00:00Z'));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        ai_sms_enabled: true,
                        ai_sms_quiet_start: '20:00',
                        ai_sms_quiet_end: '08:00',
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        is_customer_initiated: false,
                        last_customer_message_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                      },
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      const { shouldAutoRespond } = require('@/lib/twilio/ai-responder');
      const res = await shouldAutoRespond('biz-mid', 'conv-mid');
      expect(res.canRespond).toBe(false);
      expect(res.reason).toBe('quiet_hours');
      jest.useRealTimers();
    });
  });

  it('handleIncomingWithAI sends SMS on normal AI response', async () => {
    await jest.isolateModulesAsync(async () => {
      const sendMock = jest.fn(async () => ({ success: true }));
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'biz-open',
                        name: 'Biz',
                        owner_name: 'Owner',
                        trade_type: 'plumbing',
                        phone: '+15551112222',
                        twilio_phone_number: '+15551112222',
                        business_hours: 'Mon-Fri 9-5',
                        ai_sms_knowledge_base: null,
                        ai_sms_tone: 'friendly',
                        timezone: 'UTC',
                        ai_sms_enabled: true,
                        ai_sms_quiet_start: '00:00',
                        ai_sms_quiet_end: '00:00',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_messages') {
              return {
                select: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({ data: [] }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { ai_response_count: 0 } }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/twilio/sms', () => ({
        sendSMS: sendMock,
        flagForHumanAttention: async () => {},
        formatPhoneDisplay: (p: string) => p,
      }));
      process.env.OPENAI_API_KEY = 'key';
      jest.doMock('openai', () => {
        class OpenAI {
          chat = {
            completions: {
              create: async () => ({
                choices: [{ message: { content: 'Hello! How can I help?' } }],
              }),
            },
          };
          constructor(_opts: any) {}
        }
        return { __esModule: true, default: OpenAI };
      });
      const { handleIncomingWithAI } = require('@/lib/twilio/ai-responder');
      const res = await handleIncomingWithAI('hello', 'conv-open', 'biz-open', '+15550000000');
      expect(res.responded).toBe(true);
      expect(res.response?.toLowerCase()).toContain('hello');
      expect(sendMock).toHaveBeenCalled();
    });
  });
  it('handleIncomingWithAI returns human_handoff', async () => {
    await jest.isolateModulesAsync(async () => {
      const sendMock = jest.fn(async () => ({ success: true }));
      const flagMock = jest.fn(async () => {});
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'biz1',
                        name: 'Biz',
                        owner_name: 'Owner',
                        trade_type: 'plumbing',
                        phone: '+15551112222',
                        twilio_phone_number: '+15551112222',
                        business_hours: 'Mon-Fri 9-5',
                        ai_sms_knowledge_base: null,
                        ai_sms_tone: 'friendly',
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { ai_response_count: 0 } }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/twilio/sms', () => ({
        sendSMS: sendMock,
        flagForHumanAttention: flagMock,
        formatPhoneDisplay: (p: string) => p,
      }));
      process.env.OPENAI_API_KEY = 'key';
      const { handleIncomingWithAI } = require('@/lib/twilio/ai-responder');
      const res = await handleIncomingWithAI('speak to a human', 'conv1', 'biz1', '+15550000000');
      expect(res.responded).toBe(true);
      expect(res.reason).toBe('human_handoff');
      expect(sendMock).toHaveBeenCalled();
      expect(flagMock).toHaveBeenCalled();
    });
  });

  it('handleIncomingWithAI returns limit_reached when AI count high', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'biz1',
                        name: 'Biz',
                        owner_name: 'Owner',
                        trade_type: 'plumbing',
                        phone: '+15551112222',
                        twilio_phone_number: '+15551112222',
                        business_hours: 'Mon-Fri 9-5',
                        ai_sms_knowledge_base: null,
                        ai_sms_tone: 'friendly',
                        timezone: 'UTC',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { ai_response_count: 10 } }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/twilio/sms', () => ({
        sendSMS: async () => ({ success: true }),
        flagForHumanAttention: async () => {},
        formatPhoneDisplay: (p: string) => p,
      }));
      process.env.OPENAI_API_KEY = 'key';
      const { handleIncomingWithAI } = require('@/lib/twilio/ai-responder');
      const res = await handleIncomingWithAI('hello', 'conv1', 'biz1', '+15550000000');
      expect(res.responded).toBe(true);
      expect(res.reason).toBe('limit_reached');
    });
  });

  it('handleIncomingWithAI returns ai_error when OpenAI not configured', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'biz1',
                        name: 'Biz',
                        owner_name: 'Owner',
                        trade_type: 'plumbing',
                        phone: '+15551112222',
                        twilio_phone_number: '+15551112222',
                        business_hours: 'Mon-Fri 9-5',
                        ai_sms_knowledge_base: null,
                        ai_sms_tone: 'friendly',
                        timezone: 'UTC',
                        ai_sms_enabled: true,
                        ai_sms_quiet_start: '00:00',
                        ai_sms_quiet_end: '00:00',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { ai_response_count: 0 } }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/twilio/sms', () => ({
        sendSMS: async () => ({ success: true }),
        flagForHumanAttention: async () => {},
        formatPhoneDisplay: (p: string) => p,
      }));
      delete process.env.OPENAI_API_KEY;
      const { handleIncomingWithAI } = require('@/lib/twilio/ai-responder');
      const res = await handleIncomingWithAI('hello', 'conv1', 'biz1', '+15550000000');
      expect(res.responded).toBe(false);
      expect(res.reason).toBe('ai_error');
    });
  });

  it('handleIncomingWithAI returns quiet_hours when in quiet and not initiated', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: 'biz1',
                        name: 'Biz',
                        owner_name: 'Owner',
                        trade_type: 'plumbing',
                        phone: '+15551112222',
                        twilio_phone_number: '+15551112222',
                        business_hours: 'Mon-Fri 9-5',
                        ai_sms_knowledge_base: null,
                        ai_sms_tone: 'friendly',
                        timezone: 'UTC',
                        ai_sms_enabled: true,
                        ai_sms_quiet_start: '00:00',
                        ai_sms_quiet_end: '23:59',
                      },
                    }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        is_customer_initiated: false,
                        last_customer_message_at: new Date().toISOString(),
                      },
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('@/lib/twilio/sms', () => ({
        sendSMS: async () => ({ success: true }),
        flagForHumanAttention: async () => {},
        formatPhoneDisplay: (p: string) => p,
      }));
      process.env.OPENAI_API_KEY = 'key';
      const { handleIncomingWithAI } = require('@/lib/twilio/ai-responder');
      const res = await handleIncomingWithAI('hello', 'conv1', 'biz1', '+15550000000');
      expect(res.responded).toBe(false);
      expect(res.reason).toBe('quiet_hours');
    });
  });

  it('handleIncomingWithAI returns Business not found when missing', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'businesses') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null }),
                  }),
                }),
              };
            }
            if (table === 'sms_conversations') {
              return {
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: { ai_response_count: 0 } }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      const { handleIncomingWithAI } = require('@/lib/twilio/ai-responder');
      const res = await handleIncomingWithAI('hello', 'conv1', 'biz1', '+15550000000');
      expect(res.responded).toBe(false);
      expect(res.reason).toBe('Business not found');
    });
  });

  it('generateAIResponse uses formatted business hours object', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.OPENAI_API_KEY = 'key';
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'sms_messages') {
              return {
                select: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: (_n: number) => ({ data: [] }),
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('openai', () => {
        class OpenAI {
          chat = {
            completions: {
              create: async () => ({
                choices: [{ message: { content: 'OK' } }],
              }),
            },
          };
          constructor(_opts: any) {}
        }
        return { __esModule: true, default: OpenAI };
      });
      jest.doMock('@/lib/twilio/sms', () => ({
        formatPhoneDisplay: (p: string) => p,
      }));
      const { generateAIResponse } = require('@/lib/twilio/ai-responder');
      const business = {
        id: 'bizX',
        name: 'BizX',
        owner_name: 'Owner',
        trade_type: 'hvac',
        phone: '+15551112222',
        twilio_phone_number: '+15551112222',
        business_hours: { mon: { start: '09:00', end: '17:00' }, wed: { start: '09:00', end: '17:00' } },
        ai_sms_knowledge_base: null,
        ai_sms_tone: 'professional',
        timezone: 'UTC',
      };
      const res = await generateAIResponse('hello', 'convX', business);
      expect(typeof res).toBe('string');
      expect(res.length).toBeGreaterThan(0);
    });
  });

  it('generateAIResponse falls back when no choices returned', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.OPENAI_API_KEY = 'key';
      jest.doMock('@/lib/supabase/server', () => ({
        createAdminClient: () => ({
          from: (table: string) => {
            if (table === 'sms_messages') {
              return {
                select: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: (_n: number) => ({ data: [] }),
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
          },
        }),
      }));
      jest.doMock('openai', () => {
        class OpenAI {
          chat = {
            completions: {
              create: async () => ({
                choices: [],
              }),
            },
          };
          constructor(_opts: any) {}
        }
        return { __esModule: true, default: OpenAI };
      });
      jest.doMock('@/lib/twilio/sms', () => ({
        formatPhoneDisplay: (p: string) => p,
      }));
      const { generateAIResponse } = require('@/lib/twilio/ai-responder');
      const business = {
        id: 'bizY',
        name: 'BizY',
        owner_name: 'Owner',
        trade_type: 'hvac',
        phone: '+15551112222',
        twilio_phone_number: '+15551112222',
        business_hours: {},
        ai_sms_knowledge_base: null,
        ai_sms_tone: 'professional',
        timezone: 'UTC',
      };
      const res = await generateAIResponse('hello', 'convY', business);
      expect(res.toLowerCase()).toContain("i'm sorry");
    });
  });
});
