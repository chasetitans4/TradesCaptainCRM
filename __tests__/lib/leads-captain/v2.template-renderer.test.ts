import { describe, it, expect, jest } from '@jest/globals';

describe('LeadsCaptain v2 template renderer', () => {
  it('renderTemplate substitutes variables, conditionals, and truncates', async () => {
    await jest.isolateModulesAsync(async () => {
      const { renderTemplate } = require('@/lib/leads-captain/v2/template-renderer');
      const template = {
        id: 't1',
        config_id: 'cfg',
        name: 'Test',
        template_key: null,
        content: 'Hi {{first_name}} {{#booking_link}}Book: {{booking_link}}{{/booking_link}} {{^price_range}}No prices{{/price_range}} {{missing}}',
        max_length: 320,
        emoji_setting: 'business_default',
        ai_personalization: 'none',
        is_system: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const variables = {
        first_name: 'Alice',
        booking_link: 'https://book.example',
      };
      const res = renderTemplate(template, variables);
      expect(res.content).toContain('Hi Alice Book: https://book.example No prices');
      expect(res.variables_used).toContain('first_name');
      expect(res.missing_variables).toContain('missing');
      const truncated = renderTemplate(template, variables, 10);
      expect(truncated.truncated).toBe(true);
      expect(truncated.content.endsWith('...')).toBe(true);
    });
  });

  it('extractTemplateVariables finds simple and conditional vars', async () => {
    await jest.isolateModulesAsync(async () => {
      const { extractTemplateVariables } = require('@/lib/leads-captain/v2/template-renderer');
      const vars = extractTemplateVariables('Hi {{first_name}} {{#booking_link}}x{{/booking_link}} {{^price_range}}y{{/price_range}}');
      expect(vars).toEqual(expect.arrayContaining(['first_name', 'booking_link', 'price_range']));
    });
  });

  it('buildTemplateVariables derives names and price ranges', async () => {
    await jest.isolateModulesAsync(async () => {
      const { buildTemplateVariables } = require('@/lib/leads-captain/v2/template-renderer');
      const config = {
        business_name: 'Biz',
        owner_name: 'Owner',
        main_phone: '(555) 111-2222',
        emergency_phone: '(555) 111-3333',
        booking_link: 'https://book.example',
        service_area: 'Austin',
        business_hours: { mon: { open: '09:00', close: '17:00', enabled: true }, tue: { open: '09:00', close: '17:00', enabled: true }, wed: { open: '09:00', close: '17:00', enabled: true }, thu: { open: '09:00', close: '17:00', enabled: true }, fri: { open: '09:00', close: '17:00', enabled: true }, sat: { open: null, close: null, enabled: false }, sun: { open: null, close: null, enabled: false } },
        timezone: 'UTC',
      };
      const conv = { customer_name: 'Alice Johnson', customer_phone: '+15550001111' };
      const priceList = [
        { service_name: 'Drain', price_min: 100, price_max: 200, is_active: true },
        { service_name: 'Heater', price_min: 300, is_active: true },
      ];
      const vars = buildTemplateVariables(config, conv, undefined, priceList as any);
      expect(vars.first_name).toBe('Alice');
      expect(vars.customer_phone).toBe('+15550001111');
      expect(typeof vars.next_available).toBe('string');
      expect(vars.price_range).toContain('Drain: $100-$200');
      expect(vars.price_range).toContain('Heater: Starting at $300');
    });
  });

  it('addEmoji respects settings and content', async () => {
    await jest.isolateModulesAsync(async () => {
      const { addEmoji } = require('@/lib/leads-captain/v2/template-renderer');
      expect(addEmoji('thanks for reaching out', 'always', true)).toContain('🙏');
      expect(addEmoji('great news', 'always', true)).toContain('👍');
      expect(addEmoji('hey there!', 'always', true)).toContain('👋');
      expect(addEmoji('Please schedule an appointment', 'always', true)).toContain('📅');
      expect(addEmoji('I apologize', 'always', true)).toBe('I apologize');
      expect(addEmoji('emergency situation', 'always', true)).toBe('emergency situation');
      expect(addEmoji('hello 😊', 'always', true)).toBe('hello 😊');
      expect(addEmoji('hello', 'business_default', false)).toBe('hello');
      expect(addEmoji('hello', 'never', true)).toBe('hello');
    });
  });

  it('validateTemplateSyntax detects errors and warnings', async () => {
    await jest.isolateModulesAsync(async () => {
      const { validateTemplateSyntax } = require('@/lib/leads-captain/v2/template-renderer');
      const bad = validateTemplateSyntax('Hi {{#x}}oops');
      expect(bad.valid).toBe(false);
      expect(bad.errors.length).toBeGreaterThan(0);
      const invalidVar = validateTemplateSyntax('Hello {{first-name}}');
      expect(invalidVar.valid).toBe(false);
      const longWarn = validateTemplateSyntax('x'.repeat(600));
      expect(longWarn.warnings.length).toBeGreaterThan(0);
      const uncommon = validateTemplateSyntax('Hi {{custom_var}}');
      expect(uncommon.warnings.length).toBeGreaterThan(0);
    });
  });

  it('previewTemplate renders with sample data', async () => {
    await jest.isolateModulesAsync(async () => {
      const { previewTemplate } = require('@/lib/leads-captain/v2/template-renderer');
      const res = previewTemplate('Hello {{first_name}}, book at {{booking_link}}');
      expect(res.content).toContain('Hello');
      expect(res.content).toContain('book at');
      expect(res.variables_used).toEqual(expect.arrayContaining(['first_name', 'booking_link']));
    });
  });
});
