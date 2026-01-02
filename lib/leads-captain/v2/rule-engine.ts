// =====================================================
// Leads Captain v2.0 Rule Engine
// Evaluates rules in priority order - first match wins
// =====================================================

import {
  LeadsCaptainRule,
  LeadsCaptainConfig,
  LeadsCaptainConversation,
  RuleConditions,
  RuleCondition,
  RuleActions,
  RuleEvaluationContext,
  RuleEvaluationResult,
  IntentClassificationResult,
  BusinessHours,
  DayOfWeek,
} from '@/types/leads-captain';

/**
 * Evaluate all rules against the current context
 * Rules are evaluated in priority order (lower number = higher priority)
 * Returns the first matching rule
 */
export function evaluateRules(
  rules: LeadsCaptainRule[],
  context: RuleEvaluationContext
): RuleEvaluationResult {
  // Sort rules by priority (ascending - lower number = higher priority)
  const sortedRules = [...rules]
    .filter(r => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const result = evaluateRule(rule, context);
    if (result.matched) {
      return result;
    }
  }

  // No rule matched
  return {
    matched: false,
    rule: null,
    conditions_checked: [],
  };
}

/**
 * Evaluate a single rule against the context
 */
function evaluateRule(
  rule: LeadsCaptainRule,
  context: RuleEvaluationContext
): RuleEvaluationResult {
  const conditions = rule.conditions;
  const conditionsChecked: RuleEvaluationResult['conditions_checked'] = [];

  // Evaluate based on operator (AND/OR)
  let matched: boolean;

  if (conditions.operator === 'AND') {
    // All conditions must be true
    matched = true;
    for (const condition of conditions.conditions) {
      const { result, actual_value } = evaluateCondition(condition, context);
      conditionsChecked.push({ condition, result, actual_value });
      if (!result) {
        matched = false;
        break; // Short circuit for AND
      }
    }
  } else {
    // OR: At least one condition must be true
    matched = false;
    for (const condition of conditions.conditions) {
      const { result, actual_value } = evaluateCondition(condition, context);
      conditionsChecked.push({ condition, result, actual_value });
      if (result) {
        matched = true;
        break; // Short circuit for OR
      }
    }
  }

  return {
    matched,
    rule: matched ? rule : null,
    conditions_checked: conditionsChecked,
  };
}

/**
 * Evaluate a single condition
 */
export function evaluateCondition(
  condition: RuleCondition,
  context: RuleEvaluationContext
): { result: boolean; actual_value: unknown } {
  const { field, operator, value } = condition;
  let actual_value: unknown;
  let result = false;

  switch (field) {
    case 'intent':
      actual_value = context.classification.intent;
      result = evaluateStringCondition(actual_value as string, operator, value);
      break;

    case 'time':
      actual_value = getTimeValue(context);
      result = evaluateTimeCondition(actual_value as string, value as string);
      break;

    case 'message_contains':
      actual_value = context.message.toLowerCase();
      result = evaluateContainsCondition(actual_value as string, operator, value);
      break;

    case 'sentiment':
      actual_value = context.classification.sentiment;
      result = evaluateStringCondition(actual_value as string, operator, value);
      break;

    case 'confidence':
      actual_value = context.classification.confidence;
      result = evaluateNumericCondition(actual_value as number, operator, value);
      break;

    case 'customer_status':
      // Check if this is an existing customer in CRM
      actual_value = context.conversation?.crm_customer_id ? 'existing' : 'new';
      result = evaluateStringCondition(actual_value as string, String(operator), String(value));
      break;

    case 'conversation_length':
      actual_value = context.conversation?.message_count || 0;
      result = evaluateNumericCondition(actual_value as number, String(operator), Number(value));
      break;

    case 'is_first_message':
      actual_value = context.is_first_message;
      result = actual_value === value;
      break;

    case 'customer_name':
      actual_value = context.classification.entities.name || context.conversation?.customer_name;
      if (operator === 'equals' && value === 'known') {
        result = !!actual_value;
      } else if (operator === 'equals' && value === 'unknown') {
        result = !actual_value;
      } else {
        result = evaluateStringCondition(actual_value as string || '', operator, value);
      }
      break;

    case 'detected_language':
      actual_value = context.classification.language;
      result = evaluateStringCondition(actual_value as string, String(operator), String(value));
      break;

    default:
      console.warn(`[Leads Captain v2] Unknown condition field: ${field}`);
      result = false;
  }

  return { result, actual_value };
}

/**
 * Evaluate string-based conditions
 */
function evaluateStringCondition(
  actual: string,
  operator: string,
  expected: unknown
): boolean {
  const normalizedActual = (actual || '').toLowerCase();
  const normalizedExpected = String(expected).toLowerCase();

  switch (operator) {
    case 'equals':
      return normalizedActual === normalizedExpected;
    case 'not_equals':
      return normalizedActual !== normalizedExpected;
    case 'contains':
      return normalizedActual.includes(normalizedExpected);
    case 'not_contains':
      return !normalizedActual.includes(normalizedExpected);
    default:
      return false;
  }
}

/**
 * Evaluate numeric conditions
 */
function evaluateNumericCondition(
  actual: number,
  operator: string,
  expected: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return actual === Number(expected);
    case 'not_equals':
      return actual !== Number(expected);
    case 'greater_than':
      return actual > Number(expected);
    case 'less_than':
      return actual < Number(expected);
    case 'between':
      if (Array.isArray(expected) && expected.length === 2) {
        return actual >= expected[0] && actual <= expected[1];
      }
      return false;
    default:
      return false;
  }
}

/**
 * Evaluate "contains" conditions for string arrays
 */
function evaluateContainsCondition(
  message: string,
  operator: string,
  value: unknown
): boolean {
  if (operator === 'contains' && typeof value === 'string') {
    return message.includes(value.toLowerCase());
  }

  if (operator === 'not_contains' && typeof value === 'string') {
    return !message.includes(value.toLowerCase());
  }

  if (operator === 'any' && Array.isArray(value)) {
    // Any of the values present
    return value.some(v => message.includes(String(v).toLowerCase()));
  }

  if (operator === 'all' && Array.isArray(value)) {
    // All values must be present
    return value.every(v => message.includes(String(v).toLowerCase()));
  }

  return false;
}

/**
 * Evaluate time-based conditions
 */
function evaluateTimeCondition(actual: string, expected: string): boolean {
  // actual is one of: 'business_hours', 'outside_hours', 'quiet_hours'
  // expected is one of: 'business_hours', 'outside_hours', 'quiet_hours'
  return actual === expected;
}

/**
 * Get the current time classification
 */
function getTimeValue(context: RuleEvaluationContext): string {
  if (context.is_quiet_hours) return 'quiet_hours';
  if (context.is_business_hours) return 'business_hours';
  return 'outside_hours';
}

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(
  businessHours: BusinessHours,
  timezone: string,
  now?: Date
): boolean {
  const currentTime = now || new Date();

  // Get current time in business timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(currentTime);
  const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase().slice(0, 3) as DayOfWeek;
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

  const dayHours = businessHours[weekday];
  if (!dayHours?.enabled || !dayHours.open || !dayHours.close) {
    return false;
  }

  const [openHour, openMinute] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);

  const currentMinutes = hour * 60 + minute;
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Check if current time is within quiet hours
 * (for notifications, not for responses)
 */
export function isWithinQuietHours(
  quietStart: string,
  quietEnd: string,
  timezone: string,
  now?: Date
): boolean {
  const currentTime = now || new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(currentTime);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

  const [startHour, startMinute] = quietStart.split(':').map(Number);
  const [endHour, endMinute] = quietEnd.split(':').map(Number);

  const currentMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Execute rule actions and return what should happen
 */
export function executeRuleActions(
  rule: LeadsCaptainRule,
  context: RuleEvaluationContext
): {
  should_send_response: boolean;
  template_id: string | null;
  direct_text: string | null;
  use_ai: boolean;
  should_notify: boolean;
  notification_config: RuleActions['notify'] | null;
  should_escalate: boolean;
  stop_ai: boolean;
  conversation_updates: Partial<{
    is_hot_lead: boolean;
    is_emergency: boolean;
    requires_human: boolean;
  }>;
  crm_actions: {
    create_lead: boolean;
    create_job: boolean;
  };
} {
  const actions = rule.actions;

  return {
    should_send_response: !actions.do_not_respond,
    template_id: actions.send_template || null,
    direct_text: actions.send_text || null,
    use_ai: actions.use_ai || false,
    should_notify: !!actions.notify,
    notification_config: actions.notify || null,
    should_escalate: actions.escalate_to_human || false,
    stop_ai: actions.stop_ai || false,
    conversation_updates: {
      is_hot_lead: actions.set_hot_lead,
      is_emergency: actions.set_emergency,
      requires_human: actions.escalate_to_human,
    },
    crm_actions: {
      create_lead: actions.create_lead || false,
      create_job: actions.create_job || false,
    },
  };
}

/**
 * Build the next available time string for after-hours messages
 */
export function getNextAvailableTime(
  businessHours: BusinessHours,
  timezone: string
): string {
  const now = new Date();
  const days: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get current day in timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const currentDayShort = formatter.format(now).toLowerCase().slice(0, 3) as DayOfWeek;
  const currentDayIndex = days.indexOf(currentDayShort);

  // Check today first (if it's before business hours)
  const todayHours = businessHours[currentDayShort];
  if (todayHours?.enabled && todayHours.open) {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = timeFormatter.formatToParts(now);
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const [openHour, openMinute] = todayHours.open.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const openMinutes = openHour * 60 + openMinute;

    if (currentMinutes < openMinutes) {
      return `at ${formatTime(todayHours.open)}`;
    }
  }

  // Check future days
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const day = days[dayIndex];
    const dayHours = businessHours[day];

    if (dayHours?.enabled && dayHours.open) {
      if (i === 1) {
        return `tomorrow at ${formatTime(dayHours.open)}`;
      }
      return `${dayNames[dayIndex]} at ${formatTime(dayHours.open)}`;
    }
  }

  return 'soon';
}

/**
 * Format time from 24h to 12h format
 */
function formatTime(time24: string): string {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return minute === 0 ? `${hour12}${period}` : `${hour12}:${minute.toString().padStart(2, '0')}${period}`;
}
