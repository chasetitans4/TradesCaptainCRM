import { describe, it, expect, jest } from '@jest/globals';

describe('lib/nevermiss v2 guardrails and classifier', () => {
  it('removes time promises and adds booking link when appropriate', async () => {
    await jest.isolateModulesAsync(async () => {
      const { applyGuardrails } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: 'https://book.example', owner_name: 'Owner' };
      const options = {
        creativity_level: 'low',
        max_length: 200,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const classification = { intent: 'schedule', sentiment: 'neutral', confidence: 70, language: 'en', entities: {}, is_compliance: false };
      const r1 = applyGuardrails('We will be there tomorrow at 3pm.', config, options, classification);
      expect(r1.text).toContain('will reach out to schedule');
      const r2 = applyGuardrails('Can we schedule?', config, options, classification);
      expect(r2.text).toContain('Book online: https://book.example');
    });
  });

  it('applyGuardrails truncates length, qualifies pricing, removes emojis, adds empathy', async () => {
    await jest.isolateModulesAsync(async () => {
      const { applyGuardrails } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: 'https://book.example', owner_name: 'Owner' };
      const baseOptions = {
        creativity_level: 'low',
        max_length: 40,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'ranges',
        templates_for_reference: [],
        price_list: [],
      };
      const clsNeutral = { intent: 'general', sentiment: 'neutral', confidence: 70, language: 'en', entities: {}, is_compliance: false };
      const long = applyGuardrails('This is a very long response that should be truncated at a word boundary to fit.', config, baseOptions, clsNeutral);
      expect(long.applied).toContain('length_truncated');
      const pricing = applyGuardrails('The price is $100 flat', config, baseOptions, clsNeutral);
      expect(pricing.applied).toContain('pricing_qualified');
      const emojis = applyGuardrails('Hello 😊 thanks!', config, baseOptions, clsNeutral);
      expect(emojis.applied).toContain('emojis_removed');
      const angryCls = { ...clsNeutral, sentiment: 'angry' };
      const empathy = applyGuardrails('We will follow up shortly.', config, baseOptions, angryCls);
      expect(empathy.applied).toContain('empathy_added');
      expect(empathy.text.toLowerCase().startsWith("i'm sorry")).toBe(true);
    });
  });

  it('applyGuardrails truncates at sentence boundary when appropriate', async () => {
    await jest.isolateModulesAsync(async () => {
      const { applyGuardrails } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: null, owner_name: 'Owner' };
      const options = {
        creativity_level: 'low',
        max_length: 80,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const cls = { intent: 'general', sentiment: 'neutral', confidence: 80, language: 'en', entities: {}, is_compliance: false };
      const text = 'This first sentence is fairly long and should be cut at this point. Then additional content continues further beyond the limit and would be truncated.';
      const res = applyGuardrails(text, config, options, cls);
      expect(res.applied).toContain('length_truncated');
      expect(res.text.endsWith('.')).toBe(true);
      expect(res.text.endsWith('...')).toBe(false);
    });
  });

  it('applyGuardrails truncates at word boundary when no sentence break', async () => {
    await jest.isolateModulesAsync(async () => {
      const { applyGuardrails } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: null, owner_name: 'Owner' };
      const options = {
        creativity_level: 'low',
        max_length: 60,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const cls = { intent: 'general', sentiment: 'neutral', confidence: 80, language: 'en', entities: {}, is_compliance: false };
      const text = 'A long string of words without sentence breaks that should result in word boundary truncation to ensure readability';
      const res = applyGuardrails(text, config, options, cls);
      expect(res.applied).toContain('length_truncated');
      expect(res.text.endsWith('...')).toBe(true);
    });
  });

  it('flags inappropriate content for review', async () => {
    await jest.isolateModulesAsync(async () => {
      const { applyGuardrails } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: null, owner_name: 'Owner' };
      const options = {
        creativity_level: 'low',
        max_length: 200,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const cls = { intent: 'general', sentiment: 'neutral', confidence: 75, language: 'en', entities: {}, is_compliance: false };
      const res = applyGuardrails('We are better than any competitor and will sue you.', config, options, cls);
      expect(res.applied).toContain('flagged_inappropriate');
    });
  });

  it('does not add booking link when length would exceed limit', async () => {
    await jest.isolateModulesAsync(async () => {
      const { applyGuardrails } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: 'https://book.example', owner_name: 'Owner' };
      const options = {
        creativity_level: 'low',
        max_length: 40,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const cls = { intent: 'schedule', sentiment: 'neutral', confidence: 80, language: 'en', entities: {}, is_compliance: false };
      const text = 'Please schedule an appointment at your earliest convenience';
      const res = applyGuardrails(text, config, options, cls);
      expect(res.applied).not.toContain('booking_link_added');
    });
  });

  it('detects urgency levels', async () => {
    await jest.isolateModulesAsync(async () => {
      const { detectUrgency } = require('@/lib/nevermiss/v2/intent-classifier');
      expect(detectUrgency('This is an emergency with flooding')).toBe('emergency');
      expect(detectUrgency('no rush, just a quote')).toBe('low');
      expect(detectUrgency('today if possible')).toBe('high');
    });
  });

  it('generateAIResponse throws on non-text content', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          __esModule: true,
          default: class Anthropic {
            messages = {
              create: async () => ({
                content: [{ type: 'tool_use', text: undefined }],
                usage: { input_tokens: 10, output_tokens: 5 },
              }),
            };
          },
        };
      });
      const { generateAIResponse } = require('@/lib/nevermiss/v2/guardrails');
      const config = {
        business_name: 'Biz',
        tone: 'friendly_professional',
        ai_confidence_threshold: 70,
        require_approval: 'never',
      };
      const classification = { intent: 'general', sentiment: 'neutral', confidence: 70, language: 'en', entities: {}, is_compliance: false };
      const options = {
        creativity_level: 'low',
        max_length: 200,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      await expect(generateAIResponse('Hi', classification, config, null, [], options)).rejects.toThrow();
    });
  });

  it('requiresApproval respects config options', async () => {
    await jest.isolateModulesAsync(async () => {
      const { requiresApproval } = require('@/lib/nevermiss/v2/guardrails');
      const baseConfig = {
        ai_confidence_threshold: 70,
        require_approval: 'never',
      };
      const cls = { intent: 'general', sentiment: 'neutral', confidence: 80 };
      expect(requiresApproval({ ...baseConfig, require_approval: 'all' }, 80, false, cls)).toBe(true);
      expect(requiresApproval({ ...baseConfig, require_approval: 'first_message' }, 80, true, cls)).toBe(true);
      expect(requiresApproval({ ...baseConfig, require_approval: 'first_message' }, 80, false, cls)).toBe(false);
      expect(requiresApproval({ ...baseConfig, require_approval: 'low_confidence' }, 60, false, cls)).toBe(true);
      expect(requiresApproval({ ...baseConfig, require_approval: 'low_confidence' }, 80, false, { ...cls, sentiment: 'angry' })).toBe(true);
      expect(requiresApproval({ ...baseConfig, require_approval: 'never' }, 80, false, cls)).toBe(false);
      expect(requiresApproval({ ...baseConfig, require_approval: 'low_confidence' }, 90, false, { ...cls, intent: 'complaint' })).toBe(true);
      expect(requiresApproval({ ...baseConfig, require_approval: 'low_confidence' }, 90, false, { ...cls, intent: 'refund' })).toBe(true);
    });
  });

  it('generateAIResponse uses mocked Anthropic and applies guardrails', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          __esModule: true,
          default: class Anthropic {
            messages = {
              create: async () => ({
                content: [{ type: 'text', text: 'We will be there at 3pm. 😊' }],
                usage: { input_tokens: 100, output_tokens: 50 },
              }),
            };
          },
        };
      });
      const { generateAIResponse } = require('@/lib/nevermiss/v2/guardrails');
      const config = {
        business_name: 'Biz',
        business_type: 'plumbing',
        owner_name: 'Owner',
        service_area: 'Area',
        booking_link: 'https://book.example',
        tone: 'friendly_professional',
        ai_confidence_threshold: 70,
        require_approval: 'never',
      };
      const classification = { intent: 'schedule', sentiment: 'neutral', confidence: 75, language: 'en', entities: {}, is_compliance: false };
      const history = [];
      const options = {
        creativity_level: 'low',
        max_length: 200,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const res = await generateAIResponse('Can we schedule?', classification, config, null, history, options);
      expect(res.model).toContain('claude');
      expect(res.guardrails_applied).toContain('time_promise_removed');
      expect(res.guardrails_applied).toContain('booking_link_added');
      expect(typeof res.confidence).toBe('number');
      expect(res.tokens_used).toBeGreaterThan(0);
    });
  });

  it('calculateConfidence adjusts for low confidence', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          __esModule: true,
          default: class Anthropic {
            messages = {
              create: async () => ({
                content: [{ type: 'text', text: 'This is a moderately long response that avoids being considered short.' }],
                usage: { input_tokens: 10, output_tokens: 5 },
              }),
            };
          },
        };
      });
      const { generateAIResponse } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', tone: 'friendly_professional', ai_confidence_threshold: 70, require_approval: 'never' };
      const options = {
        creativity_level: 'low',
        max_length: 200,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const low = await generateAIResponse('Hi', { intent: 'general', sentiment: 'neutral', confidence: 55, language: 'en', entities: {}, is_compliance: false }, config, null, [], options);
      expect(low.confidence).toBe(45);
    });
  });

  it('calculateConfidence adjusts for angry short responses', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          __esModule: true,
          default: class Anthropic {
            messages = {
              create: async () => ({
                content: [{ type: 'text', text: 'Short reply' }],
                usage: { input_tokens: 10, output_tokens: 5 },
              }),
            };
          },
        };
      });
      const { generateAIResponse } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', tone: 'friendly_professional', ai_confidence_threshold: 70, require_approval: 'never' };
      const options = {
        creativity_level: 'low',
        max_length: 200,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const angryShort = await generateAIResponse('Hi', { intent: 'general', sentiment: 'angry', confidence: 80, language: 'en', entities: {}, is_compliance: false }, config, null, [], options);
      expect(angryShort.confidence).toBe(60);
    });
  });

  it('calculateConfidence adjusts for very long responses', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      jest.doMock('@anthropic-ai/sdk', () => {
        return {
          __esModule: true,
          default: class Anthropic {
            messages = {
              create: async () => ({
                content: [{ type: 'text', text: 'X'.repeat(350) }],
                usage: { input_tokens: 20, output_tokens: 330 },
              }),
            };
          },
        };
      });
      const { generateAIResponse } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', tone: 'friendly_professional', ai_confidence_threshold: 70, require_approval: 'never' };
      const options = {
        creativity_level: 'low',
        max_length: 500,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'never',
        templates_for_reference: [],
        price_list: [],
      };
      const res = await generateAIResponse('Hi', { intent: 'general', sentiment: 'neutral', confidence: 80, language: 'en', entities: {}, is_compliance: false }, config, null, [], options);
      expect(res.confidence).toBe(75);
    });
  });

  it('buildSystemPrompt includes pricing and templates context', async () => {
    await jest.isolateModulesAsync(async () => {
      const { buildSystemPrompt } = require('@/lib/nevermiss/v2/guardrails');
      const config = {
        business_name: 'Biz',
        business_type: 'plumbing',
        owner_name: 'Owner',
        service_area: 'Area',
        booking_link: 'https://book.example',
      };
      const classification = { intent: 'pricing', sentiment: 'neutral', confidence: 80, language: 'en', entities: {}, is_compliance: false };
      const templates_for_reference = [{ name: 'Welcome', content: 'Hello there! This is a sample template content that is a bit long to ensure slicing logic works properly when exceeding one hundred characters in length.' }];
      const price_list = [{ service_name: 'Drain', price_min: 100, price_max: 200, is_active: true }];
      const prompt = buildSystemPrompt(config, classification, {
        creativity_level: 'low',
        max_length: 160,
        tone: 'friendly_professional',
        use_emojis: true,
        pricing_mode: 'specific',
        templates_for_reference,
        price_list,
      });
      expect(prompt).toContain('You may share these specific prices');
      expect(prompt).toContain('Provide booking link (https://book.example)');
      expect(prompt).toContain('Here are example response styles');
      expect(prompt).toContain('Use 1-2 appropriate emojis per message');
    });
  });

  it('buildSystemPrompt includes fallback pricing when specific mode has no price list', async () => {
    await jest.isolateModulesAsync(async () => {
      const { buildSystemPrompt } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: null, owner_name: 'Owner' };
      const classification = { intent: 'pricing', sentiment: 'neutral', confidence: 85, language: 'en', entities: {}, is_compliance: false };
      const prompt = buildSystemPrompt(config, classification, {
        creativity_level: 'low',
        max_length: 140,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'specific',
        templates_for_reference: [],
        price_list: [],
      });
      expect(prompt).toContain('PRICING: No price list available. If asked about pricing, offer to have someone provide a specific quote.');
    });
  });

  it('buildSystemPrompt uses default pricing instructions when mode is default', async () => {
    await jest.isolateModulesAsync(async () => {
      const { buildSystemPrompt } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: null, owner_name: 'Owner' };
      const classification = { intent: 'pricing', sentiment: 'neutral', confidence: 80, language: 'en', entities: {}, is_compliance: false };
      const prompt = buildSystemPrompt(config, classification, {
        creativity_level: 'low',
        max_length: 160,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'default',
        templates_for_reference: [],
        price_list: [],
      });
      expect(prompt).toContain('PRICING: Be conservative with pricing.');
    });
  });

  it('buildSystemPrompt includes ranges instructions when pricing mode is ranges with list', async () => {
    await jest.isolateModulesAsync(async () => {
      const { buildSystemPrompt } = require('@/lib/nevermiss/v2/guardrails');
      const config = { business_name: 'Biz', booking_link: null, owner_name: 'Owner' };
      const classification = { intent: 'pricing', sentiment: 'neutral', confidence: 80, language: 'en', entities: {}, is_compliance: false };
      const price_list = [
        { service_name: 'Drain', price_min: 100, price_max: 200, is_active: true },
        { service_name: 'Water Heater', price_min: 800, price_max: 1500, is_active: true },
      ];
      const prompt = buildSystemPrompt(config, classification, {
        creativity_level: 'low',
        max_length: 160,
        tone: 'friendly_professional',
        use_emojis: false,
        pricing_mode: 'ranges',
        templates_for_reference: [],
        price_list,
      });
      expect(prompt).toContain('PRICING: You may give general price RANGES only.');
      expect(prompt).toContain('Drain: $100-$200');
    });
  });

  it('extracts customer name from text', async () => {
    await jest.isolateModulesAsync(async () => {
      const { extractCustomerName } = require('@/lib/nevermiss/v2/intent-classifier');
      expect(extractCustomerName("Hi, I'm John")).toBe('John');
      expect(extractCustomerName('Quote please')).toBeNull();
    });
  });

  it('classifies intent with fallback when OpenAI unavailable', async () => {
    await jest.isolateModulesAsync(async () => {
      delete process.env.OPENAI_API_KEY;
      const { classifyIntent } = require('@/lib/nevermiss/v2/intent-classifier');
      const intents = [
        { code: 'pricing', label: 'Pricing', examples: ['price'], enabled: true },
        { code: 'schedule', label: 'Schedule', examples: ['schedule'], enabled: true },
      ];
      const result = await classifyIntent('How much is the service?', { enabled_intents: intents });
      expect(result.intent).toBe('pricing');
      expect(result.is_compliance).toBe(false);
    });
  });
});
