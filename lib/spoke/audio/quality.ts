// =====================================================
// SPOKE - AUDIO QUALITY ESTIMATION
//
// Per Spoke Spec v1.0:
// Estimates audio quality based on transcription results.
//
// Since we use Whisper cloud API, we can't do real-time SNR
// analysis without additional audio processing. Instead, we
// infer quality from:
// - Transcription confidence
// - Transcript characteristics (coherence, filler words)
// - Recording duration vs transcript density
// =====================================================

import { AUDIO_QUALITY_CONFIG } from '../config';

export interface AudioQualityResult {
  /** Overall quality score (0.0 - 1.0) */
  score: number;

  /** Quality tier */
  tier: 'excellent' | 'good' | 'fair' | 'poor';

  /** Individual signal scores */
  signals: {
    transcriptionConfidence: number;
    coherenceScore: number;
    densityScore: number;
    durationScore: number;
  };

  /** Issues detected */
  issues: string[];
}

/**
 * Estimate audio quality from transcription results
 */
export function estimateAudioQuality(
  transcript: string,
  transcriptionConfidence: number,
  audioDurationSeconds: number
): AudioQualityResult {
  const signals = {
    transcriptionConfidence: normalizeConfidence(transcriptionConfidence),
    coherenceScore: calculateCoherenceScore(transcript),
    densityScore: calculateDensityScore(transcript, audioDurationSeconds),
    durationScore: calculateDurationScore(audioDurationSeconds),
  };

  const issues: string[] = [];

  // Check for issues
  if (signals.transcriptionConfidence < 0.7) {
    issues.push('Low transcription confidence');
  }
  if (signals.coherenceScore < 0.5) {
    issues.push('Transcript may be fragmented or unclear');
  }
  if (signals.densityScore < 0.3) {
    issues.push('Very little speech detected');
  }
  if (signals.durationScore < 0.5) {
    issues.push(audioDurationSeconds < 3 ? 'Recording too short' : 'Recording very long');
  }

  // Calculate weighted overall score
  const score =
    signals.transcriptionConfidence * 0.4 +
    signals.coherenceScore * 0.3 +
    signals.densityScore * 0.2 +
    signals.durationScore * 0.1;

  // Determine tier
  let tier: AudioQualityResult['tier'];
  if (score >= 0.85) {
    tier = 'excellent';
  } else if (score >= 0.70) {
    tier = 'good';
  } else if (score >= 0.50) {
    tier = 'fair';
  } else {
    tier = 'poor';
  }

  return {
    score: Math.round(score * 100) / 100,
    tier,
    signals,
    issues,
  };
}

/**
 * Normalize confidence to 0-1 range
 */
function normalizeConfidence(confidence: number): number {
  // Whisper typically returns 0.9+ for good audio
  // Scale so 0.8-1.0 maps to 0.0-1.0
  if (confidence >= 1.0) return 1.0;
  if (confidence <= 0.7) return 0.0;
  return (confidence - 0.7) / 0.3;
}

/**
 * Calculate coherence score based on transcript characteristics
 * Looks for complete words, sentences, and logical structure
 */
function calculateCoherenceScore(transcript: string): number {
  if (!transcript || transcript.trim().length === 0) {
    return 0;
  }

  const text = transcript.trim().toLowerCase();
  let score = 1.0;

  // Penalize excessive filler words
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
  const words = text.split(/\s+/);
  const fillerCount = words.filter(w => fillerWords.includes(w)).length;
  const fillerRatio = fillerCount / words.length;
  score -= Math.min(fillerRatio * 2, 0.3); // Max 30% penalty

  // Penalize very short sentences (sign of fragmented audio)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  if (avgWordsPerSentence < 3) {
    score -= 0.2; // Fragmented
  }

  // Penalize repeated words (sign of stuttering/looping)
  const wordSet = new Set(words);
  const uniqueRatio = wordSet.size / words.length;
  if (uniqueRatio < 0.5) {
    score -= 0.2; // Very repetitive
  }

  // Boost for complete sentence structure
  const hasCompleteSentences = sentences.some(s => s.split(/\s+/).length >= 5);
  if (hasCompleteSentences) {
    score += 0.1;
  }

  // Boost for domain-specific keywords (suggests clear contractor speech)
  const domainKeywords = [
    'finished', 'complete', 'done', 'fixed', 'replaced', 'installed',
    'cash', 'check', 'card', 'paid', 'collected',
    'hours', 'minutes', 'took',
    'customer', 'job', 'service'
  ];
  const domainWordCount = words.filter(w => domainKeywords.includes(w)).length;
  score += Math.min(domainWordCount * 0.05, 0.2); // Up to 20% boost

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate speech density score
 * Ratio of meaningful words to recording duration
 */
function calculateDensityScore(transcript: string, durationSeconds: number): number {
  if (!transcript || durationSeconds <= 0) {
    return 0;
  }

  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const wordsPerSecond = words.length / durationSeconds;

  // Normal speech rate is about 2-3 words per second
  // Very slow speech (< 1 wps) suggests lots of silence/noise
  // Very fast (> 4 wps) might be transcription errors

  if (wordsPerSecond < 0.5) {
    return 0.2; // Very sparse
  } else if (wordsPerSecond < 1.0) {
    return 0.5; // Slow/sparse
  } else if (wordsPerSecond <= 3.5) {
    return 1.0; // Normal range
  } else if (wordsPerSecond <= 5.0) {
    return 0.8; // Fast but possible
  } else {
    return 0.5; // Suspiciously fast
  }
}

/**
 * Calculate duration score
 * Ideal range is 5-60 seconds for a typical update
 */
function calculateDurationScore(durationSeconds: number): number {
  const min = AUDIO_QUALITY_CONFIG.MIN_RECORDING_DURATION_SECONDS;
  const max = AUDIO_QUALITY_CONFIG.MAX_RECORDING_DURATION_SECONDS;

  if (durationSeconds < min) {
    return 0.2; // Too short
  } else if (durationSeconds <= 10) {
    return 0.7; // Short but acceptable
  } else if (durationSeconds <= 60) {
    return 1.0; // Ideal range
  } else if (durationSeconds <= max) {
    return 0.8; // Long but acceptable
  } else {
    return 0.5; // Very long
  }
}

/**
 * Check if audio quality is sufficient for processing
 */
export function isQualitySufficient(quality: AudioQualityResult): boolean {
  // At minimum, we need fair quality to attempt processing
  return quality.score >= 0.4 && quality.tier !== 'poor';
}

/**
 * Get human-readable quality description
 */
export function getQualityDescription(quality: AudioQualityResult): string {
  switch (quality.tier) {
    case 'excellent':
      return 'Excellent audio quality - high confidence in transcription';
    case 'good':
      return 'Good audio quality - transcription should be accurate';
    case 'fair':
      return 'Fair audio quality - some parts may need verification';
    case 'poor':
      return 'Poor audio quality - transcription may have errors';
    default:
      return 'Unknown quality';
  }
}
