// =====================================================
// Trades Captain AI - Base Prompt Utilities
// Shared utilities for all prompt modules
// =====================================================

import 'openai/shims/node';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { jobLogger } from '@/lib/logger';
import {
  PromptResult,
  PromptExecutionOptions,
  AIModelConfig,
} from '@/types/leads-captain/prompt-types';

// =====================================================
// AI CLIENT SINGLETONS
// =====================================================

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

export function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set.');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// =====================================================
// DEFAULT CONFIGURATIONS
// =====================================================

export const DEFAULT_PROMPT_OPTIONS: PromptExecutionOptions = {
  maxRetries: 2,
  timeoutMs: 10000,
  fallbackModel: 'gpt-4o',
};

export const MODEL_CONFIGS: Record<string, AIModelConfig> = {
  conversation_agent: {
    primary: 'claude-3-5-sonnet-20241022',
    fallback: 'gpt-4o',
    maxRetries: 2,
    timeoutMs: 8000, // Realtime needs fast response
  },
  emergency_classifier: {
    primary: 'claude-3-5-sonnet-20241022',
    fallback: 'gpt-4o',
    maxRetries: 2,
    timeoutMs: 5000, // Emergency needs immediate response
  },
  conversation_analyzer: {
    primary: 'claude-3-5-sonnet-20241022',
    fallback: 'gpt-4o',
    maxRetries: 3,
    timeoutMs: 30000, // Async, can take longer
  },
  note_extractor: {
    primary: 'gpt-4o-mini',
    fallback: 'gpt-4o',
    maxRetries: 2,
    timeoutMs: 10000,
  },
};

// =====================================================
// RETRY LOGIC
// =====================================================

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if it's a non-retryable error
      if (isNonRetryableError(lastError)) {
        throw lastError;
      }

      if (attempt < opts.maxRetries) {
        jobLogger.warn({
          msg: 'Prompt execution retry',
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          error: lastError.message,
          nextDelayMs: delay,
        });

        await sleep(delay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Don't retry authentication errors
  if (message.includes('unauthorized') || message.includes('invalid api key')) {
    return true;
  }

  // Don't retry content policy violations
  if (message.includes('content policy') || message.includes('safety')) {
    return true;
  }

  // Don't retry malformed request errors
  if (message.includes('invalid request') || message.includes('bad request')) {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================
// TIMEOUT HANDLING
// =====================================================

/**
 * Execute a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// =====================================================
// JSON PARSING
// =====================================================

/**
 * Parse JSON from AI response with fallback handling
 */
export function parseJSONResponse<T>(
  text: string,
  defaultValue?: T
): T | null {
  // Try to extract JSON from code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    return JSON.parse(jsonText.trim());
  } catch {
    // Try to find JSON object in text
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Fall through
      }
    }

    // Try to find JSON array in text
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // Fall through
      }
    }

    jobLogger.warn({
      msg: 'Failed to parse JSON from AI response',
      text: text.slice(0, 200),
    });

    return defaultValue ?? null;
  }
}

// =====================================================
// CLAUDE API HELPERS
// =====================================================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt: string;
  messages: ClaudeMessage[];
}

/**
 * Call Claude API with standardized options
 */
export async function callClaude(options: ClaudeOptions): Promise<{
  content: string;
  tokensUsed: number;
}> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: options.model || 'claude-3-5-sonnet-20241022',
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature ?? 0.3,
    system: options.systemPrompt,
    messages: options.messages,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return {
    content: content.text,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

// =====================================================
// OPENAI API HELPERS
// =====================================================

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Call OpenAI API with standardized options
 */
export async function callOpenAI(options: OpenAIOptions): Promise<{
  content: string;
  tokensUsed: number;
}> {
  const openai = getOpenAI();

  const messages: OpenAIMessage[] = [
    { role: 'system', content: options.systemPrompt },
    ...options.messages,
  ];

  const response = await openai.chat.completions.create({
    model: options.model || 'gpt-4o',
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature ?? 0.3,
    messages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return {
    content,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

// =====================================================
// PROMPT RESULT HELPERS
// =====================================================

/**
 * Create a successful prompt result
 */
export function successResult<T>(
  data: T,
  model: string,
  tokensUsed: number,
  latencyMs: number
): PromptResult<T> {
  return {
    success: true,
    data,
    error: null,
    model,
    tokensUsed,
    latencyMs,
  };
}

/**
 * Create a failed prompt result
 */
export function errorResult<T>(
  error: string,
  model: string,
  latencyMs: number
): PromptResult<T> {
  return {
    success: false,
    data: null,
    error,
    model,
    tokensUsed: 0,
    latencyMs,
  };
}

// =====================================================
// TEXT UTILITIES
// =====================================================

/**
 * Truncate text to max length at word boundary
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // Try to truncate at sentence boundary
  const targetLength = maxLength - 3;
  const sentenceEnd = text.lastIndexOf('. ', targetLength);

  if (sentenceEnd > maxLength * 0.5) {
    return text.slice(0, sentenceEnd + 1);
  }

  // Fall back to word boundary
  const wordEnd = text.lastIndexOf(' ', targetLength);
  if (wordEnd > maxLength * 0.5) {
    return text.slice(0, wordEnd) + '...';
  }

  return text.slice(0, targetLength) + '...';
}

/**
 * Clean and normalize text for processing
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ');
}

/**
 * Extract potential emergency keywords from text
 */
export function extractEmergencyKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();

  const emergencyPatterns = [
    { pattern: /\b(gas\s*leak|smell\s*(of\s*)?gas|gas\s*smell)\b/i, keyword: 'gas_leak' },
    { pattern: /\b(flood|flooding|water\s*everywhere|burst\s*pipe|pipe\s*burst)\b/i, keyword: 'flooding' },
    { pattern: /\b(no\s*heat|heater?\s*(broken|not\s*working)|furnace\s*(broken|out|not\s*working))\b/i, keyword: 'no_heat' },
    { pattern: /\b(no\s*ac|no\s*air|ac\s*(broken|not\s*working)|air\s*condition(er|ing)?\s*(broken|not\s*working))\b/i, keyword: 'no_ac' },
    { pattern: /\b(electric(al)?\s*(fire|spark|problem)|spark(s|ing)?|exposed\s*wire)\b/i, keyword: 'electrical' },
    { pattern: /\b(sewage|sewer|backup|overflow)\b/i, keyword: 'sewage' },
    { pattern: /\b(carbon\s*monoxide|co\s*detector|co\s*alarm)\b/i, keyword: 'carbon_monoxide' },
    { pattern: /\b(emergency|urgent|asap|right\s*now|immediately)\b/i, keyword: 'urgent' },
  ];

  for (const { pattern, keyword } of emergencyPatterns) {
    if (pattern.test(lowerText)) {
      keywords.push(keyword);
    }
  }

  // Check for negations to filter out false positives
  const negationPatterns = [
    /no\s+(gas\s*leak|leak)/i,
    /don'?t\s+(have|smell)/i,
    /isn'?t\s+(leaking|flooding)/i,
    /stopped\s+(flooding|leaking)/i,
    /fixed\s+(the|my)/i,
  ];

  const hasNegation = negationPatterns.some(p => p.test(lowerText));
  if (hasNegation) {
    // Remove non-critical keywords if negation detected
    return keywords.filter(k => ['gas_leak', 'carbon_monoxide', 'electrical'].includes(k));
  }

  return keywords;
}

/**
 * Get current season based on date and hemisphere
 */
export function getCurrentSeason(date: Date = new Date(), isNorthernHemisphere = true): 'winter' | 'spring' | 'summer' | 'fall' {
  const month = date.getMonth() + 1; // 1-12

  if (isNorthernHemisphere) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  } else {
    if (month >= 3 && month <= 5) return 'fall';
    if (month >= 6 && month <= 8) return 'winter';
    if (month >= 9 && month <= 11) return 'spring';
    return 'summer';
  }
}

// =====================================================
// LOGGING HELPERS
// =====================================================

/**
 * Log prompt execution for debugging
 */
export function logPromptExecution(
  promptName: string,
  input: unknown,
  output: unknown,
  latencyMs: number,
  success: boolean
): void {
  jobLogger.info({
    msg: `Prompt executed: ${promptName}`,
    promptName,
    latencyMs,
    success,
    inputSummary: typeof input === 'object' ? Object.keys(input as object) : 'primitive',
    outputSummary: typeof output === 'object' ? Object.keys(output as object) : 'primitive',
  });
}
