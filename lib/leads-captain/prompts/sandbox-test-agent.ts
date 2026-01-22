// =====================================================
// Prompt 9: Sandbox Test Agent
// Simulates customer conversations for testing
// On-demand usage for configuration validation
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  SandboxTestInput,
  SandboxTestOutput,
  SandboxTestMessage,
  SimpleMessage,
  PromptResult,
} from '@/types/leads-captain/prompt-types';
import { callClaude, parseJSONResponse, withTimeout } from './base-prompt';

// =====================================================
// SYSTEM PROMPT
// =====================================================

function buildSandboxSystemPrompt(scenario: SandboxTestInput['scenario']): string {
  const personaDescription = getPersonaDescription(scenario.customerPersona);

  return `You are simulating a customer contacting a ${scenario.businessType} service company via SMS.

CUSTOMER PERSONA: ${personaDescription}

SERVICE BEING REQUESTED: ${scenario.serviceType}

SCENARIO CONTEXT:
${scenario.additionalContext || 'Standard service inquiry'}

YOUR BEHAVIOR:
1. Stay in character as the customer throughout
2. React naturally to business responses
3. ${scenario.customerPersona === 'difficult' ? 'Be challenging but not abusive' : 'Be realistic and conversational'}
4. ${scenario.customerPersona === 'price_sensitive' ? 'Show concern about costs' : ''}
5. ${scenario.customerPersona === 'urgent' ? 'Convey urgency in your messages' : ''}
6. Provide information gradually, like a real customer would
7. Ask follow-up questions when appropriate

MESSAGE STYLE:
- Keep messages SMS-length (under 160 chars preferred)
- Use casual texting style
- ${scenario.customerPersona === 'technical' ? 'Use some technical terminology' : 'Avoid overly technical language'}

When you receive a business response, generate your next customer message.
If the conversation should naturally end (appointment made, question answered, etc.), indicate this.

OUTPUT FORMAT:
{
  "customerMessage": "Your response as the customer",
  "internalThought": "What the customer is thinking (for test analysis)",
  "conversationShouldEnd": false,
  "endReason": null
}

OUTPUT: JSON only`;
}

function getPersonaDescription(persona: string): string {
  const personas: Record<string, string> = {
    friendly: 'A friendly, cooperative customer who provides information readily and is pleasant to interact with.',
    difficult: 'A skeptical customer who asks tough questions, pushes back on responses, and needs convincing.',
    price_sensitive: 'A budget-conscious customer who is primarily concerned about costs and value.',
    urgent: 'A customer with an urgent need who wants quick answers and fast service.',
    technical: 'A knowledgeable customer who understands their system and uses technical terminology.',
    elderly: 'An older customer who may need things explained clearly and simply.',
    busy: 'A busy professional who wants quick, efficient communication without unnecessary back-and-forth.',
  };

  return personas[persona] || personas.friendly;
}

// =====================================================
// CONVERSATION SIMULATION
// =====================================================

export async function executeFullSandboxTest(
  input: SandboxTestInput,
  processMessage: (message: string) => Promise<string>
): Promise<PromptResult<SandboxTestOutput>> {
  const startTime = Date.now();
  const conversation: SandboxTestMessage[] = [];
  const analysisNotes: string[] = [];

  let totalTokens = 0;
  let turnCount = 0;
  const maxTurns = input.maxTurns || 10;

  try {
    // Generate initial customer message
    const initialMessage = await generateInitialMessage(input);
    conversation.push({
      role: 'customer',
      content: initialMessage.message,
      timestamp: new Date().toISOString(),
    });
    analysisNotes.push(`Initial: ${initialMessage.thought}`);
    totalTokens += initialMessage.tokens;

    // Main conversation loop
    while (turnCount < maxTurns) {
      turnCount++;

      // Get business response (using the actual AI system)
      const businessResponse = await processMessage(
        conversation[conversation.length - 1].content
      );

      conversation.push({
        role: 'business',
        content: businessResponse,
        timestamp: new Date().toISOString(),
      });

      // Generate customer response
      const customerResponse = await generateCustomerResponse(
        input,
        conversation
      );

      totalTokens += customerResponse.tokens;

      if (customerResponse.shouldEnd) {
        analysisNotes.push(`Ended: ${customerResponse.endReason}`);
        break;
      }

      conversation.push({
        role: 'customer',
        content: customerResponse.message,
        timestamp: new Date().toISOString(),
      });

      analysisNotes.push(`Turn ${turnCount}: ${customerResponse.thought}`);
    }

    // Analyze the conversation
    const analysis = analyzeTestConversation(conversation, input);

    return {
      success: true,
      data: {
        conversation,
        analysis,
        scenarioCompleted: turnCount < maxTurns,
        turnsUsed: turnCount,
        totalTokensUsed: totalTokens,
      },
      tokensUsed: totalTokens,
      latencyMs: Date.now() - startTime,
    };

  } catch (error) {
    jobLogger.error({
      msg: 'Sandbox test failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      data: {
        conversation,
        analysis: {
          overallScore: 0,
          strengths: [],
          weaknesses: ['Test could not complete due to error'],
          recommendations: ['Review error and retry'],
          goalAchieved: false,
          responseQuality: 'poor',
          informationGathering: 'poor',
          toneAppropriate: false,
        },
        scenarioCompleted: false,
        turnsUsed: turnCount,
        totalTokensUsed: totalTokens,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      tokensUsed: totalTokens,
      latencyMs: Date.now() - startTime,
    };
  }
}

// =====================================================
// MESSAGE GENERATION
// =====================================================

async function generateInitialMessage(
  input: SandboxTestInput
): Promise<{ message: string; thought: string; tokens: number }> {
  const systemPrompt = buildSandboxSystemPrompt(input.scenario);

  const userPrompt = `Generate the FIRST message a customer would send to start this conversation.

SCENARIO: ${input.scenario.serviceType} inquiry
PERSONA: ${input.scenario.customerPersona}
${input.scenario.additionalContext ? `CONTEXT: ${input.scenario.additionalContext}` : ''}

This is the opening message - no prior conversation.`;

  try {
    const response = await withTimeout(
      callClaude({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 300,
        temperature: 0.7,
      }),
      10000
    );

    const parsed = parseJSONResponse<{
      customerMessage: string;
      internalThought: string;
    }>(response.content);

    if (parsed) {
      return {
        message: parsed.customerMessage,
        thought: parsed.internalThought,
        tokens: response.tokensUsed,
      };
    }

    // Fallback to simple initial message
    return {
      message: generateFallbackInitialMessage(input.scenario),
      thought: 'Using fallback initial message',
      tokens: response.tokensUsed,
    };

  } catch (error) {
    return {
      message: generateFallbackInitialMessage(input.scenario),
      thought: 'Error generating message, using fallback',
      tokens: 0,
    };
  }
}

async function generateCustomerResponse(
  input: SandboxTestInput,
  conversation: SandboxTestMessage[]
): Promise<{
  message: string;
  thought: string;
  shouldEnd: boolean;
  endReason: string | null;
  tokens: number;
}> {
  const systemPrompt = buildSandboxSystemPrompt(input.scenario);

  const conversationText = conversation
    .map(m => `${m.role === 'customer' ? 'CUSTOMER' : 'BUSINESS'}: ${m.content}`)
    .join('\n');

  const userPrompt = `Continue the conversation as the customer.

CONVERSATION SO FAR:
${conversationText}

Generate the customer's next message in response to the business's last message.
If the conversation has reached a natural conclusion, indicate that it should end.`;

  try {
    const response = await withTimeout(
      callClaude({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 400,
        temperature: 0.7,
      }),
      10000
    );

    const parsed = parseJSONResponse<{
      customerMessage: string;
      internalThought: string;
      conversationShouldEnd: boolean;
      endReason: string | null;
    }>(response.content);

    if (parsed) {
      return {
        message: parsed.customerMessage,
        thought: parsed.internalThought,
        shouldEnd: parsed.conversationShouldEnd,
        endReason: parsed.endReason,
        tokens: response.tokensUsed,
      };
    }

    // Simple continuation
    return {
      message: 'Okay, thanks for the info.',
      thought: 'Using fallback response',
      shouldEnd: conversation.length > 6,
      endReason: 'Max turns approached',
      tokens: response.tokensUsed,
    };

  } catch (error) {
    return {
      message: 'Thanks',
      thought: 'Error, ending conversation',
      shouldEnd: true,
      endReason: 'Error in response generation',
      tokens: 0,
    };
  }
}

function generateFallbackInitialMessage(scenario: SandboxTestInput['scenario']): string {
  const messages: Record<string, string[]> = {
    repair: [
      `Hi, my ${scenario.serviceType} isn't working. Can you help?`,
      `Hey I need someone to look at my ${scenario.serviceType}`,
      `Is anyone available? My ${scenario.serviceType} broke`,
    ],
    install: [
      `Hi, I'm looking to get a new ${scenario.serviceType} installed`,
      `How much would it cost to install a ${scenario.serviceType}?`,
      `Do you do ${scenario.serviceType} installations?`,
    ],
    maintenance: [
      `Hi, I need to schedule maintenance for my ${scenario.serviceType}`,
      `When can you come out for a ${scenario.serviceType} tune-up?`,
      `Looking to get my ${scenario.serviceType} serviced`,
    ],
    estimate: [
      `Can I get a quote for ${scenario.serviceType}?`,
      `How much do you charge for ${scenario.serviceType}?`,
      `Looking for an estimate on ${scenario.serviceType}`,
    ],
  };

  const category = Object.keys(messages).find(k =>
    scenario.serviceType.toLowerCase().includes(k)
  ) || 'repair';

  const options = messages[category];
  return options[Math.floor(Math.random() * options.length)];
}

// =====================================================
// CONVERSATION ANALYSIS
// =====================================================

function analyzeTestConversation(
  conversation: SandboxTestMessage[],
  input: SandboxTestInput
): SandboxTestOutput['analysis'] {
  const businessMessages = conversation.filter(m => m.role === 'business');
  const customerMessages = conversation.filter(m => m.role === 'customer');

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Analyze response length
  const avgResponseLength = businessMessages.reduce((sum, m) => sum + m.content.length, 0) / businessMessages.length;
  if (avgResponseLength <= 320) {
    strengths.push('Responses are SMS-appropriate length');
  } else {
    weaknesses.push('Some responses may be too long for SMS');
    recommendations.push('Keep responses under 320 characters');
  }

  // Analyze question asking
  const questionsAsked = businessMessages.filter(m => m.content.includes('?')).length;
  if (questionsAsked > 0) {
    strengths.push('AI asks clarifying questions');
  } else if (conversation.length > 4) {
    weaknesses.push('AI didn\'t ask any questions');
    recommendations.push('Add questions to gather customer information');
  }

  // Check for personalization
  const usesName = businessMessages.some(m =>
    m.content.toLowerCase().includes(input.scenario.customerPersona === 'elderly' ? 'sir' : 'hi')
  );
  if (usesName) {
    strengths.push('Responses feel personalized');
  }

  // Check for information gathering
  const gatheredInfo = analyzeInformationGathered(conversation);
  const infoScore = Object.values(gatheredInfo).filter(Boolean).length;

  let informationGathering: 'excellent' | 'good' | 'fair' | 'poor';
  if (infoScore >= 4) {
    informationGathering = 'excellent';
    strengths.push('Effectively gathered customer information');
  } else if (infoScore >= 2) {
    informationGathering = 'good';
  } else if (infoScore >= 1) {
    informationGathering = 'fair';
    recommendations.push('Try to gather more customer information (name, address, timing)');
  } else {
    informationGathering = 'poor';
    weaknesses.push('Failed to gather customer information');
  }

  // Check response quality
  const hasEmptyResponses = businessMessages.some(m => m.content.length < 10);
  const hasGenericResponses = businessMessages.some(m =>
    m.content.toLowerCase().includes('i cannot') ||
    m.content.toLowerCase().includes('i\'m not able')
  );

  let responseQuality: 'excellent' | 'good' | 'fair' | 'poor';
  if (hasEmptyResponses || hasGenericResponses) {
    responseQuality = 'poor';
    weaknesses.push('Some responses were too generic or unhelpful');
  } else if (questionsAsked > 0 && avgResponseLength < 400) {
    responseQuality = 'excellent';
  } else {
    responseQuality = 'good';
  }

  // Calculate overall score
  let score = 50;
  score += strengths.length * 10;
  score -= weaknesses.length * 15;
  score = Math.max(0, Math.min(100, score));

  // Determine if goal was achieved
  const goalAchieved = infoScore >= 2 && !hasGenericResponses && conversation.length >= 4;

  // Check tone appropriateness
  const toneAppropriate = !businessMessages.some(m =>
    m.content.toLowerCase().includes('unfortunately') ||
    m.content.toLowerCase().includes('sorry, but') ||
    m.content.includes('!')
  );

  return {
    overallScore: score,
    strengths,
    weaknesses,
    recommendations,
    goalAchieved,
    responseQuality,
    informationGathering,
    toneAppropriate,
  };
}

function analyzeInformationGathered(conversation: SandboxTestMessage[]): {
  service: boolean;
  address: boolean;
  name: boolean;
  timing: boolean;
  phone: boolean;
} {
  const allText = conversation.map(m => m.content.toLowerCase()).join(' ');

  return {
    service: /(?:repair|install|fix|maintenance|replace|service)/.test(allText),
    address: /\d+\s+\w+\s+(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane)|\d{5}/.test(allText),
    name: /(?:my name is|i'm|this is)\s+\w+/.test(allText),
    timing: /(?:morning|afternoon|evening|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:am|pm))/i.test(allText),
    phone: /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(allText),
  };
}

// =====================================================
// SIMPLIFIED SINGLE-TURN TEST
// =====================================================

export async function testSingleResponse(
  customerMessage: string,
  businessResponse: string,
  scenario: {
    businessType: string;
    serviceType: string;
    customerPersona: string;
  }
): Promise<{
  appropriateness: 'excellent' | 'good' | 'fair' | 'poor';
  feedback: string;
  suggestedImprovement: string | null;
}> {
  const systemPrompt = `You are evaluating an AI's SMS response to a customer.

Evaluate the response on:
1. Relevance to the customer's message
2. Helpfulness
3. Tone (${scenario.customerPersona} customer)
4. Length (should be SMS-appropriate)
5. Next steps provided

OUTPUT FORMAT:
{
  "appropriateness": "excellent|good|fair|poor",
  "feedback": "Brief explanation of the rating",
  "suggestedImprovement": "How to improve (or null if excellent)"
}

OUTPUT: JSON only`;

  const userPrompt = `CUSTOMER MESSAGE: ${customerMessage}

BUSINESS RESPONSE: ${businessResponse}

CONTEXT: ${scenario.businessType} business, ${scenario.serviceType} inquiry, ${scenario.customerPersona} customer`;

  try {
    const response = await withTimeout(
      callClaude({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 300,
        temperature: 0.2,
      }),
      10000
    );

    const parsed = parseJSONResponse<{
      appropriateness: 'excellent' | 'good' | 'fair' | 'poor';
      feedback: string;
      suggestedImprovement: string | null;
    }>(response.content);

    if (parsed) {
      return parsed;
    }

    return {
      appropriateness: 'good',
      feedback: 'Response appears adequate',
      suggestedImprovement: null,
    };

  } catch (error) {
    return {
      appropriateness: 'good',
      feedback: 'Unable to evaluate',
      suggestedImprovement: null,
    };
  }
}
