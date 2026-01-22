// =====================================================
// Trades Captain AI - Prompt 2: Emergency Classifier
// Confirm emergency severity and provide safety guidance
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  EmergencyClassifierInput,
  EmergencyClassifierOutput,
  PromptResult,
  EmergencySeverity,
  EmergencyCategory,
} from '@/types/leads-captain/prompt-types';
import {
  callClaude,
  callOpenAI,
  withRetry,
  withTimeout,
  parseJSONResponse,
  successResult,
  errorResult,
  MODEL_CONFIGS,
  logPromptExecution,
} from './base-prompt';

// =====================================================
// SYSTEM PROMPT TEMPLATE
// =====================================================

function buildEmergencyClassifierSystemPrompt(input: EmergencyClassifierInput): string {
  return `You are an emergency classifier for ${input.businessType} services.

CURRENT SEASON: ${input.currentSeason}
DETECTED KEYWORDS: ${input.detectedKeywords.length > 0 ? input.detectedKeywords.join(', ') : 'none'}

CRITICAL EMERGENCIES (immediate safety risk - severity: critical):
- Gas leak or gas smell (even suspected)
- Flooding / burst pipe actively spreading water
- Electrical fire, sparking, exposed wires
- Carbon monoxide alarm or suspected CO
- Sewage backup into living space
- No heat when below freezing (winter) with vulnerable persons

HIGH EMERGENCIES (urgent but not immediate danger - severity: high):
- No heat in winter (but above freezing or no vulnerable persons)
- No AC in extreme heat wave
- Contained water leak (not spreading)
- Backed up drain affecting only one fixture
- Electrical issue with power off to affected area

MEDIUM EMERGENCIES (should be addressed soon - severity: medium):
- Water heater not working
- Partial HVAC failure
- Slow drain or minor leak
- Thermostat issues

LOW URGENCY (can wait for normal scheduling - severity: low):
- Routine maintenance requests
- Cosmetic issues
- Minor efficiency complaints
- General questions about service

NEGATION AWARENESS (CRITICAL):
- "no gas leak" or "there's no leak" = NOT an emergency
- "the flooding stopped" = reduced severity (but may still need service)
- "fixed the issue" = NOT an emergency
- "I THINK I smell gas" = STILL treat as emergency (err on caution)
- "might be" or "could be" + dangerous condition = treat as emergency

SEASONAL CONTEXT:
- Winter: No heat emergencies are more critical
- Summer: No AC emergencies are more critical (especially for elderly/children)

GUIDELINES:
- When in doubt, classify as emergency (fail safe)
- Summary should be actionable for the business owner
- Safety tips should be practical and immediate

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "isEmergency": true/false,
  "severity": "critical" | "high" | "medium" | "low",
  "category": "water_damage" | "no_heat" | "no_ac" | "gas_leak" | "electrical" | "sewage" | "carbon_monoxide" | "other",
  "summary": "Brief actionable summary for owner",
  "safetyTip": "Immediate safety advice for customer or null",
  "confidence": 0-100
}`;
}

// =====================================================
// PROMPT EXECUTION
// =====================================================

/**
 * Execute the Emergency Classifier prompt
 * Called when emergency keywords are detected to confirm severity
 */
export async function executeEmergencyClassifier(
  input: EmergencyClassifierInput
): Promise<PromptResult<EmergencyClassifierOutput>> {
  const startTime = Date.now();
  const config = MODEL_CONFIGS.emergency_classifier;
  let usedModel = config.primary;

  try {
    // Build conversation context
    const conversationContext = input.conversationHistory
      .map(msg => `${msg.role === 'customer' ? 'Customer' : 'Business'}: ${msg.content}`)
      .join('\n');

    const userMessage = `Classify this potential emergency:

CURRENT MESSAGE: "${input.message}"

CONVERSATION CONTEXT:
${conversationContext || 'No prior conversation'}

Analyze the situation and provide your classification.`;

    const systemPrompt = buildEmergencyClassifierSystemPrompt(input);

    // Try primary model with very short timeout (emergency needs fast response)
    let response: { content: string; tokensUsed: number } | null = null;

    try {
      response = await withTimeout(
        withRetry(
          () => callClaude({
            model: config.primary,
            maxTokens: 300,
            temperature: 0.1, // Low temperature for consistent classification
            systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
          { maxRetries: 1 }
        ),
        config.timeoutMs,
        'Claude emergency classifier timed out'
      );
    } catch (primaryError) {
      jobLogger.warn({
        msg: 'Primary model failed for emergency classifier, falling back',
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // Fallback to OpenAI
      usedModel = config.fallback;
      response = await withTimeout(
        callOpenAI({
          model: config.fallback,
          maxTokens: 300,
          temperature: 0.1,
          systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        config.timeoutMs,
        'OpenAI emergency classifier timed out'
      );
    }

    // Parse the JSON response
    const parsed = parseJSONResponse<EmergencyClassifierOutput>(response.content);

    if (!parsed) {
      // If parsing fails, use rule-based fallback
      const fallbackOutput = createRuleBasedFallback(input);
      const latencyMs = Date.now() - startTime;

      logPromptExecution('emergency_classifier', input, fallbackOutput, latencyMs, true);
      return successResult(fallbackOutput, usedModel, response.tokensUsed, latencyMs);
    }

    // Validate the response
    const validatedOutput = validateEmergencyOutput(parsed, input);
    const latencyMs = Date.now() - startTime;

    logPromptExecution('emergency_classifier', input, validatedOutput, latencyMs, true);
    return successResult(validatedOutput, usedModel, response.tokensUsed, latencyMs);

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    jobLogger.error({
      msg: 'Emergency classifier failed',
      error: errorMessage,
      latencyMs,
    });

    // On complete failure, use rule-based fallback (fail-safe)
    const fallbackOutput = createRuleBasedFallback(input);
    logPromptExecution('emergency_classifier', input, fallbackOutput, latencyMs, false);
    return successResult(fallbackOutput, 'rule_based_fallback', 0, latencyMs);
  }
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate emergency classifier output
 */
function validateEmergencyOutput(
  output: EmergencyClassifierOutput,
  input: EmergencyClassifierInput
): EmergencyClassifierOutput {
  const validSeverities: EmergencySeverity[] = ['critical', 'high', 'medium', 'low'];
  const validCategories: EmergencyCategory[] = [
    'water_damage', 'no_heat', 'no_ac', 'gas_leak',
    'electrical', 'sewage', 'carbon_monoxide', 'other'
  ];

  return {
    isEmergency: typeof output.isEmergency === 'boolean' ? output.isEmergency : true,
    severity: validSeverities.includes(output.severity) ? output.severity : 'high',
    category: validCategories.includes(output.category) ? output.category : inferCategoryFromKeywords(input.detectedKeywords),
    summary: typeof output.summary === 'string' && output.summary.length > 0
      ? output.summary
      : `Potential ${input.detectedKeywords[0] || 'emergency'} reported`,
    safetyTip: typeof output.safetyTip === 'string' ? output.safetyTip : getSafetyTip(output.category || 'other'),
    confidence: typeof output.confidence === 'number' && output.confidence >= 0 && output.confidence <= 100
      ? output.confidence
      : 70,
  };
}

// =====================================================
// RULE-BASED FALLBACK
// =====================================================

/**
 * Create a rule-based emergency classification as fallback
 */
function createRuleBasedFallback(input: EmergencyClassifierInput): EmergencyClassifierOutput {
  const keywords = input.detectedKeywords;
  const message = input.message.toLowerCase();

  // Check for negations
  const hasNegation = checkForNegation(message);

  // Gas leak - always critical unless negated
  if (keywords.includes('gas_leak') && !hasNegation) {
    return {
      isEmergency: true,
      severity: 'critical',
      category: 'gas_leak',
      summary: 'Customer reporting potential gas leak - immediate attention required',
      safetyTip: 'Leave the area immediately, do not turn on any lights or electrical switches, and call from outside.',
      confidence: 85,
    };
  }

  // Carbon monoxide
  if (keywords.includes('carbon_monoxide') && !hasNegation) {
    return {
      isEmergency: true,
      severity: 'critical',
      category: 'carbon_monoxide',
      summary: 'Carbon monoxide concern reported - immediate attention required',
      safetyTip: 'Leave the building immediately and get fresh air. Call 911 if anyone feels sick.',
      confidence: 85,
    };
  }

  // Flooding
  if (keywords.includes('flooding')) {
    const severity: EmergencySeverity = hasNegation ? 'medium' : 'high';
    return {
      isEmergency: !hasNegation,
      severity,
      category: 'water_damage',
      summary: hasNegation
        ? 'Previous flooding reported - may need assessment'
        : 'Active flooding or water damage reported',
      safetyTip: hasNegation ? null : 'If safe, turn off the main water valve to stop the flow.',
      confidence: 75,
    };
  }

  // No heat in winter
  if (keywords.includes('no_heat') && input.currentSeason === 'winter') {
    return {
      isEmergency: true,
      severity: 'high',
      category: 'no_heat',
      summary: 'Customer without heat during winter - needs prompt attention',
      safetyTip: 'Use space heaters safely if available, and check that pilot light is lit if applicable.',
      confidence: 80,
    };
  }

  // No AC in summer
  if (keywords.includes('no_ac') && input.currentSeason === 'summer') {
    return {
      isEmergency: true,
      severity: 'high',
      category: 'no_ac',
      summary: 'Customer without AC during summer - needs prompt attention',
      safetyTip: 'Stay hydrated and consider going to a cooler location if temperatures are extreme.',
      confidence: 80,
    };
  }

  // Electrical
  if (keywords.includes('electrical')) {
    return {
      isEmergency: !hasNegation,
      severity: hasNegation ? 'medium' : 'high',
      category: 'electrical',
      summary: 'Electrical issue reported',
      safetyTip: hasNegation ? null : 'Do not touch any exposed wires. Turn off power at the breaker if safe to do so.',
      confidence: 70,
    };
  }

  // Sewage
  if (keywords.includes('sewage')) {
    return {
      isEmergency: true,
      severity: 'high',
      category: 'sewage',
      summary: 'Sewage issue reported',
      safetyTip: 'Avoid contact with sewage water and do not use affected drains or toilets.',
      confidence: 75,
    };
  }

  // Urgent keyword but no specific type
  if (keywords.includes('urgent')) {
    return {
      isEmergency: true,
      severity: 'medium',
      category: 'other',
      summary: 'Customer reports urgent need for service',
      safetyTip: null,
      confidence: 60,
    };
  }

  // Default fallback
  return {
    isEmergency: keywords.length > 0,
    severity: 'medium',
    category: 'other',
    summary: keywords.length > 0
      ? `Customer reported: ${keywords.join(', ')}`
      : 'Potential service need',
    safetyTip: null,
    confidence: 50,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if the message contains negation patterns
 */
function checkForNegation(message: string): boolean {
  const negationPatterns = [
    /\b(no|not|don'?t|doesn'?t|isn'?t|wasn'?t|won'?t)\s+(have|smell|see|notice|think)/i,
    /\b(stopped|fixed|resolved|repaired|done|finished)\b/i,
    /\bthere'?s\s+no\b/i,
    /\bi\s+don'?t\s+(have|smell|see|think)/i,
  ];

  return negationPatterns.some(pattern => pattern.test(message));
}

/**
 * Infer category from detected keywords
 */
function inferCategoryFromKeywords(keywords: string[]): EmergencyCategory {
  if (keywords.includes('gas_leak')) return 'gas_leak';
  if (keywords.includes('flooding')) return 'water_damage';
  if (keywords.includes('no_heat')) return 'no_heat';
  if (keywords.includes('no_ac')) return 'no_ac';
  if (keywords.includes('electrical')) return 'electrical';
  if (keywords.includes('sewage')) return 'sewage';
  if (keywords.includes('carbon_monoxide')) return 'carbon_monoxide';
  return 'other';
}

/**
 * Get safety tip for a given category
 */
function getSafetyTip(category: EmergencyCategory): string | null {
  const tips: Record<EmergencyCategory, string | null> = {
    gas_leak: 'Leave the area immediately, do not turn on lights or switches, and call from outside.',
    water_damage: 'If safe, turn off the main water valve to stop water flow.',
    no_heat: 'Use space heaters safely if available, avoid using gas stove for heating.',
    no_ac: 'Stay hydrated and consider going to a cooler location.',
    electrical: 'Do not touch exposed wires. Turn off power at the breaker if safe.',
    sewage: 'Avoid contact with sewage water and do not use affected fixtures.',
    carbon_monoxide: 'Leave the building immediately and get fresh air.',
    other: null,
  };

  return tips[category];
}

// =====================================================
// QUICK KEYWORD CHECK (NON-LLM)
// =====================================================

/**
 * Quick check if message might contain emergency keywords
 * Use this before calling the full classifier to save API calls
 */
export function quickEmergencyCheck(message: string): {
  mightBeEmergency: boolean;
  keywords: string[];
} {
  const lowerMessage = message.toLowerCase();
  const keywords: string[] = [];

  const patterns: Array<{ pattern: RegExp; keyword: string }> = [
    { pattern: /\b(gas\s*leak|smell\s*(of\s*)?gas|gas\s*smell|smells?\s*like\s*gas)\b/i, keyword: 'gas_leak' },
    { pattern: /\b(flood|flooding|water\s*everywhere|burst\s*pipe|pipe\s*burst|gushing)\b/i, keyword: 'flooding' },
    { pattern: /\b(no\s*heat|heater?\s*(broken|not\s*working|won'?t\s*turn)|furnace\s*(broken|out|dead|not))/i, keyword: 'no_heat' },
    { pattern: /\b(no\s*ac|no\s*air|ac\s*(broken|not|dead|won'?t)|air\s*condition)/i, keyword: 'no_ac' },
    { pattern: /\b(electric(al)?\s*(fire|spark|issue|problem)|spark(s|ing)?|exposed\s*wire|power\s*out)/i, keyword: 'electrical' },
    { pattern: /\b(sewage|sewer|backup|overflow|raw\s*sewage)\b/i, keyword: 'sewage' },
    { pattern: /\b(carbon\s*monoxide|co\s*(detector|alarm)|co2\s*alarm)\b/i, keyword: 'carbon_monoxide' },
    { pattern: /\b(emergency|urgent|asap|right\s*now|immediately|danger(ous)?)\b/i, keyword: 'urgent' },
  ];

  for (const { pattern, keyword } of patterns) {
    if (pattern.test(lowerMessage)) {
      keywords.push(keyword);
    }
  }

  return {
    mightBeEmergency: keywords.length > 0,
    keywords,
  };
}
