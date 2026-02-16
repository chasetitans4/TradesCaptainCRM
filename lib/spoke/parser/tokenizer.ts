// =====================================================
// SPOKE - TOKEN GRAMMAR
//
// Per Spoke Spec Section 3.2:
// Define recognition patterns for contractor speech tokens.
//
// Token Categories:
// - STATUS_COMPLETE: Job completion indicators
// - STATUS_DELAYED: Delay/reschedule indicators
// - STATUS_ISSUE: Problem indicators
// - DURATION_*: Time references
// - PAYMENT_*: Payment references
// - CUSTOMER_*: Customer references
// - CORRECTION_SIGNAL: Self-correction indicators
// - FILLER: Words to strip
// =====================================================

import type { TokenCategory, PaymentMethodToken } from '../types';

// =====================================================
// TOKEN PATTERNS
// =====================================================

/** Status completion patterns */
export const STATUS_COMPLETE_PATTERNS = [
  // Direct completion
  'finished', 'completed', 'complete', 'done', 'all done', 'all set',
  'wrapped up', 'finished up', 'taken care of', 'good to go',
  // Colloquial
  'knocked it out', 'knocked out', 'got it done', 'got er done',
  'buttoned up', 'squared away', 'in the books',
];

/** Status delay patterns */
export const STATUS_DELAYED_PATTERNS = [
  'delayed', 'postponed', 'rescheduled', 'pushed back', 'moved',
  'need to come back', 'coming back', 'return visit', 'follow up',
  'couldn\'t finish', 'ran out of time', 'need more time',
  'waiting on', 'waiting for', 'on hold', 'parts on order',
];

/** Status issue patterns */
export const STATUS_ISSUE_PATTERNS = [
  'problem', 'issue', 'trouble', 'couldn\'t', 'unable',
  'broken', 'damaged', 'failed', 'not working',
  'needs replacement', 'needs repair', 'beyond repair',
  'bigger than expected', 'more work needed',
];

/** Payment method patterns */
export const PAYMENT_METHOD_PATTERNS: Record<string, PaymentMethodToken> = {
  // Cash
  'cash': 'cash',
  'paid cash': 'cash',
  'in cash': 'cash',
  // Check
  'check': 'check',
  'cheque': 'check',
  'wrote a check': 'check',
  // Card
  'card': 'card',
  'credit': 'credit',
  'credit card': 'credit',
  'debit': 'debit',
  'debit card': 'debit',
  'charged': 'card',
  'ran the card': 'card',
  'swiped': 'card',
  // Digital
  'zelle': 'zelle',
  'venmo': 'venmo',
  'paypal': 'paypal',
  // Financing
  'financing': 'financing',
  'financed': 'financing',
  'payment plan': 'financing',
};

/** Filler words to strip */
export const FILLER_WORDS = [
  'um', 'uh', 'umm', 'uhh', 'er', 'ah', 'ahh',
  'like', 'you know', 'basically', 'actually', 'literally',
  'so', 'well', 'anyway', 'anyways', 'i mean',
  'kind of', 'sort of', 'kinda', 'sorta',
  'just', 'really', 'very', 'pretty much',
];

/** Correction signal patterns */
export const CORRECTION_SIGNALS = [
  'actually', 'wait', 'no wait', 'i mean', 'correction',
  'sorry', 'let me correct', 'that\'s wrong', 'not right',
  'actually no', 'scratch that', 'disregard', 'never mind',
];

/** Duration keyword patterns */
export const DURATION_KEYWORDS = {
  hours: ['hour', 'hours', 'hr', 'hrs'],
  minutes: ['minute', 'minutes', 'min', 'mins'],
  approximations: ['about', 'around', 'roughly', 'approximately', 'like'],
  ranges: ['to', 'and', 'or so', 'ish'],
};

/** Spoken number words */
export const SPOKEN_NUMBERS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
  'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
  'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
  'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
  // Common spoken shortcuts
  'a couple': 2, 'couple': 2, 'few': 3, 'several': 4,
  'half': 0.5, 'quarter': 0.25,
};

// =====================================================
// TOKEN DETECTION FUNCTIONS
// =====================================================

export interface Token {
  category: TokenCategory;
  value: string;
  normalized?: string | number;
  start: number;
  end: number;
  confidence: number;
}

/**
 * Detect status tokens in text
 */
export function detectStatusTokens(text: string): Token[] {
  const tokens: Token[] = [];
  const lowerText = text.toLowerCase();

  // Check completion patterns
  for (const pattern of STATUS_COMPLETE_PATTERNS) {
    const index = lowerText.indexOf(pattern);
    if (index !== -1) {
      tokens.push({
        category: 'STATUS_COMPLETE',
        value: pattern,
        normalized: 'complete',
        start: index,
        end: index + pattern.length,
        confidence: 0.9,
      });
    }
  }

  // Check delay patterns
  for (const pattern of STATUS_DELAYED_PATTERNS) {
    const index = lowerText.indexOf(pattern);
    if (index !== -1) {
      tokens.push({
        category: 'STATUS_DELAYED',
        value: pattern,
        normalized: 'delayed',
        start: index,
        end: index + pattern.length,
        confidence: 0.85,
      });
    }
  }

  // Check issue patterns
  for (const pattern of STATUS_ISSUE_PATTERNS) {
    const index = lowerText.indexOf(pattern);
    if (index !== -1) {
      tokens.push({
        category: 'STATUS_ISSUE',
        value: pattern,
        normalized: 'issue',
        start: index,
        end: index + pattern.length,
        confidence: 0.85,
      });
    }
  }

  return tokens;
}

/**
 * Detect payment method tokens
 */
export function detectPaymentMethodTokens(text: string): Token[] {
  const tokens: Token[] = [];
  const lowerText = text.toLowerCase();

  for (const [pattern, method] of Object.entries(PAYMENT_METHOD_PATTERNS)) {
    const index = lowerText.indexOf(pattern);
    if (index !== -1) {
      tokens.push({
        category: 'PAYMENT_METHOD',
        value: pattern,
        normalized: method,
        start: index,
        end: index + pattern.length,
        confidence: 0.9,
      });
    }
  }

  return tokens;
}

/**
 * Detect correction signals
 */
export function detectCorrectionSignals(text: string): Token[] {
  const tokens: Token[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of CORRECTION_SIGNALS) {
    const index = lowerText.indexOf(pattern);
    if (index !== -1) {
      tokens.push({
        category: 'CORRECTION_SIGNAL',
        value: pattern,
        start: index,
        end: index + pattern.length,
        confidence: 0.85,
      });
    }
  }

  return tokens;
}

/**
 * Strip filler words from text
 */
export function stripFillerWords(text: string): string {
  let result = text;

  // Sort by length (longest first) to avoid partial replacements
  const sortedFillers = [...FILLER_WORDS].sort((a, b) => b.length - a.length);

  for (const filler of sortedFillers) {
    // Use word boundary regex to avoid partial word matches
    const regex = new RegExp(`\\b${escapeRegex(filler)}\\b`, 'gi');
    result = result.replace(regex, ' ');
  }

  // Clean up multiple spaces
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Tokenize a complete transcript
 */
export function tokenizeTranscript(text: string): {
  tokens: Token[];
  cleanedText: string;
  hasCorrections: boolean;
} {
  // First, detect correction signals
  const correctionTokens = detectCorrectionSignals(text);
  const hasCorrections = correctionTokens.length > 0;

  // Strip filler words
  const cleanedText = stripFillerWords(text);

  // Collect all tokens
  const tokens: Token[] = [
    ...detectStatusTokens(cleanedText),
    ...detectPaymentMethodTokens(cleanedText),
    ...correctionTokens,
  ];

  // Sort by position
  tokens.sort((a, b) => a.start - b.start);

  return {
    tokens,
    cleanedText,
    hasCorrections,
  };
}

/**
 * Check if text contains any status indicators
 */
export function hasStatusIndicator(text: string): boolean {
  const lowerText = text.toLowerCase();

  return (
    STATUS_COMPLETE_PATTERNS.some(p => lowerText.includes(p)) ||
    STATUS_DELAYED_PATTERNS.some(p => lowerText.includes(p)) ||
    STATUS_ISSUE_PATTERNS.some(p => lowerText.includes(p))
  );
}

/**
 * Check if text contains payment information
 */
export function hasPaymentIndicator(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Check for payment methods
  const hasMethod = Object.keys(PAYMENT_METHOD_PATTERNS).some(p =>
    lowerText.includes(p)
  );

  // Check for amount keywords
  const amountKeywords = ['paid', 'collected', 'got', 'received', 'dollars', 'bucks'];
  const hasAmountKeyword = amountKeywords.some(k => lowerText.includes(k));

  // Check for dollar sign or number patterns
  const hasAmountPattern = /\$?\d+/.test(text);

  return hasMethod || (hasAmountKeyword && hasAmountPattern);
}

/**
 * Check if text contains duration information
 */
export function hasDurationIndicator(text: string): boolean {
  const lowerText = text.toLowerCase();

  const allDurationWords = [
    ...DURATION_KEYWORDS.hours,
    ...DURATION_KEYWORDS.minutes,
    'took', 'spent', 'was there', 'on site',
  ];

  return allDurationWords.some(w => lowerText.includes(w));
}

// =====================================================
// HELPERS
// =====================================================

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
