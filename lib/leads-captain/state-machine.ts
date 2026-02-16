// =====================================================
// Leads Captain State Machine Service
// Spec v1.1 Compliant - Formal Conversation Lifecycle
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import {
  ConversationState,
  VALID_STATE_TRANSITIONS,
  isValidStateTransition,
  StateChangeTrigger,
  StateTransitionLog,
  URGENCY_ROUTING_TIMEOUT,
  LeadUrgency,
} from '@/types/leads-captain';

/**
 * Result of a state transition attempt
 */
export interface StateTransitionResult {
  success: boolean;
  previousState: ConversationState | null;
  newState: ConversationState;
  error?: string;
  transitionLog?: StateTransitionLog;
}

/**
 * Options for state transition
 */
export interface TransitionOptions {
  /** Reason for the state change */
  reason: string;
  /** Who/what triggered the transition */
  triggeredBy: StateChangeTrigger;
  /** Optional urgency for setting routing timeout */
  urgency?: LeadUrgency;
  /** Skip database update (for testing) */
  skipDbUpdate?: boolean;
}

/**
 * Transition a conversation to a new state
 * Validates the transition is allowed and logs it to the database
 *
 * CRITICAL: HUMAN_ACTIVE is a TERMINAL state for AI.
 * Once in HUMAN_ACTIVE, AI CANNOT re-engage (no timers, no auto-resume).
 * The only way out is OPTED_OUT or CLOSED.
 */
export async function transitionState(
  conversationId: string,
  toState: ConversationState,
  options: TransitionOptions
): Promise<StateTransitionResult> {
  const supabase = createAdminClient();

  // Get current conversation state
  const { data: conversation, error: fetchError } = await supabase
    .from('leads_captain_conversations_v2')
    .select('id, conversation_state, business_id')
    .eq('id', conversationId)
    .single();

  if (fetchError || !conversation) {
    jobLogger.error({
      msg: 'Failed to fetch conversation for state transition',
      conversationId,
      error: fetchError?.message,
    });
    return {
      success: false,
      previousState: null,
      newState: toState,
      error: `Conversation not found: ${conversationId}`,
    };
  }

  const fromState = conversation.conversation_state as ConversationState | null;

  // Validate the transition
  if (!isValidStateTransition(fromState, toState)) {
    const errorMsg = `Invalid state transition: ${fromState || 'null'} → ${toState}`;
    jobLogger.warn({
      msg: errorMsg,
      conversationId,
      fromState,
      toState,
      validTransitions: fromState ? VALID_STATE_TRANSITIONS[fromState] : ['INITIATED'],
    });
    return {
      success: false,
      previousState: fromState,
      newState: toState,
      error: errorMsg,
    };
  }

  // Special handling for HUMAN_ACTIVE state
  // Log a warning if transitioning INTO HUMAN_ACTIVE - AI is now permanently disabled
  if (toState === 'HUMAN_ACTIVE') {
    jobLogger.info({
      msg: 'Conversation transitioning to HUMAN_ACTIVE - AI PERMANENTLY DISABLED',
      conversationId,
      fromState,
      reason: options.reason,
      triggeredBy: options.triggeredBy,
    });
  }

  const now = new Date().toISOString();

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    conversation_state: toState,
    state_changed_at: now,
    state_change_reason: options.reason,
  };

  // Add state-specific fields
  if (toState === 'HUMAN_ACTIVE') {
    updatePayload.human_active_since = now;
    // Clear any follow-up scheduling - AI is done
    updatePayload.next_follow_up_at = null;
    updatePayload.routing_timeout_at = null;
  } else if (toState === 'QUALIFIED' && options.urgency) {
    // Set routing timeout based on urgency
    const timeoutMinutes = URGENCY_ROUTING_TIMEOUT[options.urgency];
    if (timeoutMinutes > 0) {
      const routingTimeout = new Date(Date.now() + timeoutMinutes * 60 * 1000);
      updatePayload.routing_timeout_at = routingTimeout.toISOString();
    } else {
      // Emergency: immediate routing
      updatePayload.routing_timeout_at = now;
    }
  } else if (toState === 'UNRESPONSIVE') {
    updatePayload.unresponsive_at = now;
  } else if (toState === 'OPTED_OUT') {
    // Clear all pending actions
    updatePayload.next_follow_up_at = null;
    updatePayload.routing_timeout_at = null;
  } else if (toState === 'CLOSED') {
    // Clear all pending actions
    updatePayload.next_follow_up_at = null;
    updatePayload.routing_timeout_at = null;
    updatePayload.human_active_since = null;
  }

  // Also update the legacy status field for backwards compatibility
  const legacyStatus = mapStateToLegacyStatus(toState);
  if (legacyStatus) {
    updatePayload.status = legacyStatus;
  }

  if (!options.skipDbUpdate) {
    // Update conversation state
    const { error: updateError } = await supabase
      .from('leads_captain_conversations_v2')
      .update(updatePayload)
      .eq('id', conversationId);

    if (updateError) {
      jobLogger.error({
        msg: 'Failed to update conversation state',
        conversationId,
        toState,
        error: updateError.message,
      });
      return {
        success: false,
        previousState: fromState,
        newState: toState,
        error: `Database update failed: ${updateError.message}`,
      };
    }

    // Log state transition
    const { data: logEntry, error: logError } = await supabase
      .from('conversation_state_log')
      .insert({
        conversation_id: conversationId,
        from_state: fromState,
        to_state: toState,
        reason: options.reason,
        triggered_by: options.triggeredBy,
      })
      .select()
      .single();

    if (logError) {
      // Log error but don't fail the transition
      jobLogger.warn({
        msg: 'Failed to log state transition',
        conversationId,
        error: logError.message,
      });
    }

    return {
      success: true,
      previousState: fromState,
      newState: toState,
      transitionLog: logEntry || undefined,
    };
  }

  // Skip DB update mode (for testing)
  return {
    success: true,
    previousState: fromState,
    newState: toState,
  };
}

/**
 * Get valid next states for a given current state
 */
export function getValidNextStates(currentState: ConversationState | null): ConversationState[] {
  if (currentState === null) {
    return ['INITIATED'];
  }
  return VALID_STATE_TRANSITIONS[currentState];
}

/**
 * Check if AI can respond in the current state
 * AI is DISABLED in: HUMAN_ACTIVE, OPTED_OUT, CLOSED, UNRESPONSIVE
 */
export function canAIRespond(state: ConversationState): boolean {
  const aiDisabledStates: ConversationState[] = [
    'HUMAN_ACTIVE',
    'OPTED_OUT',
    'CLOSED',
    'UNRESPONSIVE',
  ];
  return !aiDisabledStates.includes(state);
}

/**
 * Check if this is a state where AI was active
 */
export function isAIActiveState(state: ConversationState): boolean {
  const aiActiveStates: ConversationState[] = [
    'INITIATED',
    'QUALIFYING',
    'QUALIFIED',
    'ROUTED',
  ];
  return aiActiveStates.includes(state);
}

/**
 * Handle human takeover - transition to HUMAN_ACTIVE state
 * This permanently disables AI for this conversation
 *
 * @param conversationId - The conversation to take over
 * @param reason - Why the takeover is happening
 * @returns StateTransitionResult
 */
export async function handleHumanTakeover(
  conversationId: string,
  reason: string = 'Human team member responded'
): Promise<StateTransitionResult> {
  return transitionState(conversationId, 'HUMAN_ACTIVE', {
    reason,
    triggeredBy: 'human',
  });
}

/**
 * Handle customer opt-out
 *
 * @param conversationId - The conversation
 * @param keyword - The opt-out keyword used (e.g., 'STOP')
 */
export async function handleOptOut(
  conversationId: string,
  keyword: string
): Promise<StateTransitionResult> {
  return transitionState(conversationId, 'OPTED_OUT', {
    reason: `Customer opted out via keyword: ${keyword}`,
    triggeredBy: 'customer',
  });
}

/**
 * Handle customer opt-back-in (START keyword)
 * Sets opt_back_in_pending flag - AI resumes on NEXT message, not immediately
 *
 * @param conversationId - The conversation
 */
export async function handleOptBackIn(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Set the pending flag - AI will resume on the NEXT message
  const { error } = await supabase
    .from('leads_captain_conversations_v2')
    .update({
      opt_back_in_pending: true,
    })
    .eq('id', conversationId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // Log the opt-back-in
  await supabase.from('conversation_state_log').insert({
    conversation_id: conversationId,
    from_state: 'OPTED_OUT',
    to_state: 'OPTED_OUT', // Stay in OPTED_OUT until next message
    reason: 'Customer sent START - will resume on next message',
    triggered_by: 'customer',
  });

  return { success: true };
}

/**
 * Process opt-back-in on next message
 * Called when a new message arrives and opt_back_in_pending is true
 */
export async function processOptBackInResume(
  conversationId: string
): Promise<StateTransitionResult> {
  const supabase = createAdminClient();

  // Clear the pending flag
  await supabase
    .from('leads_captain_conversations_v2')
    .update({
      opt_back_in_pending: false,
    })
    .eq('id', conversationId);

  // Transition back to QUALIFYING
  return transitionState(conversationId, 'QUALIFYING', {
    reason: 'Customer resumed conversation after opt-back-in',
    triggeredBy: 'customer',
  });
}

/**
 * Mark conversation as unresponsive (48+ hours without response)
 */
export async function markUnresponsive(
  conversationId: string
): Promise<StateTransitionResult> {
  return transitionState(conversationId, 'UNRESPONSIVE', {
    reason: 'No customer response for 48+ hours',
    triggeredBy: 'system',
  });
}

/**
 * Close a conversation
 */
export async function closeConversation(
  conversationId: string,
  reason: string,
  triggeredBy: StateChangeTrigger = 'system'
): Promise<StateTransitionResult> {
  return transitionState(conversationId, 'CLOSED', {
    reason,
    triggeredBy,
  });
}

/**
 * Admin reset - allows re-enabling AI after HUMAN_ACTIVE
 * This is the ONLY way to re-enable AI after human takeover
 *
 * @param conversationId - The conversation to reset
 * @param adminUserId - The admin user performing the reset
 */
export async function adminResetConversation(
  conversationId: string,
  adminUserId: string
): Promise<StateTransitionResult> {
  const supabase = createAdminClient();

  // Get current state
  const { data: conversation, error } = await supabase
    .from('leads_captain_conversations_v2')
    .select('conversation_state')
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    return {
      success: false,
      previousState: null,
      newState: 'QUALIFYING',
      error: 'Conversation not found',
    };
  }

  const currentState = conversation.conversation_state as ConversationState;

  // Only allow reset from HUMAN_ACTIVE or UNRESPONSIVE
  if (currentState !== 'HUMAN_ACTIVE' && currentState !== 'UNRESPONSIVE') {
    return {
      success: false,
      previousState: currentState,
      newState: 'QUALIFYING',
      error: `Cannot reset from state: ${currentState}. Only HUMAN_ACTIVE or UNRESPONSIVE can be reset.`,
    };
  }

  // Clear human_active_since and reset state
  await supabase
    .from('leads_captain_conversations_v2')
    .update({
      human_active_since: null,
      unresponsive_at: null,
    })
    .eq('id', conversationId);

  // Use system as trigger but log admin action
  const result = await transitionState(conversationId, 'QUALIFYING', {
    reason: `Admin reset by user ${adminUserId}`,
    triggeredBy: 'system', // 'system' because it's an admin action via API
  });

  // Log admin action separately
  if (result.success) {
    await supabase.from('leads_captain_audit_log').insert({
      config_id: null, // Will need to get this from conversation
      conversation_id: conversationId,
      action: 'admin_reset_ai',
      actor: adminUserId,
      details: {
        previous_state: currentState,
        new_state: 'QUALIFYING',
      },
    });
  }

  return result;
}

/**
 * Get state transition history for a conversation
 */
export async function getStateHistory(
  conversationId: string,
  limit: number = 50
): Promise<StateTransitionLog[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('conversation_state_log')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    jobLogger.error({
      msg: 'Failed to fetch state history',
      conversationId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Map new conversation state to legacy status field
 * For backwards compatibility with existing code
 */
function mapStateToLegacyStatus(state: ConversationState): string | null {
  switch (state) {
    case 'INITIATED':
    case 'QUALIFYING':
    case 'QUALIFIED':
    case 'ROUTED':
      return 'active';
    case 'HUMAN_ACTIVE':
      return 'human_takeover';
    case 'UNRESPONSIVE':
      return 'active'; // Keep active for follow-up attempts
    case 'OPTED_OUT':
      return 'closed';
    case 'CLOSED':
      return 'closed';
    default:
      return null;
  }
}

/**
 * Initialize a new conversation with INITIATED state
 * Should be called when creating a new conversation
 */
export async function initializeConversationState(
  conversationId: string,
  initiationSource: string,
  initiationEvidenceId: string
): Promise<StateTransitionResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Update with initiation evidence
  await supabase
    .from('leads_captain_conversations_v2')
    .update({
      initiation_source: initiationSource,
      initiation_evidence_id: initiationEvidenceId,
      initiated_at: now,
    })
    .eq('id', conversationId);

  return transitionState(conversationId, 'INITIATED', {
    reason: `Conversation initiated via ${initiationSource}`,
    triggeredBy: 'customer',
  });
}

/**
 * Progress from INITIATED to QUALIFYING
 * Called when first AI response is sent
 */
export async function startQualifying(
  conversationId: string
): Promise<StateTransitionResult> {
  return transitionState(conversationId, 'QUALIFYING', {
    reason: 'AI started qualification flow',
    triggeredBy: 'ai',
  });
}

/**
 * Mark conversation as qualified
 * Called when all required qualification data is collected
 */
export async function markQualified(
  conversationId: string,
  urgency: LeadUrgency
): Promise<StateTransitionResult> {
  return transitionState(conversationId, 'QUALIFIED', {
    reason: 'All required qualification data collected',
    triggeredBy: 'ai',
    urgency,
  });
}

/**
 * Route conversation (hand off to CRM/human)
 */
export async function routeConversation(
  conversationId: string,
  reason: string = 'Routing timeout reached'
): Promise<StateTransitionResult> {
  return transitionState(conversationId, 'ROUTED', {
    reason,
    triggeredBy: 'system',
  });
}
