// =====================================================
// SPOKE - NUMBER NORMALIZER
//
// Per Spoke Spec Section 3.3:
// Convert spoken numbers to numeric values.
//
// Examples:
// - "four fifty" → 450 (context: payment)
// - "four fifty" → 4.5 (context: hours)
// - "two hours" → 120 (minutes)
// - "about an hour and a half" → 90 (minutes)
// - "three hundred twenty-five dollars" → 325
// =====================================================

import { SPOKEN_NUMBERS } from './tokenizer';

export interface NormalizedNumber {
  value: number;
  confidence: number;
  original: string;
  context?: 'payment' | 'duration_hours' | 'duration_minutes' | 'generic';
}

// =====================================================
// NUMBER WORD MAPPINGS
// =====================================================

const WORD_TO_NUMBER: Record<string, number> = {
  ...SPOKEN_NUMBERS,
  // Additional mappings
  'a': 1, 'an': 1,
  'first': 1, 'second': 2, 'third': 3,
  'once': 1, 'twice': 2,
  'dozen': 12,
  'grand': 1000,
};

const MULTIPLIERS: Record<string, number> = {
  'hundred': 100,
  'thousand': 1000,
  'grand': 1000,
  'k': 1000,
};

const CONNECTORS = ['and', '-', ' '];

// =====================================================
// PAYMENT NORMALIZATION
// =====================================================

/**
 * Normalize a payment amount from spoken text
 *
 * Special handling for contractor payment patterns:
 * - "four fifty" → 450 (not 4.50)
 * - "four hundred fifty" → 450
 * - "three twenty-five" → 325
 * - "a hundred" → 100
 * - "two grand" → 2000
 */
export function normalizePaymentAmount(text: string): NormalizedNumber | null {
  const cleaned = text.toLowerCase().trim();

  // Try direct digit extraction first
  const digitMatch = cleaned.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (digitMatch) {
    const value = parseFloat(digitMatch[1].replace(/,/g, ''));
    return {
      value,
      confidence: 0.95,
      original: text,
      context: 'payment',
    };
  }

  // Parse spoken numbers
  const result = parseSpokenPayment(cleaned);
  if (result !== null) {
    return {
      value: result.value,
      confidence: result.confidence,
      original: text,
      context: 'payment',
    };
  }

  return null;
}

/**
 * Parse spoken payment patterns
 */
function parseSpokenPayment(text: string): { value: number; confidence: number } | null {
  // Remove common prefixes
  let cleaned = text
    .replace(/collected|got|received|paid|for|of|dollars?|bucks?/gi, '')
    .trim();

  // Handle "X grand" (thousands)
  const grandMatch = cleaned.match(/(\w+)\s+grand/i);
  if (grandMatch) {
    const num = WORD_TO_NUMBER[grandMatch[1].toLowerCase()];
    if (num !== undefined) {
      return { value: num * 1000, confidence: 0.90 };
    }
  }

  // Handle "X hundred Y" or just "X hundred"
  const hundredMatch = cleaned.match(/(\w+)\s+hundred(?:\s+(?:and\s+)?(\w+(?:\s*-?\s*\w+)?))?/i);
  if (hundredMatch) {
    const hundreds = WORD_TO_NUMBER[hundredMatch[1].toLowerCase()];
    if (hundreds !== undefined) {
      let total = hundreds * 100;
      if (hundredMatch[2]) {
        const remainder = parseSimpleNumber(hundredMatch[2]);
        if (remainder !== null) {
          total += remainder;
        }
      }
      return { value: total, confidence: 0.88 };
    }
  }

  // Handle two-word patterns like "four fifty" → 450
  // This is the common contractor pattern
  const twoWordMatch = cleaned.match(/^(\w+)\s+(\w+)$/);
  if (twoWordMatch) {
    const first = WORD_TO_NUMBER[twoWordMatch[1].toLowerCase()];
    const second = WORD_TO_NUMBER[twoWordMatch[2].toLowerCase()];

    if (first !== undefined && second !== undefined) {
      // "four fifty" → 450 (4 * 100 + 50)
      if (first >= 1 && first <= 9 && second >= 10 && second <= 99) {
        return { value: first * 100 + second, confidence: 0.85 };
      }
      // "twenty five" → 25
      if (first >= 20 && first <= 90 && second >= 1 && second <= 9) {
        return { value: first + second, confidence: 0.90 };
      }
    }
  }

  // Handle single word numbers
  const singleNum = parseSimpleNumber(cleaned);
  if (singleNum !== null) {
    return { value: singleNum, confidence: 0.85 };
  }

  // Handle hyphenated numbers like "twenty-five"
  const hyphenated = cleaned.replace(/-/g, ' ');
  if (hyphenated !== cleaned) {
    const result = parseSimpleNumber(hyphenated);
    if (result !== null) {
      return { value: result, confidence: 0.85 };
    }
  }

  return null;
}

/**
 * Parse simple number words (no hundreds/thousands)
 */
function parseSimpleNumber(text: string): number | null {
  const words = text.toLowerCase().split(/\s+/);

  if (words.length === 1) {
    return WORD_TO_NUMBER[words[0]] ?? null;
  }

  if (words.length === 2) {
    const first = WORD_TO_NUMBER[words[0]];
    const second = WORD_TO_NUMBER[words[1]];

    if (first !== undefined && second !== undefined) {
      // Handle "twenty five" → 25
      if (first >= 20 && first <= 90 && first % 10 === 0 && second >= 1 && second <= 9) {
        return first + second;
      }
    }
  }

  return null;
}

// =====================================================
// DURATION NORMALIZATION
// =====================================================

/**
 * Normalize duration to minutes
 *
 * Examples:
 * - "two hours" → 120
 * - "an hour and a half" → 90
 * - "about 45 minutes" → 45
 * - "couple hours" → 120
 * - "hour and fifteen" → 75
 */
export function normalizeDuration(text: string): NormalizedNumber | null {
  const cleaned = text.toLowerCase().trim();

  // Direct digit + unit extraction
  const digitHourMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)s?/i);
  if (digitHourMatch) {
    const hours = parseFloat(digitHourMatch[1]);
    let minutes = hours * 60;

    // Check for additional minutes
    const additionalMins = cleaned.match(/(?:and|plus)\s*(\d+)\s*(?:minute|min)s?/i);
    if (additionalMins) {
      minutes += parseInt(additionalMins[1], 10);
    }

    return {
      value: Math.round(minutes),
      confidence: 0.92,
      original: text,
      context: 'duration_minutes',
    };
  }

  const digitMinMatch = cleaned.match(/(\d+)\s*(?:minute|min)s?/i);
  if (digitMinMatch) {
    return {
      value: parseInt(digitMinMatch[1], 10),
      confidence: 0.95,
      original: text,
      context: 'duration_minutes',
    };
  }

  // Parse spoken duration
  const result = parseSpokenDuration(cleaned);
  if (result !== null) {
    return {
      value: result.value,
      confidence: result.confidence,
      original: text,
      context: 'duration_minutes',
    };
  }

  return null;
}

/**
 * Parse spoken duration patterns
 */
function parseSpokenDuration(text: string): { value: number; confidence: number } | null {
  let totalMinutes = 0;
  let confidence = 0.85;

  // Remove approximation words
  let cleaned = text.replace(/about|around|roughly|approximately|like/gi, '').trim();

  // Handle "a couple hours" / "a few hours"
  if (/couple\s+(?:of\s+)?hours?/i.test(cleaned)) {
    return { value: 120, confidence: 0.80 };
  }
  if (/few\s+hours?/i.test(cleaned)) {
    return { value: 180, confidence: 0.75 };
  }

  // Handle "half hour" / "half an hour"
  if (/half\s+(?:an?\s+)?hour/i.test(cleaned)) {
    totalMinutes = 30;

    // Check for "and a half hour" (1.5 hours)
    if (/and\s+(?:a\s+)?half/i.test(cleaned)) {
      // There's probably hours mentioned too
    } else {
      return { value: 30, confidence: 0.90 };
    }
  }

  // Handle "X hour(s)"
  const hourPatterns = [
    /(\w+)\s+(?:and\s+(?:a\s+)?half\s+)?hours?/i,
    /an?\s+hour/i,
  ];

  for (const pattern of hourPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let hours = 1; // default for "an hour"

      if (match[1]) {
        const wordNum = WORD_TO_NUMBER[match[1].toLowerCase()];
        if (wordNum !== undefined) {
          hours = wordNum;
        }
      }

      totalMinutes = hours * 60;

      // Check for "and a half"
      if (/and\s+(?:a\s+)?half/i.test(cleaned)) {
        totalMinutes += 30;
      }

      // Check for additional minutes
      const minMatch = cleaned.match(/(?:and\s+)?(\w+)\s*(?:minute|min)s?/i);
      if (minMatch && minMatch[1]) {
        const mins = WORD_TO_NUMBER[minMatch[1].toLowerCase()];
        if (mins !== undefined) {
          totalMinutes += mins;
        } else {
          const digitMins = parseInt(minMatch[1], 10);
          if (!isNaN(digitMins)) {
            totalMinutes += digitMins;
          }
        }
      }

      if (totalMinutes > 0) {
        return { value: totalMinutes, confidence };
      }
    }
  }

  // Handle standalone minutes
  const minOnlyMatch = cleaned.match(/(\w+)\s*(?:minute|min)s?/i);
  if (minOnlyMatch) {
    const mins = WORD_TO_NUMBER[minOnlyMatch[1].toLowerCase()];
    if (mins !== undefined) {
      return { value: mins, confidence: 0.85 };
    }
  }

  return totalMinutes > 0 ? { value: totalMinutes, confidence } : null;
}

// =====================================================
// GENERIC NUMBER EXTRACTION
// =====================================================

/**
 * Extract all numbers from text (both digit and spoken)
 */
export function extractAllNumbers(text: string): NormalizedNumber[] {
  const results: NormalizedNumber[] = [];
  const cleaned = text.toLowerCase();

  // Extract digit numbers
  const digitMatches = cleaned.matchAll(/\$?\d+(?:,\d{3})*(?:\.\d+)?/g);
  for (const match of digitMatches) {
    const value = parseFloat(match[0].replace(/[$,]/g, ''));
    results.push({
      value,
      confidence: 0.95,
      original: match[0],
      context: 'generic',
    });
  }

  // Try to identify context and extract spoken numbers
  if (hasPaymentIndicator(text)) {
    const payment = normalizePaymentAmount(text);
    if (payment && !results.some(r => r.value === payment.value)) {
      results.push(payment);
    }
  }

  if (hasDurationIndicator(text)) {
    const duration = normalizeDuration(text);
    if (duration && !results.some(r => r.value === duration.value)) {
      results.push(duration);
    }
  }

  return results;
}

// =====================================================
// HELPERS
// =====================================================

function hasPaymentIndicator(text: string): boolean {
  const paymentKeywords = ['paid', 'collected', 'got', 'dollars', 'bucks', 'cash', 'check', 'card'];
  const lower = text.toLowerCase();
  return paymentKeywords.some(k => lower.includes(k));
}

function hasDurationIndicator(text: string): boolean {
  const durationKeywords = ['hour', 'minute', 'took', 'spent', 'was there'];
  const lower = text.toLowerCase();
  return durationKeywords.some(k => lower.includes(k));
}
