// =====================================================
// Trades Captain AI - Prompt 4: Note Extractor
// Extract actionable notes from conversations
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  NoteExtractorInput,
  NoteExtractorOutput,
  ExtractedNote,
  KeyDetails,
  PromptResult,
  NoteType,
} from '@/types/leads-captain/prompt-types';
import {
  callOpenAI,
  callClaude,
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

function buildNoteExtractorSystemPrompt(): string {
  return `You are a note extraction specialist for a home services business. Your job is to extract actionable notes from customer conversations.

EXTRACTION OBJECTIVES:
1. Identify specific details about the service needed
2. Extract scheduling preferences and constraints
3. Note any customer concerns or special requests
4. Identify follow-up items that the business should address
5. Extract key details that would help a technician

NOTE TYPES:
- service_detail: Specific information about the problem or service needed
  Example: "Water heater making loud banging noises, started 3 days ago"
  Example: "AC blowing warm air, thermostat showing 78 but set to 72"

- scheduling: Time preferences or availability constraints
  Example: "Only available after 4pm on weekdays"
  Example: "Prefers morning appointments, works from home"

- concern: Customer worries, past bad experiences, or sensitivities
  Example: "Had a bad experience with previous contractor, wants updates"
  Example: "Elderly mother lives there, please be patient"

- follow_up: Things that need to happen after initial service
  Example: "Customer wants quote for full system replacement"
  Example: "Mentioned bathroom faucet also needs looking at"

- general: Other useful information
  Example: "Dog in backyard, use front entrance only"
  Example: "Gate code is 1234"

KEY DETAILS TO EXTRACT:
- specificIssue: The main problem in technical terms
- previousWork: Any mention of past work or service history
- constraints: Access limitations, pet info, time restrictions

CONFIDENCE SCORING:
- 0.9-1.0: Explicitly stated, very clear
- 0.7-0.89: Strongly implied or clearly inferred
- 0.5-0.69: Reasonably inferred but not explicit
- Below 0.5: Don't include, too uncertain

GUIDELINES:
- Extract distinct, actionable notes (not just conversation summaries)
- Avoid duplicating existing notes
- Each note should be useful to a technician or dispatcher
- Keep notes concise but complete (under 200 chars each)

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "notes": [
    {
      "type": "service_detail" | "scheduling" | "concern" | "follow_up" | "general",
      "content": "The extracted note",
      "confidence": 0.0-1.0
    }
  ],
  "keyDetails": {
    "specificIssue": "technical description or null",
    "previousWork": "past service info or null",
    "constraints": "access/timing constraints or null"
  }
}`;
}

// =====================================================
// PROMPT EXECUTION
// =====================================================

/**
 * Execute the Note Extractor prompt
 * Uses GPT-4o-mini for cost efficiency (many notes to extract)
 */
export async function executeNoteExtractor(
  input: NoteExtractorInput
): Promise<PromptResult<NoteExtractorOutput>> {
  const startTime = Date.now();
  const config = MODEL_CONFIGS.note_extractor;
  let usedModel = config.primary;

  try {
    // Format conversation for extraction
    const conversationText = input.conversationHistory
      .map(msg => `${msg.role === 'customer' ? 'Customer' : 'Business'}: ${msg.content}`)
      .join('\n');

    const existingNotesText = input.existingNotes.length > 0
      ? `\n\nEXISTING NOTES (do not duplicate):\n${input.existingNotes.map(n => `- ${n}`).join('\n')}`
      : '';

    const userMessage = `Extract actionable notes from this conversation:

CONVERSATION:
${conversationText}
${existingNotesText}

Extract all useful notes and key details.`;

    const systemPrompt = buildNoteExtractorSystemPrompt();

    // Try GPT-4o-mini first (cheaper for this task)
    let response: { content: string; tokensUsed: number } | null = null;

    try {
      response = await withTimeout(
        withRetry(
          () => callOpenAI({
            model: config.primary,
            maxTokens: 600,
            temperature: 0.2, // Low temperature for consistent extraction
            systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
          { maxRetries: config.maxRetries }
        ),
        config.timeoutMs,
        'GPT-4o-mini note extractor timed out'
      );
    } catch (primaryError) {
      jobLogger.warn({
        msg: 'Primary model failed for note extractor, falling back',
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // Fallback to Claude
      usedModel = 'claude-3-5-sonnet-20241022';
      response = await withTimeout(
        callClaude({
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 600,
          temperature: 0.2,
          systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        config.timeoutMs,
        'Claude note extractor timed out'
      );
    }

    // Parse the JSON response
    const parsed = parseJSONResponse<NoteExtractorOutput>(response.content);

    if (!parsed) {
      // Create minimal extraction on parse failure
      const fallbackOutput = createMinimalExtraction(input);
      const latencyMs = Date.now() - startTime;

      logPromptExecution('note_extractor', input, fallbackOutput, latencyMs, true);
      return successResult(fallbackOutput, usedModel, response.tokensUsed, latencyMs);
    }

    // Validate the response
    const validatedOutput = validateExtractorOutput(parsed, input);
    const latencyMs = Date.now() - startTime;

    logPromptExecution('note_extractor', input, validatedOutput, latencyMs, true);
    return successResult(validatedOutput, usedModel, response.tokensUsed, latencyMs);

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    jobLogger.error({
      msg: 'Note extractor failed',
      error: errorMessage,
      latencyMs,
    });

    logPromptExecution('note_extractor', input, null, latencyMs, false);
    return errorResult(errorMessage, usedModel, latencyMs);
  }
}

// =====================================================
// VALIDATION
// =====================================================

const VALID_NOTE_TYPES: NoteType[] = [
  'service_detail',
  'scheduling',
  'concern',
  'follow_up',
  'general',
];

/**
 * Validate extractor output
 */
function validateExtractorOutput(
  output: NoteExtractorOutput,
  input: NoteExtractorInput
): NoteExtractorOutput {
  // Validate and filter notes
  const validatedNotes: ExtractedNote[] = [];

  if (Array.isArray(output.notes)) {
    for (const note of output.notes) {
      if (
        typeof note.content === 'string' &&
        note.content.length > 0 &&
        note.content.length <= 500 && // Reasonable max length
        typeof note.confidence === 'number' &&
        note.confidence >= 0.5 && // Only include confident notes
        VALID_NOTE_TYPES.includes(note.type)
      ) {
        // Check for duplicate with existing notes
        const isDuplicate = input.existingNotes.some(existing =>
          existing.toLowerCase().includes(note.content.toLowerCase()) ||
          note.content.toLowerCase().includes(existing.toLowerCase())
        );

        if (!isDuplicate) {
          validatedNotes.push({
            type: note.type,
            content: note.content.slice(0, 200), // Enforce max length
            confidence: Math.min(1, Math.max(0, note.confidence)),
          });
        }
      }
    }
  }

  // Validate key details
  const keyDetails: KeyDetails = {
    specificIssue: typeof output.keyDetails?.specificIssue === 'string' && output.keyDetails.specificIssue.length > 0
      ? output.keyDetails.specificIssue.slice(0, 300)
      : null,
    previousWork: typeof output.keyDetails?.previousWork === 'string' && output.keyDetails.previousWork.length > 0
      ? output.keyDetails.previousWork.slice(0, 300)
      : null,
    constraints: typeof output.keyDetails?.constraints === 'string' && output.keyDetails.constraints.length > 0
      ? output.keyDetails.constraints.slice(0, 300)
      : null,
  };

  return {
    notes: validatedNotes,
    keyDetails,
  };
}

/**
 * Create minimal extraction as fallback
 */
function createMinimalExtraction(input: NoteExtractorInput): NoteExtractorOutput {
  const notes: ExtractedNote[] = [];

  // Try to extract basic info from customer messages
  const customerMessages = input.conversationHistory
    .filter(msg => msg.role === 'customer')
    .map(msg => msg.content);

  if (customerMessages.length > 0) {
    // Add the first customer message as a general note
    const firstMessage = customerMessages[0];
    if (firstMessage.length > 10) {
      notes.push({
        type: 'general',
        content: `Initial inquiry: ${firstMessage.slice(0, 150)}`,
        confidence: 0.6,
      });
    }
  }

  return {
    notes,
    keyDetails: {
      specificIssue: null,
      previousWork: null,
      constraints: null,
    },
  };
}

// =====================================================
// QUICK EXTRACTION (Rule-based, no LLM)
// =====================================================

/**
 * Quick rule-based extraction for common patterns
 * Use this as a supplement to LLM extraction
 */
export function quickExtractNotes(messages: NoteExtractorInput['conversationHistory']): ExtractedNote[] {
  const notes: ExtractedNote[] = [];
  const customerMessages = messages
    .filter(msg => msg.role === 'customer')
    .map(msg => msg.content);

  const allCustomerText = customerMessages.join(' ').toLowerCase();

  // Time/scheduling patterns
  const timePatterns = [
    { pattern: /\b(after|before)\s+(\d{1,2})\s*(am|pm|oclock)?/i, type: 'scheduling' as NoteType },
    { pattern: /\b(morning|afternoon|evening|night)\s*(only|preferred)?/i, type: 'scheduling' as NoteType },
    { pattern: /\b(weekday|weekend|saturday|sunday|monday|tuesday|wednesday|thursday|friday)s?\b/i, type: 'scheduling' as NoteType },
    { pattern: /work\s*(from\s*home|remotely)/i, type: 'scheduling' as NoteType },
  ];

  for (const { pattern, type } of timePatterns) {
    const match = allCustomerText.match(pattern);
    if (match) {
      notes.push({
        type,
        content: `Scheduling preference: ${match[0]}`,
        confidence: 0.75,
      });
    }
  }

  // Pet/access patterns
  const accessPatterns = [
    { pattern: /\b(dog|cat|pet)s?\b.*(yard|outside|home)/i, prefix: 'Pet info' },
    { pattern: /gate\s*code\s*(?:is\s*)?(\d+)/i, prefix: 'Gate code' },
    { pattern: /\b(front|back|side)\s*(door|entrance|gate)/i, prefix: 'Access' },
    { pattern: /\bpark\s*(in|on)\b/i, prefix: 'Parking' },
  ];

  for (const { pattern, prefix } of accessPatterns) {
    const match = allCustomerText.match(pattern);
    if (match) {
      notes.push({
        type: 'general',
        content: `${prefix}: ${match[0]}`,
        confidence: 0.8,
      });
    }
  }

  // Concern patterns
  const concernPatterns = [
    { pattern: /\b(bad|terrible|horrible)\s*(experience|service)/i },
    { pattern: /\b(elderly|disabled|child|baby|infant)\b/i },
    { pattern: /\b(worried|concerned|nervous)\s*(about)?/i },
  ];

  for (const { pattern } of concernPatterns) {
    const match = allCustomerText.match(pattern);
    if (match) {
      notes.push({
        type: 'concern',
        content: `Customer concern: ${match[0]}`,
        confidence: 0.7,
      });
    }
  }

  // Deduplicate by content similarity
  const uniqueNotes: ExtractedNote[] = [];
  for (const note of notes) {
    const isDuplicate = uniqueNotes.some(existing =>
      existing.content.toLowerCase().includes(note.content.toLowerCase()) ||
      note.content.toLowerCase().includes(existing.content.toLowerCase())
    );
    if (!isDuplicate) {
      uniqueNotes.push(note);
    }
  }

  return uniqueNotes;
}
