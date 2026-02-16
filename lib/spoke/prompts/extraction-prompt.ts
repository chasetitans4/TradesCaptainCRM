// =====================================================
// SPOKE - CLAUDE EXTRACTION PROMPT
//
// Per Spoke Spec Section 4:
// Claude-based extraction of structured data from transcripts.
//
// This prompt is designed to:
// 1. Extract job status, payment, duration, and notes
// 2. Handle contractor speech patterns
// 3. Detect self-corrections
// 4. Identify customer references
// 5. Return structured JSON with confidence signals
// =====================================================

import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_CONFIG } from '../config';
import type { SpokeParsedData } from '../types';
import { smsLogger } from '@/lib/logger';

const extractionLogger = smsLogger.child({ context: 'spoke.extraction' });

// =====================================================
// SYSTEM PROMPT
// =====================================================

const EXTRACTION_SYSTEM_PROMPT = `You are a voice update parser for a field service CRM. Your job is to extract structured data from transcribed voice messages left by technicians after completing jobs.

## Your Task
Parse the technician's voice message and extract:
1. **Job Status**: Did they complete the job, encounter an issue, or need to return?
2. **Payment**: How much did they collect and by what method?
3. **Duration**: How long did the job take?
4. **Notes**: Any relevant work details, observations, or follow-up needs
5. **Customer Reference**: Who is the customer (name or pronoun reference)?
6. **Self-Corrections**: Did the technician correct themselves? Use the CORRECTED value.

## Important Rules
- Technicians often say "four fifty" to mean $450, not $4.50
- "A couple hours" means about 2 hours
- Look for self-corrections: "actually", "wait", "no", "I mean" — use the CORRECTED value
- If information is unclear or missing, mark confidence as low
- Payment amounts are CRITICAL — only extract if you're confident

## Output Format
Return ONLY valid JSON with this structure:
{
  "status": {
    "value": "complete" | "delayed" | "issue" | "in_progress" | null,
    "confidence": 0.0-1.0,
    "evidence": "quoted text that indicates status"
  },
  "payment": {
    "amount": number | null,
    "method": "cash" | "check" | "card" | "credit" | "debit" | "zelle" | "venmo" | null,
    "confidence": 0.0-1.0,
    "evidence": "quoted text about payment"
  },
  "duration": {
    "minutes": number | null,
    "confidence": 0.0-1.0,
    "evidence": "quoted text about duration"
  },
  "notes": {
    "value": "cleaned up summary of work done",
    "category": "work_done" | "materials" | "issue" | "follow_up" | "general",
    "confidence": 0.0-1.0
  },
  "customer": {
    "reference": "name or pronoun found" | null,
    "type": "name" | "pronoun" | null,
    "confidence": 0.0-1.0
  },
  "corrections": [
    {
      "field": "payment" | "status" | "duration",
      "original": "what they first said",
      "corrected": "what they corrected to"
    }
  ],
  "multi_job_detected": boolean
}

## Confidence Guidelines
- 0.95+: Explicit, unambiguous statement
- 0.85-0.94: Clear but informal language
- 0.70-0.84: Implied or contextual
- 0.50-0.69: Uncertain, needs verification
- <0.50: Guessing, don't include

## Examples

Input: "Hey finished up at the Martinez place. Took about two hours. They paid four fifty cash."
Output:
{
  "status": {"value": "complete", "confidence": 0.95, "evidence": "finished up"},
  "payment": {"amount": 450, "method": "cash", "confidence": 0.92, "evidence": "paid four fifty cash"},
  "duration": {"minutes": 120, "confidence": 0.88, "evidence": "about two hours"},
  "notes": {"value": "Completed service at Martinez residence", "category": "work_done", "confidence": 0.85},
  "customer": {"reference": "Martinez", "type": "name", "confidence": 0.95},
  "corrections": [],
  "multi_job_detected": false
}

Input: "Done at Johnson's. Wait no, actually three twenty-five. She paid by card."
Output:
{
  "status": {"value": "complete", "confidence": 0.92, "evidence": "Done"},
  "payment": {"amount": 325, "method": "card", "confidence": 0.90, "evidence": "actually three twenty-five"},
  "duration": {"minutes": null, "confidence": 0.0, "evidence": null},
  "notes": {"value": "Job completed at Johnson residence", "category": "work_done", "confidence": 0.80},
  "customer": {"reference": "Johnson", "type": "name", "confidence": 0.95},
  "corrections": [{"field": "payment", "original": "unclear", "corrected": "325"}],
  "multi_job_detected": false
}`;

// =====================================================
// EXTRACTION FUNCTION
// =====================================================

export interface ExtractionResult {
  success: boolean;
  data?: SpokeParsedData;
  rawResponse?: string;
  error?: string;
  latencyMs: number;
}

/**
 * Extract structured data from transcript using Claude
 */
export async function extractFromTranscript(
  transcript: string,
  context?: {
    contractorName?: string;
    recentCustomers?: string[];
    recentJobs?: { customerName: string; serviceType: string }[];
  }
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'ANTHROPIC_API_KEY not configured',
        latencyMs: Date.now() - startTime,
      };
    }

    const client = new Anthropic({ apiKey });

    // Build user prompt with context
    let userPrompt = `Parse this technician voice update:\n\n"${transcript}"`;

    if (context?.recentCustomers?.length) {
      userPrompt += `\n\nRecent customers this tech has visited: ${context.recentCustomers.join(', ')}`;
    }

    if (context?.recentJobs?.length) {
      userPrompt += `\n\nRecent jobs today:\n${context.recentJobs.map(j => `- ${j.customerName}: ${j.serviceType}`).join('\n')}`;
    }

    const response = await client.messages.create({
      model: CLAUDE_CONFIG.MODEL,
      max_tokens: CLAUDE_CONFIG.MAX_TOKENS,
      temperature: CLAUDE_CONFIG.TEMPERATURE,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const latencyMs = Date.now() - startTime;

    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        error: 'No text response from Claude',
        latencyMs,
      };
    }

    const rawResponse = textContent.text;

    // Parse JSON from response
    const parsed = parseExtractionResponse(rawResponse);

    if (!parsed) {
      extractionLogger.warn({
        msg: 'Failed to parse extraction response',
        rawResponse: rawResponse.substring(0, 500),
      });
      return {
        success: false,
        error: 'Failed to parse Claude response as JSON',
        rawResponse,
        latencyMs,
      };
    }

    extractionLogger.info({
      msg: 'Extraction successful',
      hasStatus: !!parsed.status,
      hasPayment: !!parsed.payment,
      hasDuration: !!parsed.duration,
      hasCustomer: !!parsed.customer,
      latencyMs,
    });

    return {
      success: true,
      data: parsed,
      rawResponse,
      latencyMs,
    };

  } catch (error) {
    extractionLogger.error({
      msg: 'Extraction failed',
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Parse the extraction response JSON
 */
function parseExtractionResponse(response: string): SpokeParsedData | null {
  try {
    // Try to extract JSON from response (might have markdown code blocks)
    let jsonStr = response;

    // Check for code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Transform to our internal format
    const result: SpokeParsedData = {};

    if (parsed.status?.value && parsed.status.confidence >= 0.5) {
      result.status = {
        value: parsed.status.value,
        confidence: parsed.status.confidence,
        raw_tokens: parsed.status.evidence ? [parsed.status.evidence] : [],
      };
    }

    if (parsed.payment?.amount !== null && parsed.payment?.confidence >= 0.5) {
      result.payment = {
        amount: parsed.payment.amount,
        method: parsed.payment.method || null,
        confidence: parsed.payment.confidence,
        raw_tokens: parsed.payment.evidence ? [parsed.payment.evidence] : [],
      };
    }

    if (parsed.duration?.minutes !== null && parsed.duration?.confidence >= 0.5) {
      result.duration = {
        minutes: parsed.duration.minutes,
        confidence: parsed.duration.confidence,
        raw_tokens: parsed.duration.evidence ? [parsed.duration.evidence] : [],
      };
    }

    if (parsed.notes?.value && parsed.notes?.confidence >= 0.5) {
      result.notes = {
        value: parsed.notes.value,
        confidence: parsed.notes.confidence,
        category: parsed.notes.category || 'general',
      };
    }

    if (parsed.customer?.reference && parsed.customer?.confidence >= 0.5) {
      result.customer = {
        value: parsed.customer.reference,
        type: parsed.customer.type || 'name',
        confidence: parsed.customer.confidence,
      };
    }

    if (parsed.corrections?.length > 0) {
      result.corrections_detected = parsed.corrections.map((c: any) => ({
        field: c.field,
        original: c.original,
        corrected: c.corrected,
      }));
    }

    if (parsed.multi_job_detected) {
      result.multi_job_detected = true;
    }

    return result;

  } catch (error) {
    extractionLogger.error({
      msg: 'JSON parse error',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// =====================================================
// DISAMBIGUATION PROMPT
// =====================================================

const DISAMBIGUATION_SYSTEM_PROMPT = `You help resolve ambiguous voice updates from field technicians.

Given a transcript that has unclear information, ask ONE clarifying question to resolve the most important ambiguity.

Focus on:
1. Payment amount if mentioned but unclear
2. Which job if multiple customers mentioned
3. Status if unclear whether complete or not

Return JSON:
{
  "ambiguity_type": "payment" | "customer" | "status" | "multiple_jobs",
  "clarification_question": "Short question for SMS",
  "options": ["option1", "option2"] // if applicable
}`;

/**
 * Generate a clarification question for ambiguous input
 */
export async function generateClarification(
  transcript: string,
  ambiguities: string[]
): Promise<{ question: string; options?: string[] } | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: CLAUDE_CONFIG.MODEL,
      max_tokens: 256,
      temperature: 0.3,
      system: DISAMBIGUATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Transcript: "${transcript}"\n\nAmbiguities detected: ${ambiguities.join(', ')}\n\nGenerate a clarification question.`,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') return null;

    const parsed = JSON.parse(textContent.text);

    return {
      question: parsed.clarification_question,
      options: parsed.options,
    };

  } catch (error) {
    extractionLogger.error({
      msg: 'Clarification generation failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
