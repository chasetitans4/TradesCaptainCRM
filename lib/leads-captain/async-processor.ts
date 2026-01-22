// =====================================================
// Trades Captain AI - Async Processor
// Queue management for async prompts (Prompt 3, 4)
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import {
  ConversationAnalyzerInput,
  ConversationAnalyzerOutput,
  NoteExtractorInput,
  NoteExtractorOutput,
  ExtractedInfo,
  ConversationOutcome,
  AsyncProcessingBatchResult,
  SimpleMessage,
} from '@/types/leads-captain/prompt-types';
import { LeadsCaptainMessage } from '@/types/leads-captain';
import {
  executeConversationAnalyzer,
  executeNoteExtractor,
  quickExtractNotes,
} from './prompts';

// =====================================================
// TYPES
// =====================================================

export interface ConversationToAnalyze {
  id: string;
  config_id: string;
  customer_phone: string;
  started_at: string;
  closed_at: string | null;
  status: string;
  message_count: number;
  ai_message_count: number;
  is_hot_lead: boolean;
  is_emergency: boolean;
  customer_name: string | null;
  customer_memory: Record<string, unknown>;
}

// =====================================================
// MAIN PROCESSING FUNCTIONS
// =====================================================

/**
 * Process conversations that need analysis
 * Called by the cron job
 */
export async function processConversationsForAnalysis(options: {
  minutesSinceClosed?: number;
  limit?: number;
  configId?: string;
}): Promise<AsyncProcessingBatchResult> {
  const {
    minutesSinceClosed = 10,
    limit = 50,
    configId,
  } = options;

  const supabase = createAdminClient();
  const result: AsyncProcessingBatchResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Find conversations to analyze
  const conversations = await findConversationsToAnalyze(
    supabase,
    minutesSinceClosed,
    limit,
    configId
  );

  jobLogger.info({
    msg: 'Starting conversation analysis batch',
    conversationCount: conversations.length,
    minutesSinceClosed,
  });

  // Process each conversation
  for (const conversation of conversations) {
    try {
      // Load messages for the conversation
      const messages = await loadConversationMessages(supabase, conversation.id);

      if (messages.length === 0) {
        result.skipped++;
        continue;
      }

      // Run conversation analyzer
      const analysisResult = await analyzeConversation(conversation, messages);

      if (analysisResult.success && analysisResult.data) {
        // Save analysis result
        await saveConversationAnalysis(supabase, conversation.id, conversation.config_id, analysisResult.data);
        result.processed++;
      } else {
        result.failed++;
        result.errors.push({
          conversationId: conversation.id,
          error: analysisResult.error || 'Unknown error',
        });
      }

      // Run note extractor
      const noteResult = await extractConversationNotes(conversation, messages);

      if (noteResult.success && noteResult.data && noteResult.data.notes.length > 0) {
        // Save extracted notes
        await saveExtractedNotes(supabase, conversation.id, noteResult.data.notes);
      }

    } catch (error) {
      result.failed++;
      result.errors.push({
        conversationId: conversation.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      jobLogger.error({
        msg: 'Error processing conversation for analysis',
        conversationId: conversation.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  jobLogger.info({
    msg: 'Conversation analysis batch completed',
    processed: result.processed,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

// =====================================================
// QUERY FUNCTIONS
// =====================================================

/**
 * Find conversations that need analysis
 */
async function findConversationsToAnalyze(
  supabase: ReturnType<typeof createAdminClient>,
  minutesSinceClosed: number,
  limit: number,
  configId?: string
): Promise<ConversationToAnalyze[]> {
  // Calculate cutoff time
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesSinceClosed);

  let query = supabase
    .from('leads_captain_conversations_v2')
    .select('*')
    .eq('status', 'closed')
    .gte('closed_at', cutoffTime.toISOString())
    .order('closed_at', { ascending: true })
    .limit(limit);

  if (configId) {
    query = query.eq('config_id', configId);
  }

  // Exclude already analyzed conversations
  const { data: conversations, error } = await query;

  if (error) {
    jobLogger.error({
      msg: 'Error finding conversations to analyze',
      error: error.message,
    });
    return [];
  }

  // Filter out already analyzed conversations
  const conversationIds = (conversations || []).map((c: ConversationToAnalyze) => c.id);

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: existingAnalyses } = await supabase
    .from('leads_captain_conversation_analysis')
    .select('conversation_id')
    .in('conversation_id', conversationIds);

  const analyzedIds = new Set((existingAnalyses || []).map((a: { conversation_id: string }) => a.conversation_id));

  return (conversations || []).filter((c: ConversationToAnalyze) => !analyzedIds.has(c.id));
}

/**
 * Load messages for a conversation
 */
async function loadConversationMessages(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string
): Promise<LeadsCaptainMessage[]> {
  const { data, error } = await supabase
    .from('leads_captain_messages_v2')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    jobLogger.error({
      msg: 'Error loading conversation messages',
      conversationId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

// =====================================================
// ANALYSIS FUNCTIONS
// =====================================================

/**
 * Analyze a conversation
 */
async function analyzeConversation(
  conversation: ConversationToAnalyze,
  messages: LeadsCaptainMessage[]
): Promise<{ success: boolean; data: ConversationAnalyzerOutput | null; error: string | null }> {
  // Calculate duration
  const startTime = new Date(conversation.started_at);
  const endTime = conversation.closed_at ? new Date(conversation.closed_at) : new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  // Determine outcome
  const outcome = determineConversationOutcome(conversation, messages);

  // Build extracted info from conversation memory
  const extractedInfo = buildExtractedInfoFromConversation(conversation, messages);

  const input: ConversationAnalyzerInput = {
    fullConversation: messages,
    extractedInfo,
    outcome,
    duration,
    messageCount: messages.length,
  };

  const result = await executeConversationAnalyzer(input);

  return {
    success: result.success,
    data: result.data,
    error: result.error ?? null,
  };
}

/**
 * Extract notes from a conversation
 */
async function extractConversationNotes(
  conversation: ConversationToAnalyze,
  messages: LeadsCaptainMessage[]
): Promise<{ success: boolean; data: NoteExtractorOutput | null; error: string | null }> {
  // Convert to simple messages
  const simpleMessages: SimpleMessage[] = messages.map(msg => ({
    role: msg.direction === 'inbound' ? 'customer' : 'business',
    content: msg.content,
    timestamp: msg.created_at,
  }));

  // First, run quick extraction
  const quickNotes = quickExtractNotes(simpleMessages);

  // Then run LLM extraction
  const input: NoteExtractorInput = {
    conversationHistory: simpleMessages,
    existingNotes: quickNotes.map(n => n.content),
  };

  const result = await executeNoteExtractor(input);

  if (result.success && result.data) {
    // Merge quick notes with LLM notes
    const allNotes = [...quickNotes, ...result.data.notes];

    // Deduplicate
    const uniqueNotes = deduplicateNotes(allNotes);

    return {
      success: true,
      data: {
        notes: uniqueNotes,
        keyDetails: result.data.keyDetails,
      },
      error: null,
    };
  }

  // If LLM fails, return quick notes
  return {
    success: true,
    data: {
      notes: quickNotes,
      keyDetails: {
        specificIssue: null,
        previousWork: null,
        constraints: null,
      },
    },
    error: null,
  };
}

// =====================================================
// SAVE FUNCTIONS
// =====================================================

/**
 * Save conversation analysis to database
 */
async function saveConversationAnalysis(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  configId: string,
  analysis: ConversationAnalyzerOutput
): Promise<void> {
  const { error } = await supabase
    .from('leads_captain_conversation_analysis')
    .upsert({
      conversation_id: conversationId,
      config_id: configId,
      summary: analysis.summary,
      customer_sentiment: analysis.customerSentiment,
      lead_quality: analysis.leadQuality,
      service_category: analysis.serviceCategory,
      estimated_job_value: analysis.estimatedJobValue,
      follow_up_recommendation: analysis.followUpRecommendation,
      ai_performance_notes: analysis.aiPerformanceNotes,
      analyzed_at: new Date().toISOString(),
      model_used: 'claude-3-5-sonnet-20241022',
    }, {
      onConflict: 'conversation_id',
    });

  if (error) {
    jobLogger.error({
      msg: 'Error saving conversation analysis',
      conversationId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Save extracted notes to database
 */
async function saveExtractedNotes(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  notes: NoteExtractorOutput['notes']
): Promise<void> {
  const records = notes.map(note => ({
    conversation_id: conversationId,
    note_type: note.type,
    content: note.content,
    confidence: note.confidence,
  }));

  const { error } = await supabase
    .from('leads_captain_extracted_notes')
    .insert(records);

  if (error) {
    jobLogger.error({
      msg: 'Error saving extracted notes',
      conversationId,
      error: error.message,
    });
    throw error;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Determine conversation outcome
 */
function determineConversationOutcome(
  conversation: ConversationToAnalyze,
  messages: LeadsCaptainMessage[]
): ConversationOutcome {
  // Check if it was handed off to human
  if (conversation.status === 'human_takeover') {
    return 'human_takeover';
  }

  // Check if it has relevant info captured (lead captured)
  const hasServiceInfo = messages.some(m =>
    m.direction === 'inbound' &&
    m.extracted_entities?.service
  );

  if (hasServiceInfo || conversation.is_hot_lead) {
    return 'lead_captured';
  }

  // Check for abandoned (no customer response in last messages)
  const lastMessages = messages.slice(-3);
  const lastCustomerMessage = lastMessages.findIndex(m => m.direction === 'inbound');

  if (lastCustomerMessage === -1 && messages.length > 1) {
    return 'abandoned';
  }

  return 'completed';
}

/**
 * Build extracted info from conversation
 */
function buildExtractedInfoFromConversation(
  conversation: ConversationToAnalyze,
  messages: LeadsCaptainMessage[]
): ExtractedInfo {
  const memory = conversation.customer_memory || {};

  const info: ExtractedInfo = {
    serviceNeeded: null,
    address: (memory.address as string) || null,
    urgency: null,
    preferredTime: null,
    customerName: conversation.customer_name || (memory.name as string) || null,
  };

  // Look through messages for extracted entities
  for (const msg of messages) {
    if (msg.direction === 'inbound' && msg.extracted_entities) {
      const entities = msg.extracted_entities;

      if (entities.service && !info.serviceNeeded) {
        info.serviceNeeded = entities.service;
      }
      if (entities.address && !info.address) {
        info.address = entities.address;
      }
      if (entities.time && !info.preferredTime) {
        info.preferredTime = entities.time;
      }
    }
  }

  return info;
}

/**
 * Deduplicate notes by content similarity
 */
function deduplicateNotes(notes: NoteExtractorOutput['notes']): NoteExtractorOutput['notes'] {
  const unique: NoteExtractorOutput['notes'] = [];

  for (const note of notes) {
    const isDuplicate = unique.some(existing => {
      const existingLower = existing.content.toLowerCase();
      const noteLower = note.content.toLowerCase();

      // Check for substantial overlap
      return existingLower.includes(noteLower) ||
        noteLower.includes(existingLower) ||
        calculateSimilarity(existingLower, noteLower) > 0.8;
    });

    if (!isDuplicate) {
      unique.push(note);
    }
  }

  return unique;
}

/**
 * Calculate simple string similarity (Jaccard)
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}
