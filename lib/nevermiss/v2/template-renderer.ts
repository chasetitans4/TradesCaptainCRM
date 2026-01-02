// =====================================================
// NeverMiss v2.0 Template Renderer
// Mustache-style variable substitution
// =====================================================

import {
  NevermissTemplate,
  NevermissConfig,
  NevermissConversation,
  TemplateVariables,
  RenderedTemplate,
  NevermissPriceItem,
} from '@/types/nevermiss';
import { getNextAvailableTime } from './rule-engine';

/**
 * Render a template with variable substitution
 * Supports:
 * - Simple variables: {{variable_name}}
 * - Conditional blocks: {{#variable}}...{{/variable}} (renders if truthy)
 * - Inverted blocks: {{^variable}}...{{/variable}} (renders if falsy)
 */
export function renderTemplate(
  template: NevermissTemplate,
  variables: TemplateVariables,
  maxLength?: number
): RenderedTemplate {
  const content = template.content;
  const maxLen = maxLength || template.max_length || 320;

  const variablesUsed: string[] = [];
  const missingVariables: string[] = [];

  // First, find all variables in the template
  const allVariables = extractTemplateVariables(content);

  // Process conditional blocks first
  let rendered = processConditionalBlocks(content, variables);

  // Then substitute simple variables
  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in variables && variables[varName] !== undefined && variables[varName] !== null) {
      variablesUsed.push(varName);
      return String(variables[varName]);
    }
    missingVariables.push(varName);
    return ''; // Remove unmatched variables
  });

  // Clean up any double spaces or trailing spaces
  rendered = rendered.replace(/\s+/g, ' ').trim();

  // Truncate if necessary
  const originalLength = rendered.length;
  let truncated = false;
  if (rendered.length > maxLen) {
    // Try to truncate at word boundary
    rendered = truncateAtWord(rendered, maxLen);
    truncated = true;
  }

  return {
    content: rendered,
    variables_used: variablesUsed,
    missing_variables: missingVariables.filter(v => !variablesUsed.includes(v)),
    truncated,
    original_length: originalLength,
  };
}

/**
 * Process conditional blocks in template
 * {{#variable}}content{{/variable}} - renders if variable is truthy
 * {{^variable}}content{{/variable}} - renders if variable is falsy
 */
function processConditionalBlocks(
  content: string,
  variables: TemplateVariables
): string {
  let result = content;

  // Process positive conditionals {{#var}}...{{/var}}
  result = result.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, varName, innerContent) => {
      const value = variables[varName];
      // Check if value is truthy (exists and not empty)
      if (value !== undefined && value !== null && value !== '' && value !== 'false') {
        return innerContent;
      }
      return '';
    }
  );

  // Process negative conditionals {{^var}}...{{/var}}
  result = result.replace(
    /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, varName, innerContent) => {
      const value = variables[varName];
      // Check if value is falsy (doesn't exist or empty)
      if (value === undefined || value === null || value === '' || value === 'false') {
        return innerContent;
      }
      return '';
    }
  );

  return result;
}

/**
 * Extract all variable names from a template
 */
export function extractTemplateVariables(content: string): string[] {
  const variables: Set<string> = new Set();

  // Simple variables
  const simpleMatches = content.matchAll(/\{\{(\w+)\}\}/g);
  for (const match of simpleMatches) {
    variables.add(match[1]);
  }

  // Conditional block variables
  const conditionalMatches = content.matchAll(/\{\{[#^](\w+)\}\}/g);
  for (const match of conditionalMatches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Truncate text at word boundary
 */
function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // Leave room for ellipsis
  const targetLength = maxLength - 3;

  // Find last space before target length
  const lastSpace = text.lastIndexOf(' ', targetLength);

  if (lastSpace > 0) {
    return text.slice(0, lastSpace) + '...';
  }

  // No space found, just truncate
  return text.slice(0, targetLength) + '...';
}

/**
 * Build template variables from context
 */
export function buildTemplateVariables(
  config: NevermissConfig,
  conversation: NevermissConversation | null,
  customerName?: string,
  priceList?: NevermissPriceItem[]
): TemplateVariables {
  const variables: TemplateVariables = {
    // Business variables
    business_name: config.business_name,
    owner_name: config.owner_name || config.business_name,
    main_phone: config.main_phone || '',
    emergency_phone: config.emergency_phone || config.main_phone || '',
    booking_link: config.booking_link || '',
    service_area: config.service_area || '',

    // Time variables
    next_available: getNextAvailableTime(config.business_hours, config.timezone),
    current_time: new Date().toLocaleTimeString('en-US', {
      timeZone: config.timezone,
      hour: 'numeric',
      minute: '2-digit',
    }),
  };

  // Customer variables
  if (customerName) {
    variables.customer_name = customerName;
    variables.first_name = customerName.split(' ')[0];
  } else if (conversation?.customer_name) {
    variables.customer_name = conversation.customer_name;
    variables.first_name = conversation.customer_name.split(' ')[0];
  }

  if (conversation?.customer_phone) {
    variables.customer_phone = conversation.customer_phone;
  }

  // Price range (if price list provided)
  if (priceList && priceList.length > 0) {
    const prices = priceList
      .filter(p => p.is_active && (p.price_min || p.price_max))
      .slice(0, 3)
      .map(p => {
        if (p.price_min && p.price_max) {
          return `${p.service_name}: $${p.price_min}-$${p.price_max}`;
        }
        if (p.price_min) {
          return `${p.service_name}: Starting at $${p.price_min}`;
        }
        if (p.price_max) {
          return `${p.service_name}: Up to $${p.price_max}`;
        }
        return null;
      })
      .filter(Boolean);

    if (prices.length > 0) {
      variables.price_range = prices.join(', ');
    }
  }

  return variables;
}

/**
 * Preview a template with sample data
 */
export function previewTemplate(
  templateContent: string,
  sampleData?: Record<string, string>
): RenderedTemplate {
  const defaultSampleData: TemplateVariables = {
    business_name: 'ABC Plumbing',
    owner_name: 'John Smith',
    main_phone: '(555) 123-4567',
    emergency_phone: '(555) 987-6543',
    booking_link: 'https://example.com/book',
    service_area: 'Austin metro area',
    first_name: 'Sarah',
    customer_name: 'Sarah Johnson',
    customer_phone: '(555) 555-1234',
    next_available: 'tomorrow at 9AM',
    appointment_date: 'January 15th',
    appointment_time: '2:00 PM',
    current_time: '3:45 PM',
    service_requested: 'water heater repair',
    price_range: '$150-$300',
  };

  const variables = { ...defaultSampleData, ...sampleData };

  // Create a mock template object
  const mockTemplate: NevermissTemplate = {
    id: 'preview',
    config_id: 'preview',
    name: 'Preview',
    template_key: null,
    content: templateContent,
    max_length: 320,
    emoji_setting: 'business_default',
    ai_personalization: 'none',
    is_system: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return renderTemplate(mockTemplate, variables);
}

/**
 * Add emoji to message based on settings
 */
export function addEmoji(
  message: string,
  emojiSetting: 'business_default' | 'always' | 'never',
  businessDefault: boolean
): string {
  const shouldAddEmoji =
    emojiSetting === 'always' ||
    (emojiSetting === 'business_default' && businessDefault);

  if (!shouldAddEmoji) return message;

  // Check if message already has emoji
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(message)) return message;

  // Add appropriate emoji based on message content
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('sorry') || lowerMessage.includes('apologize')) {
    return message; // Don't add emoji to apologies
  }

  if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
    return message; // Don't add emoji to emergencies
  }

  if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
    return message + ' 🙏';
  }

  if (lowerMessage.includes('great') || lowerMessage.includes('awesome') || lowerMessage.includes('perfect')) {
    return message + ' 👍';
  }

  if (lowerMessage.includes('hey') || lowerMessage.includes('hi ') || message.startsWith('Hi')) {
    return message.replace(/^(hey!?|hi!?)/i, '$1 👋');
  }

  if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('book')) {
    return message + ' 📅';
  }

  // Default: add hand wave at the start if it's a greeting-like message
  if (message.length < 100 && (message.includes('?') || message.includes('!'))) {
    return message;
  }

  return message;
}

/**
 * Validate template syntax
 */
export function validateTemplateSyntax(content: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unclosed conditionals
  const openTags = content.match(/\{\{[#^](\w+)\}\}/g) || [];
  const closeTags = content.match(/\{\{\/(\w+)\}\}/g) || [];

  if (openTags.length !== closeTags.length) {
    errors.push('Mismatched conditional blocks. Check that all {{#var}} have matching {{/var}}');
  }

  // Check for invalid variable names
  const invalidVars = content.match(/\{\{[^}]*[^a-zA-Z0-9_][^}]*\}\}/g);
  if (invalidVars) {
    errors.push(`Invalid variable names: ${invalidVars.join(', ')}. Variables can only contain letters, numbers, and underscores.`);
  }

  // Check for very long templates
  if (content.length > 500) {
    warnings.push('Template is quite long. SMS messages over 160 characters will be sent as multiple segments.');
  }

  // Check for missing common variables
  const variables = extractTemplateVariables(content);
  const uncommonVars = variables.filter(v =>
    !['business_name', 'owner_name', 'first_name', 'customer_name', 'main_phone',
     'emergency_phone', 'booking_link', 'next_available', 'appointment_date',
     'appointment_time', 'service_area', 'price_range', 'customer_phone',
     'current_time', 'service_requested'].includes(v)
  );

  if (uncommonVars.length > 0) {
    warnings.push(`Custom variables used: ${uncommonVars.join(', ')}. Make sure these will be provided at runtime.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
