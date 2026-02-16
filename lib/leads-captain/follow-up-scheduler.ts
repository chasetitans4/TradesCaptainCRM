// =====================================================
// Leads Captain Follow-up Scheduler
// Spec v1.1 Compliant - Follow-up Timing & UNRESPONSIVE
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import {
  FOLLOW_UP_TIMING,
  RATE_LIMITS,
  getFollowUpDelay,
  FollowUpSchedule,
  ConversationState,
} from '@/types/leads-captain';
import { markUnresponsive, canAIRespond } from './state-machine';

/**
 * Result of scheduling a follow-up
 */
export interface ScheduleFollowUpResult {
  success: boolean;
  scheduledAt?: string;
  followUpNumber?: 1 | 2 | 3;
  error?: string;
  isMaxFollowUpsReached?: boolean;
}

/**
 * Schedule the next follow-up for a conversation
 *
 * Follow-up timing per spec Section 4.4:
 * - 1st: 1 hour after last customer message
 * - 2nd: 4 hours after 1st follow-up
 * - 3rd: 24 hours after 2nd follow-up
 * - After 3rd: Mark UNRESPONSIVE after 48 hours total silence
 *
 * @param conversationId - The conversation to schedule follow-up for
 */
export async function scheduleNextFollowUp(
  conversationId: string
): Promise<ScheduleFollowUpResult> {
  const supabase = createAdminClient();

  // Get current conversation state
  const { data: conversation, error: fetchError } = await supabase
    .from('leads_captain_conversations_v2')
    .select('conversation_state, follow_up_count, last_customer_message_at, last_follow_up_at')
    .eq('id', conversationId)
    .single();

  if (fetchError || !conversation) {
    return {
      success: false,
      error: `Conversation not found: ${conversationId}`,
    };
  }

  // Check if AI can respond in current state
  const currentState = conversation.conversation_state as ConversationState;
  if (!canAIRespond(currentState)) {
    return {
      success: false,
      error: `AI cannot send follow-ups in state: ${currentState}`,
    };
  }

  const currentFollowUpCount = conversation.follow_up_count || 0;

  // Check if max follow-ups reached
  if (currentFollowUpCount >= RATE_LIMITS.maxConsecutiveFollowUps) {
    jobLogger.info({
      msg: 'Max follow-ups reached for conversation',
      conversationId,
      followUpCount: currentFollowUpCount,
    });
    return {
      success: false,
      isMaxFollowUpsReached: true,
      error: 'Maximum follow-ups (3) reached',
    };
  }

  const nextFollowUpNumber = (currentFollowUpCount + 1) as 1 | 2 | 3;
  const delayMinutes = getFollowUpDelay(nextFollowUpNumber);

  // Calculate scheduled time
  // For 1st follow-up: base from last customer message
  // For subsequent: base from last follow-up
  const baseTime = nextFollowUpNumber === 1
    ? conversation.last_customer_message_at
    : conversation.last_follow_up_at;

  if (!baseTime) {
    return {
      success: false,
      error: 'No base time available for scheduling follow-up',
    };
  }

  const scheduledAt = new Date(new Date(baseTime).getTime() + delayMinutes * 60 * 1000);

  // Create follow-up schedule record
  const { error: insertError } = await supabase
    .from('follow_up_schedule')
    .upsert({
      conversation_id: conversationId,
      follow_up_number: nextFollowUpNumber,
      scheduled_at: scheduledAt.toISOString(),
      sent_at: null,
      customer_responded: false,
    }, {
      onConflict: 'conversation_id,follow_up_number',
    });

  if (insertError) {
    jobLogger.error({
      msg: 'Failed to create follow-up schedule',
      conversationId,
      error: insertError.message,
    });
    return {
      success: false,
      error: insertError.message,
    };
  }

  // Update conversation with next follow-up time
  const { error: updateError } = await supabase
    .from('leads_captain_conversations_v2')
    .update({
      next_follow_up_at: scheduledAt.toISOString(),
    })
    .eq('id', conversationId);

  if (updateError) {
    jobLogger.error({
      msg: 'Failed to update conversation follow-up time',
      conversationId,
      error: updateError.message,
    });
  }

  jobLogger.info({
    msg: 'Scheduled follow-up',
    conversationId,
    followUpNumber: nextFollowUpNumber,
    scheduledAt: scheduledAt.toISOString(),
    delayMinutes,
  });

  return {
    success: true,
    scheduledAt: scheduledAt.toISOString(),
    followUpNumber: nextFollowUpNumber,
  };
}

/**
 * Mark a follow-up as sent
 */
export async function markFollowUpSent(
  conversationId: string,
  followUpNumber: 1 | 2 | 3
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Update the follow-up schedule record
  const { error: scheduleError } = await supabase
    .from('follow_up_schedule')
    .update({
      sent_at: now,
    })
    .eq('conversation_id', conversationId)
    .eq('follow_up_number', followUpNumber);

  if (scheduleError) {
    return {
      success: false,
      error: scheduleError.message,
    };
  }

  // Update conversation
  const { error: convError } = await supabase
    .from('leads_captain_conversations_v2')
    .update({
      follow_up_count: followUpNumber,
      last_follow_up_at: now,
      next_follow_up_at: null, // Clear until next is scheduled
    })
    .eq('id', conversationId);

  if (convError) {
    return {
      success: false,
      error: convError.message,
    };
  }

  return { success: true };
}

/**
 * Handle customer response - cancel pending follow-ups and reset counter
 */
export async function cancelPendingFollowUps(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Mark pending follow-up as responded
  await supabase
    .from('follow_up_schedule')
    .update({
      customer_responded: true,
    })
    .eq('conversation_id', conversationId)
    .is('sent_at', null);

  // Reset conversation follow-up state
  const { error } = await supabase
    .from('leads_captain_conversations_v2')
    .update({
      follow_up_count: 0,
      next_follow_up_at: null,
    })
    .eq('id', conversationId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * Get pending follow-ups that are due to be sent
 *
 * @param limit - Maximum number of follow-ups to fetch
 */
export async function getPendingFollowUps(
  limit: number = 100
): Promise<FollowUpSchedule[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('follow_up_schedule')
    .select('*')
    .is('sent_at', null)
    .eq('customer_responded', false)
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    jobLogger.error({
      msg: 'Failed to fetch pending follow-ups',
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Check for conversations that should be marked UNRESPONSIVE
 * Called by a background job to process stale conversations
 *
 * Per spec: Mark UNRESPONSIVE after 48 hours total silence
 */
export async function checkUnresponsiveConversations(): Promise<{
  processed: number;
  marked: number;
}> {
  const supabase = createAdminClient();

  // Find conversations that:
  // 1. Have reached max follow-ups (3)
  // 2. Last message was 48+ hours ago
  // 3. Are still in an AI-active state
  const cutoffTime = new Date(
    Date.now() - FOLLOW_UP_TIMING.unresponsiveAfter * 60 * 1000
  ).toISOString();

  const { data: conversations, error } = await supabase
    .from('leads_captain_conversations_v2')
    .select('id, conversation_state, follow_up_count, last_customer_message_at')
    .gte('follow_up_count', RATE_LIMITS.maxConsecutiveFollowUps)
    .lte('last_customer_message_at', cutoffTime)
    .in('conversation_state', ['INITIATED', 'QUALIFYING', 'QUALIFIED', 'ROUTED'])
    .limit(100);

  if (error) {
    jobLogger.error({
      msg: 'Failed to fetch unresponsive candidates',
      error: error.message,
    });
    return { processed: 0, marked: 0 };
  }

  let marked = 0;

  for (const conv of conversations || []) {
    const result = await markUnresponsive(conv.id);
    if (result.success) {
      marked++;
      jobLogger.info({
        msg: 'Marked conversation as UNRESPONSIVE',
        conversationId: conv.id,
        lastMessage: conv.last_customer_message_at,
      });
    }
  }

  return {
    processed: conversations?.length || 0,
    marked,
  };
}

/**
 * Get follow-up message content based on follow-up number
 *
 * @param followUpNumber - Which follow-up this is (1, 2, or 3)
 * @param businessName - Business name for personalization
 * @param customerName - Customer name if known
 */
export function getFollowUpMessage(
  followUpNumber: 1 | 2 | 3,
  businessName: string,
  customerName?: string | null
): string {
  const greeting = customerName ? `Hi ${customerName}` : 'Hi there';

  switch (followUpNumber) {
    case 1:
      return `${greeting}! Just checking in - were you still looking to get that service scheduled with ${businessName}? Let me know how I can help!`;

    case 2:
      return `${greeting}, I wanted to follow up one more time. If you're still interested in our services, just reply and I'll be happy to help get you scheduled. If not, no worries!`;

    case 3:
      return `${greeting}, this is my last follow-up. If you need ${businessName}'s services in the future, feel free to text back anytime. Have a great day!`;
  }
}

/**
 * Get conversation follow-up status
 */
export async function getFollowUpStatus(
  conversationId: string
): Promise<{
  followUpCount: number;
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  isMaxReached: boolean;
  history: FollowUpSchedule[];
}> {
  const supabase = createAdminClient();

  const [convResult, historyResult] = await Promise.all([
    supabase
      .from('leads_captain_conversations_v2')
      .select('follow_up_count, last_follow_up_at, next_follow_up_at')
      .eq('id', conversationId)
      .single(),
    supabase
      .from('follow_up_schedule')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('follow_up_number', { ascending: true }),
  ]);

  const conv = convResult.data;

  return {
    followUpCount: conv?.follow_up_count || 0,
    lastFollowUpAt: conv?.last_follow_up_at || null,
    nextFollowUpAt: conv?.next_follow_up_at || null,
    isMaxReached: (conv?.follow_up_count || 0) >= RATE_LIMITS.maxConsecutiveFollowUps,
    history: historyResult.data || [],
  };
}

/**
 * Calculate time until next follow-up can be sent
 *
 * @returns Minutes until next follow-up, or 0 if can send now
 */
export function getTimeUntilFollowUp(
  lastMessageAt: string,
  followUpNumber: 1 | 2 | 3
): number {
  const delayMinutes = getFollowUpDelay(followUpNumber);
  const canSendAt = new Date(new Date(lastMessageAt).getTime() + delayMinutes * 60 * 1000);
  const now = new Date();

  const diffMs = canSendAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 60000));
}
