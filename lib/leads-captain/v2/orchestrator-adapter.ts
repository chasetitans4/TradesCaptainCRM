// =====================================================
// Leads Captain v2.0 - Orchestrator Adapter
// Bridges new orchestrator with existing processor interface
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import {
  LeadsCaptainConfig,
  LeadsCaptainConversation,
  LeadsCaptainMessage,
  LeadsCaptainRule,
  LeadsCaptainTemplate,
  LeadsCaptainIntent,
  LeadsCaptainPriceItem,
  LeadsCaptainNotificationRecipient,
  MessageProcessingResult,
  IntentClassificationResult,
} from '@/types/leads-captain';
import { handleCompliance, isOptedOut, sanitizeMessage } from './compliance';
import { isWithinBusinessHours, isWithinQuietHours } from './rule-engine';
import { orchestrateMessage } from '../orchestrator';

// =====================================================
// ADAPTER OPTIONS
// =====================================================

export interface OrchestratorAdapterOptions {
  config_id: string;
  business_id: string;
  customer_phone: string;
  business_phone: string;
  message: string;
  is_missed_call?: boolean;
  twilio_sid?: string;
  config: LeadsCaptainConfig;
  rules: LeadsCaptainRule[];
  templates: LeadsCaptainTemplate[];
  priceList: LeadsCaptainPriceItem[];
  notificationRecipients: LeadsCaptainNotificationRecipient[];
  intents: LeadsCaptainIntent[];
  supabase: ReturnType<typeof createAdminClient>;
}

// =====================================================
// MAIN ADAPTER FUNCTION
// =====================================================

/**
 * Process message using new orchestrator and return result
 * in the format expected by the existing processor interface
 */
export async function processWithNewOrchestrator(
  options: OrchestratorAdapterOptions
): Promise<MessageProcessingResult> {
  const {
    config,
    rules,
    customer_phone,
    message,
    twilio_sid,
    supabase,
  } = options;

  const startTime = Date.now();

  // Step 1: Sanitize message
  const sanitizedMessage = sanitizeMessage(message);

  // Step 2: Check compliance keywords (STOP/HELP/START)
  const complianceResult = await handleCompliance(
    sanitizedMessage,
    customer_phone,
    options.config_id,
    config.business_name
  );

  if (complianceResult.is_compliance_message) {
    return {
      response_content: complianceResult.response_text,
      should_send: complianceResult.response_required,
      requires_approval: false,
      classification: {
        intent: complianceResult.compliance_type || 'compliance',
        confidence: 100,
        sentiment: 'neutral',
        language: 'en',
        entities: {},
        is_compliance: true,
        compliance_type: complianceResult.compliance_type || undefined,
      },
      rule_matched: null,
      template_used: null,
      ai_used: false,
      explanation: `TCPA compliance: ${complianceResult.compliance_type}`,
      decision_details: { compliance: complianceResult },
      notifications: [],
      conversation_updates: {},
      should_escalate: false,
      compliance_action: complianceResult.compliance_type || undefined,
    };
  }

  // Step 3: Check if opted out
  const isSupressed = await isOptedOut(options.business_id, customer_phone);
  if (isSupressed) {
    return {
      response_content: null,
      should_send: false,
      requires_approval: false,
      classification: {
        intent: 'opted_out',
        confidence: 100,
        sentiment: 'neutral',
        language: 'en',
        entities: {},
        is_compliance: false,
      },
      rule_matched: null,
      template_used: null,
      ai_used: false,
      explanation: 'Customer is opted out - no response sent',
      decision_details: { opted_out: true },
      notifications: [],
      conversation_updates: {},
      should_escalate: false,
    };
  }

  // Step 4: Get or create conversation
  const { conversation, isFirstMessage } = await getOrCreateConversation(
    supabase,
    options.config_id,
    customer_phone
  );

  // Check if conversation is blocked or human takeover
  if (conversation.status === 'blocked' || conversation.opted_out) {
    return {
      response_content: null,
      should_send: false,
      requires_approval: false,
      classification: {
        intent: 'blocked',
        confidence: 100,
        sentiment: 'neutral',
        language: 'en',
        entities: {},
        is_compliance: false,
      },
      rule_matched: null,
      template_used: null,
      ai_used: false,
      explanation: conversation.opted_out ? 'Customer opted out' : 'Customer is blocked',
      decision_details: { conversation_status: conversation.status },
      notifications: [],
      conversation_updates: {},
      should_escalate: false,
    };
  }

  if (conversation.status === 'human_takeover') {
    await saveInboundMessage(supabase, conversation.id, sanitizedMessage, twilio_sid);
    return {
      response_content: null,
      should_send: false,
      requires_approval: false,
      classification: {
        intent: 'human_takeover',
        confidence: 100,
        sentiment: 'neutral',
        language: 'en',
        entities: {},
        is_compliance: false,
      },
      rule_matched: null,
      template_used: null,
      ai_used: false,
      explanation: 'Human has taken over this conversation',
      decision_details: { human_takeover: true },
      notifications: [],
      conversation_updates: {
        last_customer_message_at: new Date().toISOString(),
        message_count: conversation.message_count + 1,
      },
      should_escalate: false,
    };
  }

  // Step 5: Load conversation history
  const recentMessages = await loadConversationHistory(supabase, conversation.id, 10);

  // Step 6: Calculate business hours
  const now = new Date();
  const isBusinessHours = isWithinBusinessHours(config.business_hours, config.timezone, now);
  const isQuietHours = isWithinQuietHours('22:00', '07:00', config.timezone, now);

  // Step 7: Run the new orchestrator
  const orchestrationResult = await orchestrateMessage({
    config,
    conversation,
    rules,
    recentMessages,
    currentMessage: sanitizedMessage,
    isFirstMessage,
    isBusinessHours,
    isQuietHours,
  });

  // Step 8: Save inbound message
  const inboundMessageId = await saveInboundMessage(
    supabase,
    conversation.id,
    sanitizedMessage,
    twilio_sid,
    {
      intent: orchestrationResult.ruleMatchResult.detectedIntent,
      confidence: orchestrationResult.ruleMatchResult.intentConfidence,
      sentiment: 'neutral', // Would come from orchestrator
      language: 'en',
      entities: {},
      is_compliance: false,
    }
  );

  // Step 9: Update conversation
  if (Object.keys(orchestrationResult.conversationUpdates).length > 0) {
    await supabase
      .from('leads_captain_conversations_v2')
      .update({
        ...orchestrationResult.conversationUpdates,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);
  }

  // Step 10: Build notifications
  const notifications = buildNotificationsFromResult(
    orchestrationResult,
    options.notificationRecipients,
    isFirstMessage,
    isQuietHours
  );

  // Step 10.5: Save handoff summary
  if (orchestrationResult.handoffSummary) {
    try {
      const summary = orchestrationResult.handoffSummary;
      const { error: handoffError } = await supabase
        .from('leads_captain_handoff_summaries')
        .insert({
          conversation_id: conversation.id,
          quick_summary: summary.quickSummary,
          customer_mood: summary.customerMood,
          handoff_reason: summary.handoffReason,
          customer_wants: summary.customerWants,
          already_discussed: summary.alreadyDiscussed,
          not_yet_discussed: summary.notYetDiscussed,
          suggested_opening: summary.suggestedOpening,
          urgency_level: summary.urgencyLevel,
          warning_flags: summary.warningFlags,
          model_used: 'claude-3-5-sonnet-20241022',
          tokens_used: 0 // We don't track this strictly yet
        });

      if (handoffError) {
        jobLogger.error({
          msg: 'Failed to save handoff summary',
          error: handoffError.message,
          conversationId: conversation.id
        });
      } else {
        jobLogger.info({
          msg: 'Handoff summary saved',
          conversationId: conversation.id
        });
      }
    } catch (err) {
      jobLogger.error({
        msg: 'Error saving handoff summary',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Step 11: Return result in legacy format
  const processingTime = Date.now() - startTime;

  return {
    response_content: orchestrationResult.responseText,
    should_send: orchestrationResult.shouldSend && !orchestrationResult.requiresApproval,
    requires_approval: orchestrationResult.requiresApproval,
    classification: {
      intent: orchestrationResult.ruleMatchResult.detectedIntent,
      confidence: orchestrationResult.ruleMatchResult.intentConfidence,
      sentiment: 'neutral',
      language: 'en',
      entities: {},
      is_compliance: false,
    },
    rule_matched: orchestrationResult.ruleMatchResult.matchedRule,
    template_used: null, // Would need to track this in orchestrator
    ai_used: orchestrationResult.conversationAgentResult !== null,
    explanation: orchestrationResult.explanation,
    decision_details: {
      orchestrator_used: true,
      processing_time_ms: processingTime,
      rule_match_reason: orchestrationResult.ruleMatchResult.matchReason,
      conversation_state: orchestrationResult.newConversationState,
      emergency_details: orchestrationResult.emergencyDetails,
    },
    notifications,
    conversation_updates: orchestrationResult.conversationUpdates,
    should_escalate: orchestrationResult.shouldEscalate,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getOrCreateConversation(
  supabase: ReturnType<typeof createAdminClient>,
  configId: string,
  customerPhone: string
): Promise<{ conversation: LeadsCaptainConversation; isFirstMessage: boolean }> {
  // Look for existing active conversation
  const { data: existing } = await supabase
    .from('leads_captain_conversations_v2')
    .select('*')
    .eq('config_id', configId)
    .eq('customer_phone', customerPhone)
    .in('status', ['active', 'human_takeover'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return { conversation: existing, isFirstMessage: false };
  }

  // Create new conversation
  const { data: newConversation, error } = await supabase
    .from('leads_captain_conversations_v2')
    .insert({
      config_id: configId,
      customer_phone: customerPhone,
      status: 'active',
      started_at: new Date().toISOString(),
      message_count: 0,
      ai_message_count: 0,
      customer_memory: {},
    })
    .select()
    .single();

  if (error || !newConversation) {
    throw new Error(`Failed to create conversation: ${error?.message}`);
  }

  return { conversation: newConversation, isFirstMessage: true };
}

async function loadConversationHistory(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  limit: number
): Promise<LeadsCaptainMessage[]> {
  const { data } = await supabase
    .from('leads_captain_messages_v2')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return data || [];
}

async function saveInboundMessage(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  content: string,
  twilioSid?: string,
  classification?: IntentClassificationResult
): Promise<string> {
  const { data, error } = await supabase
    .from('leads_captain_messages_v2')
    .insert({
      conversation_id: conversationId,
      direction: 'inbound',
      content,
      twilio_sid: twilioSid,
      detected_intent: classification?.intent,
      intent_confidence: classification?.confidence,
      detected_sentiment: classification?.sentiment,
      detected_language: classification?.language,
      extracted_entities: classification?.entities,
      delivery_status: 'delivered',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save inbound message: ${error?.message}`);
  }

  return data.id;
}

function buildNotificationsFromResult(
  result: Awaited<ReturnType<typeof orchestrateMessage>>,
  recipients: LeadsCaptainNotificationRecipient[],
  isFirstMessage: boolean,
  isQuietHours: boolean
): MessageProcessingResult['notifications'] {
  const notifications: MessageProcessingResult['notifications'] = [];

  // Determine which triggers apply
  const triggers: Array<keyof LeadsCaptainNotificationRecipient['triggers']> = [];

  if (isFirstMessage) triggers.push('new_conversation');
  if (result.isEmergency) triggers.push('emergency');
  if (result.shouldEscalate) triggers.push('escalation');

  // Build notifications for each trigger
  for (const trigger of triggers) {
    for (const recipient of recipients) {
      if (!recipient.is_active) continue;
      if (!recipient.triggers[trigger]) continue;

      // Check quiet hours
      if (isQuietHours && recipient.quiet_hours_enabled) {
        if (trigger !== 'emergency' || !recipient.quiet_hours_except_emergency) {
          continue;
        }
      }

      const methods: ('sms' | 'push' | 'email')[] = [];
      if (recipient.notify_sms) methods.push('sms');
      if (recipient.notify_push) methods.push('push');
      if (recipient.notify_email) methods.push('email');

      if (methods.length > 0) {
        notifications.push({
          recipient_id: recipient.id,
          methods,
          urgency: trigger === 'emergency' ? 'immediate' : 'normal',
        });
      }
    }
  }

  return notifications;
}
