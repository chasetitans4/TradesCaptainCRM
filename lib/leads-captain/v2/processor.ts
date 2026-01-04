// =====================================================
// Leads Captain v2.0 Message Processor
// Main orchestration pipeline for inbound messages
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
  RuleEvaluationContext,
  IntentClassificationResult,
} from '@/types/leads-captain';
import { handleCompliance, isOptedOut, sanitizeMessage } from './compliance';
import { classifyIntent, extractCustomerName } from './intent-classifier';
import { evaluateRules, executeRuleActions, isWithinBusinessHours, isWithinQuietHours } from './rule-engine';
import { renderTemplate, buildTemplateVariables, addEmoji } from './template-renderer';
import { generateAIResponse, requiresApproval } from './guardrails';
import { canAccessFeature, checkPlanLimit } from './features';

export interface ProcessorOptions {
  config_id: string;
  business_id: string;
  customer_phone: string;
  business_phone: string;
  message: string;
  is_missed_call?: boolean;
  twilio_sid?: string;
}

/**
 * Process an inbound SMS message
 * This is the main entry point for the Leads Captain v2 engine
 *
 * Processing steps:
 * 1. Sanitize and validate message
 * 2. Check compliance keywords (STOP/HELP/START)
 * 3. Check if opted out
 * 4. Get or create conversation
 * 5. Classify intent
 * 6. Evaluate rules
 * 7. Generate response (template or AI)
 * 8. Apply guardrails
 * 9. Check if approval required
 * 10. Save message and update conversation
 * 11. Trigger notifications
 */
export async function processInboundMessage(
  options: ProcessorOptions
): Promise<MessageProcessingResult> {
  const supabase = createAdminClient();
  const startTime = Date.now();

  // Step 1: Sanitize message
  const sanitizedMessage = sanitizeMessage(options.message);

  // Load config and related data
  const [config, intents, rules, templates, priceList, notificationRecipients] = await Promise.all([
    loadConfig(options.config_id, supabase),
    loadIntents(options.config_id, supabase),
    loadRules(options.config_id, supabase),
    loadTemplates(options.config_id, supabase),
    loadPriceList(options.config_id, supabase),
    loadNotificationRecipients(options.config_id, supabase),
  ]);

  if (!config) {
    throw new Error(`Leads Captain config not found: ${options.config_id}`);
  }

  // Check if Leads Captain is paused
  if (config.global_mode === 'paused') {
    return {
      response_content: null,
      should_send: false,
      requires_approval: false,
      classification: {
        intent: 'unknown',
        confidence: 0,
        sentiment: 'neutral',
        language: 'en',
        entities: {},
        is_compliance: false,
      },
      rule_matched: null,
      template_used: null,
      ai_used: false,
      explanation: 'Leads Captain is paused for this business',
      decision_details: { global_mode: 'paused' },
      notifications: [],
      conversation_updates: {},
      should_escalate: false,
    };
  }

  // Step 2: Check compliance keywords
  const complianceResult = await handleCompliance(
    sanitizedMessage,
    options.customer_phone,
    options.config_id,
    config.business_name
  );

  if (complianceResult.is_compliance_message) {
    // Log audit
    await logAudit(supabase, options.config_id, null, null, complianceResult.compliance_type === 'opt_out' ? 'opt_out' : 'message_received', 'system', {
      compliance_type: complianceResult.compliance_type,
    });

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
  const isSupressed = await isOptedOut(options.business_id, options.customer_phone);
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
    options.customer_phone,
    options.is_missed_call
  );

  // Check if conversation is muted (per-conversation kill switch, Section 7.3)
  if (conversation.muted_until && new Date(conversation.muted_until) > new Date()) {
    return {
      response_content: null,
      should_send: false,
      requires_approval: false,
      classification: {
        intent: 'muted',
        confidence: 100,
        sentiment: 'neutral',
        language: 'en',
        entities: {},
        is_compliance: false,
      },
      rule_matched: null,
      template_used: null,
      ai_used: false,
      explanation: `Conversation is muted until ${conversation.muted_until}`,
      decision_details: { muted_until: conversation.muted_until },
      notifications: [],
      conversation_updates: {},
      should_escalate: false,
    };
  }

  // If conversation is blocked or opted out, don't respond
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

  // If human has taken over, don't auto-respond
  if (conversation.status === 'human_takeover') {
    // Still save the inbound message but don't generate response
    await saveInboundMessage(supabase, conversation.id, sanitizedMessage, options.twilio_sid);

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
      notifications: [
        // Notify about new message during takeover
        ...buildNotifications(notificationRecipients, 'every_message', false),
      ],
      conversation_updates: {
        last_customer_message_at: new Date().toISOString(),
        message_count: conversation.message_count + 1,
      },
      should_escalate: false,
    };
  }

  // Step 5: Classify intent
  const classification = await classifyIntent(sanitizedMessage, {
    enabled_intents: intents,
    business_context: config.business_type || undefined,
  });

  // Save inbound message with classification
  const inboundMessageId = await saveInboundMessage(
    supabase,
    conversation.id,
    sanitizedMessage,
    options.twilio_sid,
    classification
  );

  // Extract customer name if not known
  let customerName = conversation.customer_name;
  if (!customerName && classification.entities.name) {
    customerName = classification.entities.name;
  }
  if (!customerName) {
    customerName = extractCustomerName(sanitizedMessage) || null;
  }

  // Step 6: Build context and evaluate rules
  const now = new Date();
  const isBusinessHours = isWithinBusinessHours(config.business_hours, config.timezone, now);
  const isQuietHours = isWithinQuietHours('22:00', '07:00', config.timezone, now); // Default quiet hours

  const ruleContext: RuleEvaluationContext = {
    message: sanitizedMessage,
    classification,
    conversation,
    config,
    is_first_message: isFirstMessage,
    current_time: now,
    is_business_hours: isBusinessHours,
    is_quiet_hours: isQuietHours,
  };

  const ruleResult = evaluateRules(rules, ruleContext);

  // Initialize result variables
  let responseContent: string | null = null;
  let templateUsed: LeadsCaptainTemplate | null = null;
  let ruleMatched: LeadsCaptainRule | null = ruleResult.rule;
  let aiUsed = false;
  let explanation = '';
  const decisionDetails: Record<string, unknown> = {
    classification,
    rules_evaluated: rules.map(r => r.name),
    is_business_hours: isBusinessHours,
    processing_time_ms: 0,
  };
  const conversationUpdates: Partial<LeadsCaptainConversation> = {
    current_intent: classification.intent,
    sentiment: classification.sentiment,
    last_customer_message_at: new Date().toISOString(),
    message_count: conversation.message_count + 1,
  };

  if (customerName && customerName !== conversation.customer_name) {
    conversationUpdates.customer_name = customerName;
  }

  // Step 7: Generate response based on rule or AI fallback
  let shouldEscalate = false;
  let notifications: MessageProcessingResult['notifications'] = [];

  if (ruleMatched) {
    // Rule matched - execute actions
    const actions = executeRuleActions(ruleMatched, ruleContext);

    decisionDetails.rule_matched = ruleMatched.name;
    decisionDetails.rule_actions = actions;

    if (!actions.should_send_response) {
      explanation = `Rule "${ruleMatched.name}" matched - no response configured`;
      responseContent = null;
    } else if (actions.template_id) {
      // Find and render template
      templateUsed = templates.find(t => t.id === actions.template_id) || null;

      if (templateUsed) {
        const variables = buildTemplateVariables(config, conversation, customerName || undefined, priceList);
        const rendered = renderTemplate(templateUsed, variables);
        responseContent = rendered.content;

        // Add emoji based on settings
        responseContent = addEmoji(
          responseContent,
          templateUsed.emoji_setting,
          config.use_emojis
        );

        explanation = `Rule "${ruleMatched.name}" matched - using template "${templateUsed.name}"`;
        decisionDetails.template_variables = variables;
        decisionDetails.template_rendered = rendered;
      } else {
        explanation = `Rule "${ruleMatched.name}" matched but template not found`;
      }
    } else if (actions.direct_text) {
      responseContent = actions.direct_text;
      explanation = `Rule "${ruleMatched.name}" matched - direct text response`;
    } else if (actions.use_ai) {
      // Rule says to use AI
      aiUsed = true;
    }

    // Handle escalation
    if (actions.should_escalate) {
      shouldEscalate = true;
      conversationUpdates.requires_human = true;
      conversationUpdates.status = 'human_takeover';
    }

    // Handle stop AI flag
    if (actions.stop_ai) {
      conversationUpdates.requires_human = true;
    }

    // Handle conversation flags
    if (actions.conversation_updates.is_hot_lead !== undefined) {
      conversationUpdates.is_hot_lead = actions.conversation_updates.is_hot_lead;
    }
    if (actions.conversation_updates.is_emergency !== undefined) {
      conversationUpdates.is_emergency = actions.conversation_updates.is_emergency;
    }

    // Build notifications from rule
    if (actions.should_notify && actions.notification_config) {
      notifications = buildRuleNotifications(
        notificationRecipients,
        actions.notification_config,
        isQuietHours,
        classification.intent === 'emergency'
      );
    }
  } else {
    // No rule matched - check if we should use AI
    explanation = 'No rule matched';
  }

  // Step 8: AI fallback (if no response yet and AI is enabled)
  // Check if the matched rule explicitly disables responses
  const ruleBlocksResponse = ruleMatched?.actions?.do_not_respond === true;
  if (!responseContent && !ruleBlocksResponse && config.ai_enabled && config.global_mode !== 'templates_only') {
    // Check AI feature access
    const canUseAI = await canAccessFeature(options.business_id, 'ai_responses');

    // Check AI message limit for this conversation
    const aiLimit = await checkPlanLimit(
      options.business_id,
      'ai_messages_per_conversation',
      conversation.ai_message_count
    );

    if (canUseAI && aiLimit.allowed) {
      try {
        // Get conversation history for context
        const history = await loadConversationHistory(supabase, conversation.id, 10);

        const aiResult = await generateAIResponse(
          sanitizedMessage,
          classification,
          config,
          conversation,
          history,
          {
            creativity_level: config.ai_creativity_level,
            max_length: 320,
            tone: config.tone,
            use_emojis: config.use_emojis,
            pricing_mode: config.ai_pricing_mode,
            templates_for_reference: templates.filter(t => t.is_active),
            price_list: priceList,
          }
        );

        responseContent = aiResult.content;
        aiUsed = true;
        conversationUpdates.ai_message_count = conversation.ai_message_count + 1;

        decisionDetails.ai_response = {
          model: aiResult.model,
          confidence: aiResult.confidence,
          tokens_used: aiResult.tokens_used,
          guardrails_applied: aiResult.guardrails_applied,
        };

        explanation = `AI fallback used (confidence: ${aiResult.confidence}%)`;
      } catch (error) {
        jobLogger.error({
          msg: 'AI generation failed',
          error: error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error),
        });
        explanation = 'AI generation failed - no response sent';
        decisionDetails.ai_error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else if (!canUseAI) {
      explanation = 'AI not available on current plan';
      decisionDetails.ai_blocked_reason = 'plan_limit';
    } else {
      explanation = 'AI message limit reached for this conversation';
      decisionDetails.ai_blocked_reason = 'conversation_limit';
      conversationUpdates.requires_human = true;
    }
  }

  // Step 9: Determine if approval is required
  let requiresApprovalFlag = false;
  if (responseContent && aiUsed) {
    const aiConfidence = (decisionDetails.ai_response as { confidence: number } | undefined)?.confidence || 50;
    requiresApprovalFlag = requiresApproval(config, aiConfidence, isFirstMessage, classification);

    if (requiresApprovalFlag) {
      decisionDetails.approval_required_reason = config.require_approval;
    }
  }

  // Add default notifications for new conversations or hot leads
  if (isFirstMessage) {
    notifications.push(...buildNotifications(notificationRecipients, 'new_conversation', isQuietHours));
  }
  if (conversationUpdates.is_hot_lead) {
    notifications.push(...buildNotifications(notificationRecipients, 'hot_lead', isQuietHours));
  }
  if (conversationUpdates.is_emergency) {
    notifications.push(...buildNotifications(notificationRecipients, 'emergency', isQuietHours));
  }
  if (shouldEscalate) {
    notifications.push(...buildNotifications(notificationRecipients, 'escalation', isQuietHours));
  }
  if (classification.sentiment === 'angry') {
    notifications.push(...buildNotifications(notificationRecipients, 'angry_customer', isQuietHours));
  }

  // Record processing time
  decisionDetails.processing_time_ms = Date.now() - startTime;

  // Update conversation
  await supabase
    .from('leads_captain_conversations_v2')
    .update({
      ...conversationUpdates,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversation.id);

  // Log audit
  await logAudit(supabase, options.config_id, conversation.id, inboundMessageId, 'message_received', 'system', {
    intent: classification.intent,
    sentiment: classification.sentiment,
    confidence: classification.confidence,
  });

  if (ruleMatched) {
    await logAudit(supabase, options.config_id, conversation.id, null, 'rule_matched', 'system', {
      rule_id: ruleMatched.id,
      rule_name: ruleMatched.name,
    });
  }

  if (aiUsed) {
    await logAudit(supabase, options.config_id, conversation.id, null, 'ai_invoked', 'ai', (decisionDetails.ai_response as Record<string, unknown>) || { ai_used: true });
  }

  return {
    response_content: responseContent,
    should_send: !!responseContent && !requiresApprovalFlag,
    requires_approval: requiresApprovalFlag,
    classification,
    rule_matched: ruleMatched,
    template_used: templateUsed,
    ai_used: aiUsed,
    explanation,
    decision_details: decisionDetails,
    notifications,
    conversation_updates: conversationUpdates,
    should_escalate: shouldEscalate,
  };
}

// =====================================================
// Helper Functions
// =====================================================

async function loadConfig(configId: string, supabase: ReturnType<typeof createAdminClient>): Promise<LeadsCaptainConfig | null> {
  const { data } = await supabase
    .from('leads_captain_config')
    .select('*')
    .eq('id', configId)
    .single();
  return data;
}

async function loadIntents(configId: string, supabase: ReturnType<typeof createAdminClient>): Promise<LeadsCaptainIntent[]> {
  const { data } = await supabase
    .from('leads_captain_intents')
    .select('*')
    .eq('config_id', configId);
  return data || [];
}

async function loadRules(configId: string, supabase: ReturnType<typeof createAdminClient>): Promise<LeadsCaptainRule[]> {
  const { data } = await supabase
    .from('leads_captain_rules')
    .select('*')
    .eq('config_id', configId)
    .eq('is_active', true)
    .order('priority', { ascending: true });
  return data || [];
}

async function loadTemplates(configId: string, supabase: ReturnType<typeof createAdminClient>): Promise<LeadsCaptainTemplate[]> {
  const { data } = await supabase
    .from('leads_captain_templates')
    .select('*')
    .eq('config_id', configId)
    .eq('is_active', true);
  return data || [];
}

async function loadPriceList(configId: string, supabase: ReturnType<typeof createAdminClient>): Promise<LeadsCaptainPriceItem[]> {
  const { data } = await supabase
    .from('leads_captain_price_list')
    .select('*')
    .eq('config_id', configId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  return data || [];
}

async function loadNotificationRecipients(configId: string, supabase: ReturnType<typeof createAdminClient>): Promise<LeadsCaptainNotificationRecipient[]> {
  const { data } = await supabase
    .from('leads_captain_notifications')
    .select('*')
    .eq('config_id', configId)
    .eq('is_active', true);
  return data || [];
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

async function getOrCreateConversation(
  supabase: ReturnType<typeof createAdminClient>,
  configId: string,
  customerPhone: string,
  _isMissedCall?: boolean
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

async function logAudit(
  supabase: ReturnType<typeof createAdminClient>,
  configId: string,
  conversationId: string | null,
  messageId: string | null,
  action: string,
  actor: string,
  details: Record<string, unknown>
): Promise<void> {
  await supabase.from('leads_captain_audit_log').insert({
    config_id: configId,
    conversation_id: conversationId,
    message_id: messageId,
    action,
    actor,
    details,
  });
}

function buildNotifications(
  recipients: LeadsCaptainNotificationRecipient[],
  trigger: keyof LeadsCaptainNotificationRecipient['triggers'],
  isQuietHours: boolean
): MessageProcessingResult['notifications'] {
  return recipients
    .filter(r => {
      // Check if trigger is enabled
      if (!r.triggers[trigger]) return false;

      // Check quiet hours
      if (isQuietHours && r.quiet_hours_enabled) {
        // Allow emergency notifications through quiet hours if configured
        if (trigger === 'emergency' && r.quiet_hours_except_emergency) {
          return true;
        }
        return false;
      }

      return true;
    })
    .map(r => ({
      recipient_id: r.id,
      methods: [
        r.notify_sms ? 'sms' : null,
        r.notify_push ? 'push' : null,
        r.notify_email ? 'email' : null,
      ].filter(Boolean) as ('sms' | 'push' | 'email')[],
      urgency: trigger === 'emergency' ? 'immediate' : 'normal',
    }));
}

function buildRuleNotifications(
  recipients: LeadsCaptainNotificationRecipient[],
  config: { recipients: string[]; methods: ('sms' | 'push' | 'email')[]; urgency?: string },
  isQuietHours: boolean,
  isEmergency: boolean
): MessageProcessingResult['notifications'] {
  const matchingRecipients = recipients.filter(r => {
    // Match by role
    if (!config.recipients.includes(r.recipient_role)) return false;

    // Check quiet hours
    if (isQuietHours && r.quiet_hours_enabled) {
      if (isEmergency && r.quiet_hours_except_emergency) {
        return true;
      }
      return false;
    }

    return true;
  });

  return matchingRecipients.map(r => ({
    recipient_id: r.id,
    methods: config.methods.filter(m => {
      if (m === 'sms') return r.notify_sms;
      if (m === 'push') return r.notify_push;
      if (m === 'email') return r.notify_email;
      return false;
    }),
    urgency: (config.urgency as 'immediate' | 'normal' | 'low') || 'normal',
  }));
}
