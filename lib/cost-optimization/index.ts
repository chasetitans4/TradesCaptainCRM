// =====================================================
// COST OPTIMIZATION UTILITIES
// Strategies to reduce Twilio, OpenAI, and Storage costs
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

// =====================================================
// SMS COST OPTIMIZATION
// Target: $500/mo -> $350/mo (30% reduction)
// =====================================================

interface SMSOptimizationConfig {
  // Batching settings
  enableBatching: boolean;
  batchDelayMinutes: number;
  maxBatchSize: number;

  // Template optimization
  preferShortMessages: boolean;
  maxMessageLength: number;

  // Smart sending
  respectQuietHours: boolean;
  quietHoursStart: number; // 0-23
  quietHoursEnd: number;

  // Deduplication
  dedupeWindowMinutes: number;
}

const DEFAULT_SMS_CONFIG: SMSOptimizationConfig = {
  enableBatching: true,
  batchDelayMinutes: 5,
  maxBatchSize: 100,
  preferShortMessages: true,
  maxMessageLength: 160, // Single SMS segment
  respectQuietHours: true,
  quietHoursStart: 21, // 9 PM
  quietHoursEnd: 8, // 8 AM
  dedupeWindowMinutes: 60,
};

/**
 * Check if SMS should be sent now or queued
 */
export function shouldSendSMSNow(
  config: SMSOptimizationConfig = DEFAULT_SMS_CONFIG
): { send: boolean; reason?: string } {
  const now = new Date();
  const hour = now.getHours();

  // Check quiet hours
  if (config.respectQuietHours) {
    if (hour >= config.quietHoursStart || hour < config.quietHoursEnd) {
      return { send: false, reason: 'quiet_hours' };
    }
  }

  return { send: true };
}

/**
 * Optimize SMS message content to reduce segment count
 */
export function optimizeSMSContent(message: string, maxLength: number = 160): string {
  // Replace common long words with shorter alternatives
  const replacements: Record<string, string> = {
    'appointment': 'appt',
    'tomorrow': 'tmrw',
    'today': '2day',
    'please': 'pls',
    'thank you': 'thx',
    'your': 'ur',
    'are': 'r',
    'you': 'u',
    'for': '4',
    'to': '2',
    'at': '@',
    'and': '&',
  };

  let optimized = message;

  // Only apply optimizations if message exceeds single segment
  if (message.length > maxLength) {
    for (const [long, short] of Object.entries(replacements)) {
      optimized = optimized.replace(new RegExp(long, 'gi'), short);
    }

    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // Truncate if still too long
    if (optimized.length > maxLength * 2) {
      optimized = optimized.substring(0, maxLength * 2 - 3) + '...';
    }
  }

  return optimized;
}

/**
 * Calculate SMS segments (for cost estimation)
 */
export function calculateSMSSegments(message: string): number {
  // GSM-7 characters limit: 160 for single, 153 for multi-part
  // Unicode limit: 70 for single, 67 for multi-part

  const hasUnicode = /[^\x00-\x7F]/.test(message);
  const singleLimit = hasUnicode ? 70 : 160;
  const multiLimit = hasUnicode ? 67 : 153;

  if (message.length <= singleLimit) return 1;

  return Math.ceil(message.length / multiLimit);
}

// =====================================================
// OPENAI COST OPTIMIZATION
// Target: $200/mo -> $120/mo (40% reduction)
// =====================================================

interface OpenAIOptimizationConfig {
  // Model selection
  preferCheaperModels: boolean;
  gpt4Threshold: number; // Only use GPT-4 for messages longer than this

  // Caching
  enableResponseCaching: boolean;
  cacheTTLMinutes: number;

  // Token optimization
  maxInputTokens: number;
  maxOutputTokens: number;

  // Rate limiting
  maxRequestsPerMinute: number;
}

const DEFAULT_OPENAI_CONFIG: OpenAIOptimizationConfig = {
  preferCheaperModels: true,
  gpt4Threshold: 500, // Characters
  enableResponseCaching: true,
  cacheTTLMinutes: 60,
  maxInputTokens: 2000,
  maxOutputTokens: 500,
  maxRequestsPerMinute: 20,
};

/**
 * Select optimal model based on task complexity
 */
export function selectOptimalModel(
  taskType: 'classification' | 'generation' | 'analysis' | 'summarization',
  inputLength: number,
  config: OpenAIOptimizationConfig = DEFAULT_OPENAI_CONFIG
): string {
  // Use cheaper models for simple tasks
  if (config.preferCheaperModels) {
    // Classification and short responses: use GPT-3.5
    if (taskType === 'classification' || inputLength < config.gpt4Threshold) {
      return 'gpt-3.5-turbo';
    }

    // Summarization: GPT-3.5 is usually sufficient
    if (taskType === 'summarization') {
      return 'gpt-3.5-turbo';
    }
  }

  // Complex analysis or long inputs: use GPT-4
  return 'gpt-4-turbo-preview';
}

/**
 * Create a cache key for AI responses
 */
export function createAICacheKey(prompt: string, context: string): string {
  // Create deterministic hash from prompt + context
  const content = `${prompt}:${context}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ai_response:${Math.abs(hash).toString(36)}`;
}

/**
 * Truncate input to reduce token count
 */
export function truncateForTokenLimit(
  text: string,
  maxTokens: number
): string {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;

  if (text.length <= maxChars) return text;

  // Keep beginning and end, truncate middle
  const keepChars = maxChars - 50; // Reserve for "..."
  const halfKeep = Math.floor(keepChars / 2);

  return text.substring(0, halfKeep) + '\n...[truncated]...\n' + text.substring(text.length - halfKeep);
}

// =====================================================
// STORAGE COST OPTIMIZATION
// Target: $100/mo -> $60/mo (40% reduction)
// =====================================================

interface StorageOptimizationConfig {
  // Image compression
  enableImageCompression: boolean;
  targetQuality: number; // 0-100
  maxImageDimension: number;
  preferWebP: boolean;

  // Cleanup
  enableAutoCleanup: boolean;
  orphanedFilesAgeDays: number;
  temporaryFilesAgeDays: number;

  // Tiered storage
  enableTieredStorage: boolean;
  coldStorageAgeDays: number; // Move to cheaper storage after X days
}

const DEFAULT_STORAGE_CONFIG: StorageOptimizationConfig = {
  enableImageCompression: true,
  targetQuality: 85,
  maxImageDimension: 2048,
  preferWebP: true,
  enableAutoCleanup: true,
  orphanedFilesAgeDays: 30,
  temporaryFilesAgeDays: 7,
  enableTieredStorage: true,
  coldStorageAgeDays: 90,
};

/**
 * Get storage cleanup candidates
 */
export async function getStorageCleanupCandidates(
  businessId: string,
  config: StorageOptimizationConfig = DEFAULT_STORAGE_CONFIG
): Promise<{
  orphanedFiles: string[];
  temporaryFiles: string[];
  coldStorageCandidates: string[];
}> {
  const supabase = createAdminClient();
  const now = new Date();

  // Find orphaned files (in storage but not referenced in DB)
  // This would need to be implemented with actual storage listing

  // Find temporary files older than threshold
  const tempCutoff = new Date(now.getTime() - config.temporaryFilesAgeDays * 24 * 60 * 60 * 1000);

  // Find cold storage candidates
  const coldCutoff = new Date(now.getTime() - config.coldStorageAgeDays * 24 * 60 * 60 * 1000);

  // Query for old job photos that could be moved to cold storage
  const { data: oldPhotos } = await supabase
    .from('job_photos')
    .select('storage_path, created_at')
    .eq('business_id', businessId)
    .lt('created_at', coldCutoff.toISOString())
    .limit(1000);

  return {
    orphanedFiles: [], // Would need storage API to identify
    temporaryFiles: [], // Would need to track temp uploads
    coldStorageCandidates: (oldPhotos || []).map(p => p.storage_path),
  };
}

/**
 * Estimate monthly storage cost
 */
export function estimateStorageCost(
  totalGigabytes: number,
  requestsPerMonth: number
): number {
  // Supabase pricing (approximate):
  // Storage: $0.021/GB/month
  // Bandwidth: $0.09/GB
  // Estimated average file size for requests: 500KB

  const storageCost = totalGigabytes * 0.021;
  const bandwidthGB = (requestsPerMonth * 0.5) / 1024; // 500KB average
  const bandwidthCost = bandwidthGB * 0.09;

  return storageCost + bandwidthCost;
}

// =====================================================
// COST TRACKING AND REPORTING
// =====================================================

interface CostReport {
  period: { start: Date; end: Date };
  sms: {
    messageCount: number;
    segmentCount: number;
    estimatedCost: number;
  };
  openai: {
    requestCount: number;
    tokenCount: number;
    estimatedCost: number;
  };
  storage: {
    totalGB: number;
    requestCount: number;
    estimatedCost: number;
  };
  total: number;
}

/**
 * Generate cost report for a business
 */
export async function generateCostReport(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<CostReport> {
  const supabase = createAdminClient();

  // Get SMS stats
  const { data: smsData, count: smsCount } = await supabase
    .from('sms_messages')
    .select('id, body', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('direction', 'outbound')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const segmentCount = (smsData || []).reduce(
    (sum, msg) => sum + calculateSMSSegments(msg.body || ''),
    0
  );

  // SMS cost: ~$0.0075 per segment (Twilio)
  const smsCost = segmentCount * 0.0075;

  // Get AI usage stats (would need separate tracking table)
  // Placeholder values
  const aiRequestCount = 0;
  const aiTokenCount = 0;
  const aiCost = 0;

  // Get storage usage (placeholder)
  const storageGB = 0;
  const storageRequests = 0;
  const storageCost = estimateStorageCost(storageGB, storageRequests);

  return {
    period: { start: startDate, end: endDate },
    sms: {
      messageCount: smsCount || 0,
      segmentCount,
      estimatedCost: smsCost,
    },
    openai: {
      requestCount: aiRequestCount,
      tokenCount: aiTokenCount,
      estimatedCost: aiCost,
    },
    storage: {
      totalGB: storageGB,
      requestCount: storageRequests,
      estimatedCost: storageCost,
    },
    total: smsCost + aiCost + storageCost,
  };
}

// Export configs for external use
export {
  DEFAULT_SMS_CONFIG,
  DEFAULT_OPENAI_CONFIG,
  DEFAULT_STORAGE_CONFIG,
};

export type {
  SMSOptimizationConfig,
  OpenAIOptimizationConfig,
  StorageOptimizationConfig,
  CostReport,
};
