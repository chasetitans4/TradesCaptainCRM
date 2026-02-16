// =====================================================
// SPOKE - MESSAGE COMPRESSOR
//
// Per Spoke Spec Section 8.2:
// Compress messages to fit SMS limits.
//
// Strategy:
// 1. Remove optional punctuation
// 2. Use abbreviations
// 3. Truncate notes
// 4. Remove low-value info
// =====================================================

import { smsLogger } from '@/lib/logger';

const compressorLogger = smsLogger.child({ context: 'spoke.compressor' });

// =====================================================
// TYPES
// =====================================================

export interface CompressionResult {
  /** Compressed message */
  message: string;

  /** Original length */
  originalLength: number;

  /** Compressed length */
  compressedLength: number;

  /** Compression techniques used */
  techniques: string[];

  /** Whether target was achieved */
  targetAchieved: boolean;
}

// =====================================================
// COMPRESSION RULES
// =====================================================

/**
 * Abbreviations for common words
 */
const ABBREVIATIONS: Record<string, string> = {
  'complete': 'done',
  'completed': 'done',
  'finished': 'done',
  'payment': 'pay',
  'received': 'rcvd',
  'customer': 'cust',
  'approximately': '~',
  'about': '~',
  'minutes': 'min',
  'minute': 'min',
  'hours': 'hrs',
  'hour': 'hr',
  'dollars': '',  // Remove, $ symbol suffices
  'and': '&',
  'with': 'w/',
  'without': 'w/o',
  'please': 'pls',
  'information': 'info',
  'change': 'chg',
  'reply': 'rply',
  'update': 'upd',
  'confirmed': 'cfmd',
  'confirmation': 'cfm',
};

/**
 * Phrases that can be removed if needed
 */
const REMOVABLE_PHRASES = [
  'Reply EDIT to change.',
  'EDIT to fix.',
  ' | ',  // Replace with space
  'the ',
  'your ',
  'has been ',
  'have been ',
];

// =====================================================
// COMPRESSION FUNCTIONS
// =====================================================

/**
 * Compress a message to fit target length
 *
 * @param message - Original message
 * @param targetLength - Target character count (default 160)
 * @param options - Compression options
 */
export function compressMessage(
  message: string,
  targetLength: number = 160,
  options?: {
    preserveEditPrompt?: boolean;
    preserveEmoji?: boolean;
  }
): CompressionResult {
  const originalLength = message.length;
  let compressed = message;
  const techniques: string[] = [];

  // Already fits
  if (compressed.length <= targetLength) {
    return {
      message: compressed,
      originalLength,
      compressedLength: compressed.length,
      techniques: [],
      targetAchieved: true,
    };
  }

  // Level 1: Apply abbreviations
  compressed = applyAbbreviations(compressed);
  if (compressed !== message) {
    techniques.push('abbreviations');
  }

  if (compressed.length <= targetLength) {
    return buildResult(message, compressed, techniques, true);
  }

  // Level 2: Remove optional punctuation
  compressed = removeOptionalPunctuation(compressed);
  techniques.push('punctuation');

  if (compressed.length <= targetLength) {
    return buildResult(message, compressed, techniques, true);
  }

  // Level 3: Replace delimiters
  compressed = compressed.replace(/ \| /g, ' ');
  techniques.push('delimiters');

  if (compressed.length <= targetLength) {
    return buildResult(message, compressed, techniques, true);
  }

  // Level 4: Remove edit prompt (if allowed)
  if (!options?.preserveEditPrompt) {
    compressed = compressed.replace(/\n?Reply EDIT to change\.?/i, '');
    compressed = compressed.replace(/\n?EDIT to fix\.?/i, '');
    techniques.push('edit_prompt_removed');

    if (compressed.length <= targetLength) {
      return buildResult(message, compressed, techniques, true);
    }
  }

  // Level 5: Remove emoji (if allowed)
  if (!options?.preserveEmoji) {
    compressed = removeEmoji(compressed);
    techniques.push('emoji_removed');

    if (compressed.length <= targetLength) {
      return buildResult(message, compressed, techniques, true);
    }
  }

  // Level 6: Truncate with ellipsis
  if (compressed.length > targetLength) {
    compressed = compressed.slice(0, targetLength - 3) + '...';
    techniques.push('truncated');
  }

  compressorLogger.info({
    msg: 'Message compressed',
    originalLength,
    compressedLength: compressed.length,
    targetLength,
    techniques,
    achieved: compressed.length <= targetLength,
  });

  return buildResult(message, compressed, techniques, compressed.length <= targetLength);
}

/**
 * Apply abbreviations to text
 */
function applyAbbreviations(text: string): string {
  let result = text;

  for (const [full, abbr] of Object.entries(ABBREVIATIONS)) {
    const pattern = new RegExp(`\\b${full}\\b`, 'gi');
    result = result.replace(pattern, abbr);
  }

  // Clean up double spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Remove optional punctuation
 */
function removeOptionalPunctuation(text: string): string {
  return text
    .replace(/\.\s*$/g, '')     // Trailing period
    .replace(/,\s+/g, ' ')       // Commas
    .replace(/:\s+/g, ' ')       // Colons (except in times)
    .replace(/\s+/g, ' ')        // Multiple spaces
    .trim();
}

/**
 * Remove emoji from text
 */
function removeEmoji(text: string): string {
  // Remove common emoji
  return text
    .replace(/[✓✔️☑️]/g, '')
    .replace(/[⚠️⏳🔄❌✅]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build compression result
 */
function buildResult(
  original: string,
  compressed: string,
  techniques: string[],
  achieved: boolean
): CompressionResult {
  return {
    message: compressed,
    originalLength: original.length,
    compressedLength: compressed.length,
    techniques,
    targetAchieved: achieved,
  };
}

// =====================================================
// SMART TRUNCATION
// =====================================================

/**
 * Smartly truncate text at word boundary
 */
export function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // Find last space before limit
  const truncated = text.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Truncate notes to fit available space
 */
export function truncateNotes(notes: string, maxLength: number): string {
  if (!notes || notes.length <= maxLength) return notes;

  // Try to end at sentence boundary
  const truncated = notes.slice(0, maxLength - 3);
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastSentence > maxLength * 0.6) {
    return truncated.slice(0, lastSentence + 1);
  }

  // Fall back to word boundary
  return smartTruncate(notes, maxLength);
}

// =====================================================
// FORMATTING HELPERS
// =====================================================

/**
 * Format currency amount compactly
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    if (Number.isInteger(k)) {
      return `$${k}k`;
    }
    return `$${k.toFixed(1)}k`;
  }

  if (Number.isInteger(amount)) {
    return `$${amount}`;
  }

  return `$${amount.toFixed(2)}`;
}

/**
 * Format duration compactly
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  if (mins === 30) {
    return `${hours}.5h`;
  }

  return `${hours}h${mins}m`;
}

/**
 * Format customer name compactly (last name only if long)
 */
export function formatNameCompact(name: string, maxLength: number = 15): string {
  if (name.length <= maxLength) return name;

  // Try last name only
  const parts = name.split(' ');
  if (parts.length > 1) {
    const lastName = parts[parts.length - 1];
    if (lastName.length <= maxLength) {
      return lastName;
    }
  }

  // Truncate
  return name.slice(0, maxLength - 1) + '.';
}
