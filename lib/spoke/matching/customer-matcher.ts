// =====================================================
// SPOKE - CUSTOMER NAME MATCHER
//
// Per Spoke Spec Section 6.1:
// Fuzzy matching of spoken customer names to database records.
//
// Techniques:
// - Trigram similarity (pg_trgm in database)
// - Soundex/phonetic matching
// - Levenshtein distance
// - Common name variations
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';

const matcherLogger = smsLogger.child({ context: 'spoke.customer-matcher' });

// =====================================================
// TYPES
// =====================================================

export interface CustomerMatch {
  customerId: string;
  customerName: string;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'phonetic' | 'partial';
  evidence: string;
}

export interface CustomerMatchResult {
  matches: CustomerMatch[];
  bestMatch: CustomerMatch | null;
  confidence: number;
  isAmbiguous: boolean;
}

// =====================================================
// PHONETIC ENCODING (Soundex-like)
// =====================================================

/**
 * Simple phonetic encoding for name matching
 * Maps similar-sounding letters to same codes
 */
function phoneticEncode(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return '';

  // Keep first letter
  let code = cleaned[0].toUpperCase();

  // Phonetic mappings
  const mappings: Record<string, string> = {
    'b': '1', 'f': '1', 'p': '1', 'v': '1',
    'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
    'd': '3', 't': '3',
    'l': '4',
    'm': '5', 'n': '5',
    'r': '6',
  };

  // Encode rest
  let prevCode = mappings[cleaned[0]] || '0';
  for (let i = 1; i < cleaned.length && code.length < 4; i++) {
    const char = cleaned[i];
    const charCode = mappings[char];

    // Skip vowels and 'h', 'w', 'y'
    if (!charCode) continue;

    // Skip consecutive same codes
    if (charCode !== prevCode) {
      code += charCode;
      prevCode = charCode;
    }
  }

  // Pad to 4 characters
  return code.padEnd(4, '0');
}

/**
 * Check if two names sound similar
 */
function soundsLike(name1: string, name2: string): boolean {
  return phoneticEncode(name1) === phoneticEncode(name2);
}

// =====================================================
// STRING SIMILARITY
// =====================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
function stringSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Calculate trigram similarity (for backup when not using DB)
 */
function trigramSimilarity(a: string, b: string): number {
  const getTrigrams = (s: string): Set<string> => {
    const padded = `  ${s.toLowerCase()}  `;
    const trigrams = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  };

  const trigramsA = getTrigrams(a);
  const trigramsB = getTrigrams(b);

  let intersection = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) intersection++;
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// =====================================================
// NAME PREPROCESSING
// =====================================================

/**
 * Common name variations and nicknames
 */
const NAME_VARIATIONS: Record<string, string[]> = {
  'william': ['will', 'bill', 'billy', 'willy'],
  'robert': ['rob', 'bob', 'bobby', 'robbie'],
  'richard': ['rick', 'dick', 'rich', 'ricky'],
  'michael': ['mike', 'mikey', 'mick'],
  'james': ['jim', 'jimmy', 'jamie'],
  'john': ['johnny', 'jack', 'jon'],
  'joseph': ['joe', 'joey'],
  'thomas': ['tom', 'tommy'],
  'christopher': ['chris', 'topher'],
  'daniel': ['dan', 'danny'],
  'matthew': ['matt', 'matty'],
  'anthony': ['tony'],
  'elizabeth': ['liz', 'lizzy', 'beth', 'betty'],
  'jennifer': ['jen', 'jenny'],
  'katherine': ['kate', 'kathy', 'katie', 'kat'],
  'margaret': ['maggie', 'meg', 'peggy'],
  'patricia': ['pat', 'patty', 'trish'],
  'alexander': ['alex', 'xander'],
  'benjamin': ['ben', 'benny'],
  'samuel': ['sam', 'sammy'],
};

/**
 * Normalize a name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")  // Normalize apostrophes
    .replace(/[^a-z'\s-]/g, '') // Remove special chars except apostrophe, space, hyphen
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get name variations including nicknames
 */
function getNameVariations(name: string): string[] {
  const normalized = normalizeName(name);
  const variations = [normalized];

  // Check if it's a known name with variations
  for (const [fullName, nicknames] of Object.entries(NAME_VARIATIONS)) {
    if (normalized === fullName || nicknames.includes(normalized)) {
      variations.push(fullName, ...nicknames);
    }
  }

  return [...new Set(variations)];
}

/**
 * Extract last name from full name
 */
function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

/**
 * Extract first name from full name
 */
function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

// =====================================================
// MAIN MATCHING FUNCTION
// =====================================================

/**
 * Find matching customers for a spoken name reference
 *
 * @param spokenName - Name mentioned in transcript
 * @param businessId - Business to search within
 * @param recentJobCustomerIds - IDs of customers with recent/scheduled jobs (boost these)
 */
export async function findCustomerMatches(
  spokenName: string,
  businessId: string,
  recentJobCustomerIds?: string[]
): Promise<CustomerMatchResult> {
  const startTime = Date.now();

  try {
    const supabase = createAdminClient();
    const normalizedSpoken = normalizeName(spokenName);
    const spokenVariations = getNameVariations(normalizedSpoken);

    // Query customers from database
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name')
      .eq('business_id', businessId)
      .limit(500); // Limit for performance

    if (error) {
      matcherLogger.error({
        msg: 'Failed to fetch customers',
        error,
        businessId,
      });
      return {
        matches: [],
        bestMatch: null,
        confidence: 0,
        isAmbiguous: false,
      };
    }

    if (!customers || customers.length === 0) {
      return {
        matches: [],
        bestMatch: null,
        confidence: 0,
        isAmbiguous: false,
      };
    }

    const matches: CustomerMatch[] = [];

    for (const customer of customers) {
      const customerName = customer.name;
      const normalizedCustomer = normalizeName(customerName);
      const customerLastName = extractLastName(normalizedCustomer);
      const customerFirstName = extractFirstName(normalizedCustomer);

      let score = 0;
      let matchType: CustomerMatch['matchType'] = 'partial';
      let evidence = '';

      // Check exact match
      if (normalizedCustomer === normalizedSpoken) {
        score = 1.0;
        matchType = 'exact';
        evidence = 'Exact name match';
      }
      // Check last name exact match
      else if (customerLastName === normalizedSpoken) {
        score = 0.95;
        matchType = 'exact';
        evidence = 'Last name match';
      }
      // Check first name exact match
      else if (customerFirstName === normalizedSpoken) {
        score = 0.85;
        matchType = 'exact';
        evidence = 'First name match';
      }
      // Check name variations (nicknames)
      else if (spokenVariations.some(v => normalizedCustomer.includes(v))) {
        score = 0.88;
        matchType = 'fuzzy';
        evidence = 'Name variation match';
      }
      // Check phonetic match
      else if (soundsLike(normalizedSpoken, customerLastName)) {
        score = 0.80;
        matchType = 'phonetic';
        evidence = 'Sounds similar (last name)';
      }
      // Check fuzzy match
      else {
        const trigramScore = trigramSimilarity(normalizedSpoken, customerLastName);
        const levenScore = stringSimilarity(normalizedSpoken, customerLastName);
        const fuzzyScore = Math.max(trigramScore, levenScore);

        if (fuzzyScore >= 0.6) {
          score = fuzzyScore * 0.85; // Cap at 0.85 for fuzzy
          matchType = 'fuzzy';
          evidence = `Fuzzy match (${Math.round(fuzzyScore * 100)}% similar)`;
        }
      }

      // Boost score if customer has recent/scheduled job
      if (recentJobCustomerIds?.includes(customer.id) && score > 0) {
        score = Math.min(score + 0.10, 1.0);
        evidence += ' + has scheduled job';
      }

      // Only include if score meets minimum threshold
      if (score >= 0.60) {
        matches.push({
          customerId: customer.id,
          customerName: customer.name,
          score,
          matchType,
          evidence,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Determine best match and confidence
    const bestMatch = matches[0] || null;
    const confidence = bestMatch?.score || 0;

    // Check for ambiguity (multiple close matches)
    const isAmbiguous = matches.length > 1 &&
      matches[1].score >= 0.75 &&
      (matches[0].score - matches[1].score) < 0.15;

    matcherLogger.info({
      msg: 'Customer matching complete',
      spokenName,
      matchCount: matches.length,
      bestMatch: bestMatch?.customerName,
      confidence,
      isAmbiguous,
      latencyMs: Date.now() - startTime,
    });

    return {
      matches: matches.slice(0, 5), // Return top 5
      bestMatch,
      confidence,
      isAmbiguous,
    };

  } catch (error) {
    matcherLogger.error({
      msg: 'Customer matching error',
      error: error instanceof Error ? error.message : String(error),
      spokenName,
    });

    return {
      matches: [],
      bestMatch: null,
      confidence: 0,
      isAmbiguous: false,
    };
  }
}

/**
 * Resolve pronoun to customer based on context
 * Used when transcript says "she paid" or "he said"
 */
export function resolvePronounToCustomer(
  pronoun: 'he' | 'she' | 'they',
  recentCustomers: Array<{ id: string; name: string }>
): CustomerMatch | null {
  // For beta, we just return the most recent customer
  // Post-beta could use name gender inference

  if (recentCustomers.length === 0) {
    return null;
  }

  const customer = recentCustomers[0];

  return {
    customerId: customer.id,
    customerName: customer.name,
    score: 0.70, // Lower confidence for pronoun resolution
    matchType: 'partial',
    evidence: `Pronoun "${pronoun}" resolved to recent customer`,
  };
}
