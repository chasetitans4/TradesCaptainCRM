// =====================================================
// Trades Captain AI - Prompt 6: Rule Matcher
// Non-LLM rule matching engine (ZERO API cost)
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  RuleMatcherInput,
  RuleMatcherOutput,
} from '@/types/leads-captain/prompt-types';
import {
  LeadsCaptainRule,
  RuleCondition,
  SentimentType,
  TimeConditionValue,
} from '@/types/leads-captain';
import { extractEmergencyKeywords } from './base-prompt';

// =====================================================
// MAIN RULE MATCHING FUNCTION
// =====================================================

/**
 * Execute rule matching (no LLM, pure TypeScript)
 * This is called before the Conversation Agent to determine
 * if a specific rule should be applied
 */
export function executeRuleMatcher(input: RuleMatcherInput): RuleMatcherOutput {
  const startTime = Date.now();

  // Quick intent classification (rule-based)
  const intentResult = classifyIntentRuleBased(input.message, input.intents);

  // Extract emergency keywords
  const emergencyKeywords = extractEmergencyKeywords(input.message);

  // Evaluate all rules and find the best match
  const ruleEvaluations: RuleMatcherOutput['allRulesEvaluated'] = [];
  let matchedRule: LeadsCaptainRule | null = null;
  let matchReason = 'No rules matched';

  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...input.rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (!rule.is_active) {
      ruleEvaluations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        reason: 'Rule is inactive',
      });
      continue;
    }

    const evaluation = evaluateRule(rule, input, intentResult);
    ruleEvaluations.push({
      ruleId: rule.id,
      ruleName: rule.name,
      matched: evaluation.matched,
      reason: evaluation.reason,
    });

    // First matching rule wins (rules are sorted by priority)
    if (evaluation.matched && !matchedRule) {
      matchedRule = rule;
      matchReason = evaluation.reason;
    }
  }

  const processingTime = Date.now() - startTime;

  jobLogger.debug({
    msg: 'Rule matching completed',
    matchedRule: matchedRule?.name || null,
    rulesEvaluated: ruleEvaluations.length,
    processingTimeMs: processingTime,
  });

  return {
    matchedRule,
    matchReason,
    detectedIntent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    emergencyKeywords,
    allRulesEvaluated: ruleEvaluations,
  };
}

// =====================================================
// RULE EVALUATION
// =====================================================

interface RuleEvaluation {
  matched: boolean;
  reason: string;
}

/**
 * Evaluate a single rule against the current context
 */
function evaluateRule(
  rule: LeadsCaptainRule,
  input: RuleMatcherInput,
  intentResult: IntentResult
): RuleEvaluation {
  const { conditions } = rule;

  if (!conditions || !conditions.conditions || conditions.conditions.length === 0) {
    return { matched: false, reason: 'Rule has no conditions' };
  }

  const conditionResults: boolean[] = [];
  const conditionReasons: string[] = [];

  for (const condition of conditions.conditions) {
    const result = evaluateCondition(condition, input, intentResult);
    conditionResults.push(result.matched);
    conditionReasons.push(result.reason);
  }

  // Apply AND/OR logic
  const operator = conditions.operator || 'AND';
  const matched = operator === 'AND'
    ? conditionResults.every(r => r)
    : conditionResults.some(r => r);

  const reason = matched
    ? `Matched: ${conditionReasons.filter((_, i) => conditionResults[i]).join(', ')}`
    : `Failed: ${conditionReasons.filter((_, i) => !conditionResults[i]).join(', ')}`;

  return { matched, reason };
}

interface ConditionEvaluation {
  matched: boolean;
  reason: string;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: RuleCondition,
  input: RuleMatcherInput,
  intentResult: IntentResult
): ConditionEvaluation {
  const { field, operator, value } = condition;

  switch (field) {
    case 'intent':
      return evaluateIntentCondition(operator, value, intentResult);

    case 'time':
      return evaluateTimeCondition(operator, value as TimeConditionValue, input.conversationContext);

    case 'message_contains':
      return evaluateMessageContains(operator, value, input.message);

    case 'sentiment':
      return evaluateSentimentCondition(operator, value, input.conversationContext.sentiment);

    case 'confidence':
      return evaluateConfidenceCondition(operator, value as number, intentResult.confidence);

    case 'customer_status':
      // Would need customer data - simplified for now
      return { matched: true, reason: 'Customer status check skipped' };

    case 'conversation_length':
      return evaluateConversationLength(operator, value as number, input.conversationContext.messageCount);

    case 'is_first_message':
      return {
        matched: input.conversationContext.isFirstMessage === (value === true || value === 'true'),
        reason: `First message check: ${input.conversationContext.isFirstMessage}`,
      };

    case 'customer_name':
      return evaluateCustomerName(operator, value, input.conversationContext.customerName);

    case 'detected_language':
      // Simplified - assume English
      return { matched: true, reason: 'Language detection skipped' };

    default:
      return { matched: false, reason: `Unknown field: ${field}` };
  }
}

// =====================================================
// CONDITION EVALUATORS
// =====================================================

function evaluateIntentCondition(
  operator: string,
  value: RuleCondition['value'],
  intentResult: IntentResult
): ConditionEvaluation {
  const detectedIntent = intentResult.intent.toLowerCase();

  switch (operator) {
    case 'equals':
    case 'is':
      const singleValue = String(value).toLowerCase();
      return {
        matched: detectedIntent === singleValue,
        reason: `Intent ${detectedIntent} ${detectedIntent === singleValue ? '==' : '!='} ${singleValue}`,
      };

    case 'not_equals':
      const notValue = String(value).toLowerCase();
      return {
        matched: detectedIntent !== notValue,
        reason: `Intent ${detectedIntent} ${detectedIntent !== notValue ? '!=' : '=='} ${notValue}`,
      };

    case 'any':
      if (Array.isArray(value)) {
        const anyMatch = value.some(v => String(v).toLowerCase() === detectedIntent);
        return {
          matched: anyMatch,
          reason: `Intent ${detectedIntent} ${anyMatch ? 'in' : 'not in'} [${value.join(', ')}]`,
        };
      }
      return { matched: false, reason: 'Invalid "any" value (not array)' };

    case 'contains':
      const containsValue = String(value).toLowerCase();
      return {
        matched: detectedIntent.includes(containsValue),
        reason: `Intent ${detectedIntent} ${detectedIntent.includes(containsValue) ? 'contains' : 'does not contain'} ${containsValue}`,
      };

    default:
      return { matched: false, reason: `Unknown operator: ${operator}` };
  }
}

function evaluateTimeCondition(
  operator: string,
  value: TimeConditionValue,
  context: RuleMatcherInput['conversationContext']
): ConditionEvaluation {
  let matched = false;
  let reason = '';

  switch (value) {
    case 'business_hours':
      matched = context.isBusinessHours;
      reason = `Business hours: ${context.isBusinessHours}`;
      break;

    case 'outside_hours':
      matched = !context.isBusinessHours;
      reason = `Outside hours: ${!context.isBusinessHours}`;
      break;

    case 'quiet_hours':
      matched = context.isQuietHours;
      reason = `Quiet hours: ${context.isQuietHours}`;
      break;

    default:
      reason = `Unknown time value: ${value}`;
  }

  // Handle negation
  if (operator === 'not_equals' || operator === 'is' && String(value).startsWith('not_')) {
    matched = !matched;
  }

  return { matched, reason };
}

function evaluateMessageContains(
  operator: string,
  value: RuleCondition['value'],
  message: string
): ConditionEvaluation {
  const lowerMessage = message.toLowerCase();

  switch (operator) {
    case 'contains':
      if (typeof value === 'string') {
        const contains = lowerMessage.includes(value.toLowerCase());
        return {
          matched: contains,
          reason: `Message ${contains ? 'contains' : 'does not contain'} "${value}"`,
        };
      }
      return { matched: false, reason: 'Invalid contains value' };

    case 'not_contains':
      if (typeof value === 'string') {
        const notContains = !lowerMessage.includes(value.toLowerCase());
        return {
          matched: notContains,
          reason: `Message ${notContains ? 'does not contain' : 'contains'} "${value}"`,
        };
      }
      return { matched: false, reason: 'Invalid not_contains value' };

    case 'any':
      if (Array.isArray(value)) {
        const anyMatch = value.some(v => lowerMessage.includes(String(v).toLowerCase()));
        return {
          matched: anyMatch,
          reason: `Message ${anyMatch ? 'contains one of' : 'does not contain any of'} [${value.join(', ')}]`,
        };
      }
      return { matched: false, reason: 'Invalid "any" value (not array)' };

    case 'all':
      if (Array.isArray(value)) {
        const allMatch = value.every(v => lowerMessage.includes(String(v).toLowerCase()));
        return {
          matched: allMatch,
          reason: `Message ${allMatch ? 'contains all of' : 'missing some of'} [${value.join(', ')}]`,
        };
      }
      return { matched: false, reason: 'Invalid "all" value (not array)' };

    default:
      return { matched: false, reason: `Unknown operator: ${operator}` };
  }
}

function evaluateSentimentCondition(
  operator: string,
  value: RuleCondition['value'],
  currentSentiment: SentimentType | null
): ConditionEvaluation {
  if (!currentSentiment) {
    return { matched: false, reason: 'No sentiment detected' };
  }

  const targetSentiment = String(value).toLowerCase();

  switch (operator) {
    case 'equals':
    case 'is':
      return {
        matched: currentSentiment === targetSentiment,
        reason: `Sentiment ${currentSentiment} ${currentSentiment === targetSentiment ? '==' : '!='} ${targetSentiment}`,
      };

    case 'not_equals':
      return {
        matched: currentSentiment !== targetSentiment,
        reason: `Sentiment ${currentSentiment} ${currentSentiment !== targetSentiment ? '!=' : '=='} ${targetSentiment}`,
      };

    default:
      return { matched: false, reason: `Unknown operator: ${operator}` };
  }
}

function evaluateConfidenceCondition(
  operator: string,
  value: number,
  confidence: number
): ConditionEvaluation {
  switch (operator) {
    case 'greater_than':
      return {
        matched: confidence > value,
        reason: `Confidence ${confidence} ${confidence > value ? '>' : '<='} ${value}`,
      };

    case 'less_than':
      return {
        matched: confidence < value,
        reason: `Confidence ${confidence} ${confidence < value ? '<' : '>='} ${value}`,
      };

    case 'between':
      // Assuming value is the lower bound, need upper bound from somewhere
      return { matched: true, reason: 'Between operator needs implementation' };

    default:
      return { matched: false, reason: `Unknown operator: ${operator}` };
  }
}

function evaluateConversationLength(
  operator: string,
  value: number,
  messageCount: number
): ConditionEvaluation {
  switch (operator) {
    case 'equals':
      return {
        matched: messageCount === value,
        reason: `Message count ${messageCount} ${messageCount === value ? '==' : '!='} ${value}`,
      };

    case 'greater_than':
      return {
        matched: messageCount > value,
        reason: `Message count ${messageCount} ${messageCount > value ? '>' : '<='} ${value}`,
      };

    case 'less_than':
      return {
        matched: messageCount < value,
        reason: `Message count ${messageCount} ${messageCount < value ? '<' : '>='} ${value}`,
      };

    default:
      return { matched: false, reason: `Unknown operator: ${operator}` };
  }
}

function evaluateCustomerName(
  operator: string,
  value: RuleCondition['value'],
  customerName: string | null
): ConditionEvaluation {
  switch (operator) {
    case 'equals':
      if (value === null || value === 'null') {
        return {
          matched: customerName === null,
          reason: `Customer name ${customerName === null ? 'is' : 'is not'} null`,
        };
      }
      return {
        matched: customerName?.toLowerCase() === String(value).toLowerCase(),
        reason: `Customer name check`,
      };

    case 'not_equals':
      if (value === null || value === 'null') {
        return {
          matched: customerName !== null,
          reason: `Customer name ${customerName !== null ? 'is not' : 'is'} null`,
        };
      }
      return {
        matched: customerName?.toLowerCase() !== String(value).toLowerCase(),
        reason: `Customer name check`,
      };

    default:
      return { matched: false, reason: `Unknown operator: ${operator}` };
  }
}

// =====================================================
// RULE-BASED INTENT CLASSIFICATION
// =====================================================

interface IntentResult {
  intent: string;
  confidence: number;
}

/**
 * Classify intent using rule-based patterns (no LLM)
 */
function classifyIntentRuleBased(
  message: string,
  enabledIntents: Array<{ code: string; enabled: boolean }>
): IntentResult {
  const lowerMessage = message.toLowerCase();

  // Intent patterns with confidence scores
  const intentPatterns: Array<{
    intent: string;
    patterns: RegExp[];
    confidence: number;
  }> = [
    {
      intent: 'emergency',
      patterns: [
        /\b(emergency|urgent|asap|immediately|right\s*now)\b/i,
        /\b(gas\s*leak|flooding|no\s*heat|no\s*ac|burst\s*pipe)\b/i,
      ],
      confidence: 90,
    },
    {
      intent: 'pricing',
      patterns: [
        /\b(how\s*much|price|cost|quote|estimate|rate|charge)\b/i,
        /\b(what\s*(do|would|will)\s*(you|it)\s*(cost|charge|run))\b/i,
      ],
      confidence: 85,
    },
    {
      intent: 'schedule',
      patterns: [
        /\b(schedule|appointment|book|when\s*can|availability)\b/i,
        /\b(come\s*(out|by|over)|send\s*someone)\b/i,
      ],
      confidence: 85,
    },
    {
      intent: 'availability',
      patterns: [
        /\b(available|open|hours|when\s*are\s*you)\b/i,
        /\b(do\s*you\s*(work|service))\b/i,
      ],
      confidence: 80,
    },
    {
      intent: 'new_lead',
      patterns: [
        /\b(need|looking\s*for|want|interested\s*in)\s*(help|service|repair|install)/i,
        /\b(can\s*you|do\s*you)\s*(help|fix|repair|install|replace)/i,
      ],
      confidence: 75,
    },
    {
      intent: 'complaint',
      patterns: [
        /\b(complaint|unhappy|dissatisfied|terrible|horrible|worst)\b/i,
        /\b(never|won'?t)\s*(use|recommend|call)\s*(you|again)/i,
      ],
      confidence: 85,
    },
    {
      intent: 'reschedule',
      patterns: [
        /\b(reschedule|change|move)\s*(my|the|our)?\s*(appointment|time)\b/i,
        /\b(can'?t\s*make\s*it|something\s*came\s*up)\b/i,
      ],
      confidence: 85,
    },
    {
      intent: 'cancel',
      patterns: [
        /\b(cancel|cancellation|don'?t\s*need)\s*(my|the|our)?\s*(appointment|service)?\b/i,
      ],
      confidence: 85,
    },
    {
      intent: 'existing_customer',
      patterns: [
        /\b(you\s*(worked|came|were)\s*(here|on|at))\b/i,
        /\b(last\s*(time|year|month)|previous(ly)?)\b/i,
        /\b(follow\s*up|same\s*issue|still\s*having)\b/i,
      ],
      confidence: 70,
    },
    {
      intent: 'wrong_number',
      patterns: [
        /\b(wrong\s*number|who\s*is\s*this|who\s*are\s*you)\b/i,
        /\b(sorry|oops)\s*(wrong|didn'?t\s*mean)/i,
      ],
      confidence: 90,
    },
    {
      intent: 'bot_check',
      patterns: [
        /\b(are\s*you\s*(a\s*)?(bot|robot|ai|human|real|person))\b/i,
        /\b(is\s*this\s*(a\s*)?(bot|automated|real\s*person))\b/i,
      ],
      confidence: 95,
    },
    {
      intent: 'spam',
      patterns: [
        /\b(sell|selling|offer|promotion|deal|discount)\b.*(interested|buy|click)/i,
        /\b(won|winner|prize|lottery|free\s*money)\b/i,
      ],
      confidence: 75,
    },
  ];

  // Check each pattern
  for (const { intent, patterns, confidence } of intentPatterns) {
    // Skip if intent is not enabled
    const intentConfig = enabledIntents.find(i => i.code === intent);
    if (intentConfig && !intentConfig.enabled) {
      continue;
    }

    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return { intent, confidence };
      }
    }
  }

  // Default to general inquiry
  return { intent: 'general', confidence: 50 };
}

// =====================================================
// SENTIMENT DETECTION (Rule-based)
// =====================================================

/**
 * Quick sentiment detection using patterns
 */
export function detectSentiment(message: string): SentimentType {
  const lowerMessage = message.toLowerCase();

  // Angry patterns
  const angryPatterns = [
    /\b(angry|furious|pissed|livid|outraged)\b/i,
    /\b(wtf|what\s*the\s*(hell|f)|damn|hell)\b/i,
    /\b(terrible|horrible|worst|awful|disgusting)\b/i,
    /[!]{2,}/, // Multiple exclamation marks
    /\b(never|won'?t)\s*(use|recommend|call)\s*(you|again)/i,
  ];

  for (const pattern of angryPatterns) {
    if (pattern.test(lowerMessage)) {
      return 'angry';
    }
  }

  // Negative patterns
  const negativePatterns = [
    /\b(unhappy|disappointed|frustrated|upset|annoyed)\b/i,
    /\b(didn'?t|doesn'?t|don'?t)\s*(work|help|fix)/i,
    /\b(still\s*(broken|not\s*working|having\s*issues))\b/i,
  ];

  for (const pattern of negativePatterns) {
    if (pattern.test(lowerMessage)) {
      return 'negative';
    }
  }

  // Positive patterns
  const positivePatterns = [
    /\b(thanks|thank\s*you|appreciate|grateful)\b/i,
    /\b(great|awesome|excellent|perfect|wonderful|amazing)\b/i,
    /\b(love|loved|happy|pleased)\b/i,
    /[!]\s*$/,  // Single exclamation at end (often positive)
  ];

  for (const pattern of positivePatterns) {
    if (pattern.test(lowerMessage)) {
      return 'positive';
    }
  }

  return 'neutral';
}
