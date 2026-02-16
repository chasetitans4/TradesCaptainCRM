// =====================================================
// SPOKE - MULTI-JOB DETECTOR
//
// Per Spoke Spec Section 7 & Beta Gate Addendum:
// Detect when a transcript mentions multiple jobs.
//
// Beta Constraint:
// - DETECT only, do not segment
// - Create DRAFT status and trigger clarification SMS
// - One call = One job rule
// =====================================================

import { smsLogger } from '@/lib/logger';

const detectorLogger = smsLogger.child({ context: 'spoke.multi-job-detector' });

// =====================================================
// TYPES
// =====================================================

export interface MultiJobDetectionResult {
  /** Whether multiple jobs were detected */
  isMultiJob: boolean;

  /** Confidence in multi-job detection */
  confidence: number;

  /** Number of jobs detected */
  jobCount: number;

  /** Segments that suggest separate jobs */
  segments: {
    text: string;
    customerHint?: string;
    position: number;
  }[];

  /** Evidence for why we think there are multiple jobs */
  evidence: string[];
}

// =====================================================
// DETECTION PATTERNS
// =====================================================

/** Patterns that indicate transition between jobs */
const TRANSITION_PATTERNS = [
  // Sequential indicators
  /\b(?:first|then|next|after that|afterwards|also|and then)\b/gi,
  /\b(?:second job|next job|other job|another one)\b/gi,

  // Location transitions
  /\b(?:then (?:went|headed|drove) to|then at|over at|stopped by)\b/gi,

  // Customer name transitions (X's place, then Y's)
  /\b(?:at|from)\s+(\w+(?:'s)?)\s+(?:place|house|home)?[,.]?\s*(?:then|and then|after)\b/gi,

  // Time-based transitions
  /\b(?:before that|earlier today|this morning|this afternoon)\b/gi,
];

/** Patterns that indicate multiple customers mentioned */
const MULTIPLE_CUSTOMER_PATTERNS = [
  // Multiple possessives
  /(\w+)'s.*?(?:and|then).*?(\w+)'s/gi,

  // First/second customer
  /\b(?:first customer|second customer|other customer)\b/gi,

  // List patterns
  /\b(?:both|all three|each of them)\b/gi,
];

/** Patterns that suggest single job (reduce false positives) */
const SINGLE_JOB_INDICATORS = [
  // Single completion
  /^(?:just )?(?:finished|done|completed) (?:at|the job at|the)/i,

  // Simple update
  /^(?:hey|hi|okay|so)[,.]?\s*(?:finished|done|completed)/i,

  // Only one customer name mentioned
];

// =====================================================
// DETECTION FUNCTION
// =====================================================

/**
 * Detect if transcript mentions multiple jobs
 *
 * Per Beta Constraint: Detection only, no segmentation
 */
export function detectMultipleJobs(transcript: string): MultiJobDetectionResult {
  const text = transcript.toLowerCase();
  const evidence: string[] = [];
  const segments: MultiJobDetectionResult['segments'] = [];

  let score = 0;

  // Check for transition patterns
  for (const pattern of TRANSITION_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        score += 0.25;
        evidence.push(`Transition phrase: "${match[0]}"`);

        segments.push({
          text: match[0],
          position: match.index || 0,
        });
      }
    }
  }

  // Check for multiple customer patterns
  for (const pattern of MULTIPLE_CUSTOMER_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        score += 0.35;
        evidence.push(`Multiple customer reference: "${match[0]}"`);

        // Try to extract customer names
        if (match[1] && match[2]) {
          segments.push({
            text: match[0],
            customerHint: match[1],
            position: match.index || 0,
          });
          segments.push({
            text: match[0],
            customerHint: match[2],
            position: (match.index || 0) + match[0].indexOf(match[2]),
          });
        }
      }
    }
  }

  // Count distinct customer name patterns (possessives like "Smith's", "Johnson's")
  const possessivePattern = /\b([A-Z][a-z]+)'s\b/g;
  const possessiveMatches = transcript.match(possessivePattern);
  const uniqueCustomers = new Set(possessiveMatches?.map(m => m.toLowerCase()));

  if (uniqueCustomers.size > 1) {
    score += 0.30 * (uniqueCustomers.size - 1);
    evidence.push(`Multiple customer names: ${[...uniqueCustomers].join(', ')}`);

    for (const name of uniqueCustomers) {
      const idx = text.indexOf(name.toLowerCase());
      if (idx >= 0) {
        segments.push({
          text: name,
          customerHint: name.replace("'s", ''),
          position: idx,
        });
      }
    }
  }

  // Check for single job indicators (reduce false positives)
  for (const pattern of SINGLE_JOB_INDICATORS) {
    if (pattern.test(text)) {
      score -= 0.20;
      evidence.push('Single job indicator detected');
    }
  }

  // Normalize score
  const confidence = Math.max(0, Math.min(1, score));
  const isMultiJob = confidence >= 0.50;

  // Estimate job count
  let jobCount = 1;
  if (isMultiJob) {
    jobCount = Math.max(2, uniqueCustomers.size, segments.length);
    jobCount = Math.min(jobCount, 5); // Cap at 5
  }

  detectorLogger.info({
    msg: 'Multi-job detection complete',
    isMultiJob,
    confidence,
    jobCount,
    evidenceCount: evidence.length,
  });

  return {
    isMultiJob,
    confidence,
    jobCount,
    segments: segments.slice(0, 5), // Limit segments
    evidence,
  };
}

/**
 * Check if transcript is simple enough to not need multi-job check
 * Quick filter to avoid unnecessary processing
 */
export function isSimpleUpdate(transcript: string): boolean {
  const wordCount = transcript.split(/\s+/).length;

  // Very short updates are likely single job
  if (wordCount < 15) return true;

  // Check for obvious single job patterns
  const text = transcript.toLowerCase();

  const simplePatterns = [
    /^(?:done|finished|completed) at/,
    /^(?:just )?(?:wrapped up|knocked out)/,
    /^hey[,.]?\s*(?:done|finished)/,
  ];

  return simplePatterns.some(p => p.test(text));
}

/**
 * Generate clarification message for multi-job detection
 * Per Beta: Ask user to specify which job
 */
export function generateMultiJobClarification(
  segments: MultiJobDetectionResult['segments'],
  candidateJobs?: Array<{ id: string; customerName: string; serviceType: string }>
): string {
  if (candidateJobs && candidateJobs.length > 0) {
    const options = candidateJobs
      .slice(0, 3)
      .map((job, i) => `${i + 1}. ${job.customerName}`)
      .join('\n');

    return `Multiple jobs mentioned. Which job is this update for?\n${options}\n\nReply with the number.`;
  }

  const customerHints = segments
    .filter(s => s.customerHint)
    .map(s => s.customerHint)
    .slice(0, 3);

  if (customerHints.length > 1) {
    return `Got it. Which customer is this update for: ${customerHints.join(' or ')}? Reply with the name.`;
  }

  return 'Multiple jobs detected. Please call back with one job update at a time, or reply with the customer name.';
}
