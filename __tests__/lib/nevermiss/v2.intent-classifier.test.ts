import { describe, it, expect, jest } from '@jest/globals';

describe('NeverMiss v2 intent-classifier', () => {
  it('classifyIntent detects compliance keywords without AI', async () => {
    await jest.isolateModulesAsync(async () => {
      const { classifyIntent } = require('@/lib/nevermiss/v2/intent-classifier');
      const opts = { enabled_intents: [] };
      const stop = await classifyIntent('STOP', opts);
      expect(stop.is_compliance).toBe(true);
      expect(stop.intent).toBe('opt_out');
      const help = await classifyIntent('HELP', opts);
      expect(help.is_compliance).toBe(true);
      expect(help.intent).toBe('help');
      const start = await classifyIntent('START', opts);
      expect(start.is_compliance).toBe(true);
      expect(start.intent).toBe('opt_in');
    });
  });

  it('fallbackClassification covers multiple branches when OpenAI unavailable', async () => {
    await jest.isolateModulesAsync(async () => {
      delete process.env.OPENAI_API_KEY;
      const { classifyIntent } = require('@/lib/nevermiss/v2/intent-classifier');
      const intents = [
        { intent_code: 'pricing', intent_label: 'Pricing', example_phrases: ['price'], enabled: true },
        { intent_code: 'schedule', intent_label: 'Schedule', example_phrases: ['schedule'], enabled: true },
      ];
      const refund = await classifyIntent('This is awful, I want a refund', { enabled_intents: intents });
      expect(refund.intent).toBe('refund');
      expect(refund.sentiment).toBe('angry');
      const complaint = await classifyIntent('Terrible service, will report to BBB', { enabled_intents: intents });
      expect(complaint.intent).toBe('complaint');
      const wrong = await classifyIntent('Sorry, wrong number', { enabled_intents: intents });
      expect(wrong.intent).toBe('wrong_number');
      const bot = await classifyIntent('Are you a bot or a real person?', { enabled_intents: intents });
      expect(bot.intent).toBe('bot_check');
      const emergency = await classifyIntent('Emergency! Burst pipe with flooding', { enabled_intents: intents });
      expect(emergency.intent).toBe('emergency');
      const pricing = await classifyIntent('How much does it cost? I need a quote', { enabled_intents: intents });
      expect(pricing.intent).toBe('pricing');
      const schedule = await classifyIntent('Can I schedule an appointment?', { enabled_intents: intents });
      expect(schedule.intent).toBe('schedule');
    });
  });

  it('classifyIntent returns general when no intents enabled and not compliance', async () => {
    await jest.isolateModulesAsync(async () => {
      delete process.env.OPENAI_API_KEY;
      const { classifyIntent } = require('@/lib/nevermiss/v2/intent-classifier');
      const res = await classifyIntent('Hello there', { enabled_intents: [] });
      expect(res.intent).toBe('general');
      expect(res.is_compliance).toBe(false);
    });
  });

  it('extractCustomerName detects names from common patterns', async () => {
    await jest.isolateModulesAsync(async () => {
      const { extractCustomerName } = require('@/lib/nevermiss/v2/intent-classifier');
      expect(extractCustomerName('My name is Alice Johnson')).toBe('Alice Johnson');
      expect(extractCustomerName("I'm Bob")).toBe('Bob');
      expect(extractCustomerName('Charlie here, following up')).toBe('Charlie');
      expect(extractCustomerName('Hello, this is Dana')).toBe('Dana');
      expect(extractCustomerName('No name present')).toBeNull();
    });
  });

  it('detectUrgency maps messages to emergency/high/medium/low', async () => {
    await jest.isolateModulesAsync(async () => {
      const { detectUrgency } = require('@/lib/nevermiss/v2/intent-classifier');
      expect(detectUrgency('Emergency! gas leak')).toBe('emergency');
      expect(detectUrgency('Please come today or tonight')).toBe('high');
      expect(detectUrgency('No rush, just need a quote')).toBe('low');
      expect(detectUrgency('Following up about a service')).toBe('medium');
    });
  });

  it('classifyIntent uses OpenAI when available and validates sentiment', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      jest.doMock('openai', () => ({
        __esModule: true,
        default: class {
          chat = {
            completions: {
              create: jest.fn().mockResolvedValue({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        intent: 'pricing',
                        confidence: 92,
                        sentiment: 'furious',
                        language: 'en',
                        entities: { name: 'Alice' },
                      }),
                    },
                  },
                ],
              }),
            },
          };
          constructor() {}
        },
      }));
      const { classifyIntent } = require('@/lib/nevermiss/v2/intent-classifier');
      const res = await classifyIntent('How much is a water heater?', {
        enabled_intents: [{ intent_code: 'pricing', intent_label: 'Pricing', enabled: true, example_phrases: ['price'] }],
      });
      expect(res.intent).toBe('pricing');
      expect(res.confidence).toBeGreaterThanOrEqual(90);
      expect(res.sentiment).toBe('neutral');
      expect(res.entities).toEqual(expect.objectContaining({ name: 'Alice' }));
    });
  });
});
