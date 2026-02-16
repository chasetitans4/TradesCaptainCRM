/**
 * Escalation Executor Service
 *
 * Handles the actual execution of escalation steps:
 * - SMS notifications
 * - Push notifications
 * - Email notifications
 * - Slack notifications
 * - Outbound voice calls (Delta 1: emergencies ONLY)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio/sms';
import { logger } from '@/lib/logger';
import type { EscalationActionType, VoiceCallEvent } from '@/types/voice-receptionist';

const executorLogger = logger.child({ module: 'escalation-executor' });

interface EscalationTarget {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface EscalationContext {
  callEvent: VoiceCallEvent;
  callerPhone: string;
  callerName?: string;
  businessName: string;
  emergencyCategory?: string;
}

/**
 * Execute an escalation action
 * Delta 1: Voice escalation ONLY for emergencies
 */
export async function executeEscalation(
  actionType: EscalationActionType,
  target: EscalationTarget,
  context: EscalationContext
): Promise<{ success: boolean; error?: string }> {
  // Delta 1: ABSOLUTE CHECK - Voice only for emergencies
  if (actionType === 'outbound_voice') {
    if (!context.callEvent.is_emergency) {
      executorLogger.error({
        msg: 'STOP: Attempted voice escalation for non-emergency',
        callEventId: context.callEvent.id,
        targetId: target.id,
      });
      return {
        success: false,
        error: 'Voice escalation is only permitted for confirmed emergencies (Delta 1)',
      };
    }
  }

  try {
    switch (actionType) {
      case 'sms':
        return await sendSmsEscalation(target, context);
      case 'push':
        return await sendPushEscalation(target, context);
      case 'email':
        return await sendEmailEscalation(target, context);
      case 'slack':
        return await sendSlackEscalation(target, context);
      case 'outbound_voice':
        return await sendVoiceEscalation(target, context);
      default:
        return { success: false, error: `Unknown escalation type: ${actionType}` };
    }
  } catch (error) {
    executorLogger.error({
      msg: 'Escalation execution failed',
      actionType,
      targetId: target.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Escalation failed',
    };
  }
}

/**
 * Send SMS escalation notification
 */
async function sendSmsEscalation(
  target: EscalationTarget,
  context: EscalationContext
): Promise<{ success: boolean; error?: string }> {
  if (!target.phone) {
    return { success: false, error: 'Target has no phone number' };
  }

  const isEmergency = context.callEvent.is_emergency;
  const urgencyPrefix = isEmergency ? '🚨 EMERGENCY: ' : '📞 ';

  let message = `${urgencyPrefix}Incoming call from ${context.callerName || context.callerPhone}`;

  if (isEmergency && context.emergencyCategory) {
    message += ` - ${context.emergencyCategory.replace(/_/g, ' ').toUpperCase()}`;
  }

  message += `\n\nBusiness: ${context.businessName}`;
  message += `\nCallback: ${context.callerPhone}`;

  if (context.callEvent.ai_summary) {
    message += `\n\nSummary: ${context.callEvent.ai_summary}`;
  }

  message += '\n\nReply "ACK" to acknowledge.';

  try {
    // Get business phone number for sending
    const supabase = createAdminClient();
    const { data: business } = await supabase
      .from('businesses')
      .select('phone_number')
      .eq('id', context.callEvent.business_id)
      .single();

    if (!business?.phone_number) {
      return { success: false, error: 'Business phone number not configured' };
    }

    await sendSMS({
      to: target.phone,
      body: message,
      businessId: context.callEvent.business_id,
    });

    executorLogger.info({
      msg: 'SMS escalation sent',
      targetId: target.id,
      callEventId: context.callEvent.id,
      isEmergency,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS send failed',
    };
  }
}

/**
 * Send push notification escalation
 */
async function sendPushEscalation(
  target: EscalationTarget,
  context: EscalationContext
): Promise<{ success: boolean; error?: string }> {
  const isEmergency = context.callEvent.is_emergency;

  const title = isEmergency
    ? `🚨 Emergency Call - ${context.emergencyCategory?.replace(/_/g, ' ') || 'Urgent'}`
    : `📞 Incoming Call`;

  const body = `${context.callerName || context.callerPhone} is trying to reach ${context.businessName}`;

  try {
    // Insert notification into database (will be picked up by push service)
    const supabase = createAdminClient();
    await supabase.from('notifications').insert({
      user_id: target.id,
      type: isEmergency ? 'voice_emergency' : 'voice_call',
      title,
      body,
      data: {
        call_event_id: context.callEvent.id,
        caller_phone: context.callerPhone,
        is_emergency: isEmergency,
      },
      priority: isEmergency ? 'high' : 'normal',
      created_at: new Date().toISOString(),
    });

    executorLogger.info({
      msg: 'Push notification queued',
      targetId: target.id,
      callEventId: context.callEvent.id,
      isEmergency,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Push notification failed',
    };
  }
}

/**
 * Send email escalation notification
 */
async function sendEmailEscalation(
  target: EscalationTarget,
  context: EscalationContext
): Promise<{ success: boolean; error?: string }> {
  const isEmergency = context.callEvent.is_emergency;

  try {
    // Queue email via database (will be picked up by email service)
    const supabase = createAdminClient();
    await supabase.from('email_queue').insert({
      to_email: target.email,
      to_name: `${target.first_name} ${target.last_name}`,
      template: isEmergency ? 'voice_emergency_escalation' : 'voice_call_notification',
      template_data: {
        recipient_name: target.first_name,
        caller_name: context.callerName || 'Unknown',
        caller_phone: context.callerPhone,
        business_name: context.businessName,
        is_emergency: isEmergency,
        emergency_category: context.emergencyCategory,
        ai_summary: context.callEvent.ai_summary,
        call_event_id: context.callEvent.id,
      },
      priority: isEmergency ? 'high' : 'normal',
      created_at: new Date().toISOString(),
    });

    executorLogger.info({
      msg: 'Email escalation queued',
      targetId: target.id,
      callEventId: context.callEvent.id,
      isEmergency,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email queue failed',
    };
  }
}

/**
 * Send Slack escalation notification
 */
async function sendSlackEscalation(
  target: EscalationTarget,
  context: EscalationContext
): Promise<{ success: boolean; error?: string }> {
  const isEmergency = context.callEvent.is_emergency;

  try {
    // Get Slack webhook URL from business settings
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from('business_integrations')
      .select('slack_webhook_url')
      .eq('business_id', context.callEvent.business_id)
      .single();

    if (!settings?.slack_webhook_url) {
      return { success: false, error: 'Slack not configured' };
    }

    const emoji = isEmergency ? ':rotating_light:' : ':telephone_receiver:';
    const color = isEmergency ? 'danger' : 'warning';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${isEmergency ? 'EMERGENCY' : 'Incoming Call'}*\n*From:* ${context.callerName || context.callerPhone}\n*Business:* ${context.businessName}`,
        },
      },
    ];

    if (context.callEvent.ai_summary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:* ${context.callEvent.ai_summary}`,
        },
      });
    }

    await fetch(settings.slack_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${isEmergency ? 'Emergency' : 'Incoming'} call from ${context.callerPhone}`,
        attachments: [{ color, blocks }],
      }),
    });

    executorLogger.info({
      msg: 'Slack notification sent',
      callEventId: context.callEvent.id,
      isEmergency,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Slack notification failed',
    };
  }
}

/**
 * Send outbound voice call escalation
 * Delta 1: ONLY for confirmed emergencies
 */
async function sendVoiceEscalation(
  target: EscalationTarget,
  context: EscalationContext
): Promise<{ success: boolean; error?: string }> {
  // Double-check emergency status (defense in depth)
  if (!context.callEvent.is_emergency) {
    return {
      success: false,
      error: 'Voice escalation blocked: not an emergency (Delta 1)',
    };
  }

  if (!target.phone) {
    return { success: false, error: 'Target has no phone number' };
  }

  try {
    const supabase = createAdminClient();

    // Get business phone number
    const { data: business } = await supabase
      .from('businesses')
      .select('phone_number')
      .eq('id', context.callEvent.business_id)
      .single();

    if (!business?.phone_number) {
      return { success: false, error: 'Business phone number not configured' };
    }

    // Use Twilio to make outbound call
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

    // Create outbound call with TwiML
    const call = await client.calls.create({
      to: target.phone,
      from: business.phone_number,
      url: `${baseUrl}/api/webhooks/twilio/voice/outbound-escalation?call_event_id=${context.callEvent.id}&target_id=${target.id}`,
      statusCallback: `${baseUrl}/api/webhooks/twilio/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      machineDetection: 'Enable',
      machineDetectionTimeout: 5000,
    });

    executorLogger.info({
      msg: 'Outbound voice escalation initiated',
      targetId: target.id,
      callEventId: context.callEvent.id,
      outboundCallSid: call.sid,
    });

    return { success: true };
  } catch (error) {
    executorLogger.error({
      msg: 'Failed to initiate outbound voice call',
      targetId: target.id,
      callEventId: context.callEvent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Voice call failed',
    };
  }
}

/**
 * Get escalation target details
 */
export async function getEscalationTarget(contactId: string): Promise<EscalationTarget | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, first_name, last_name, email, phone')
    .eq('id', contactId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as EscalationTarget;
}

/**
 * Get escalation context from call event
 */
export async function getEscalationContext(callEventId: string): Promise<EscalationContext | null> {
  const supabase = createAdminClient();

  const { data: callEvent, error } = await supabase
    .from('voice_call_events')
    .select(`
      *,
      customers (first_name, last_name),
      businesses (name)
    `)
    .eq('id', callEventId)
    .single();

  if (error || !callEvent) {
    return null;
  }

  // Get emergency category if applicable
  let emergencyCategory: string | undefined;
  if (callEvent.is_emergency) {
    const { data: rule } = await supabase
      .from('voice_emergency_rules')
      .select('category')
      .eq('business_id', callEvent.business_id)
      .eq('is_enabled', true)
      .limit(1)
      .single();
    emergencyCategory = rule?.category;
  }

  const customer = callEvent.customers as any;
  const business = callEvent.businesses as any;

  return {
    callEvent: callEvent as VoiceCallEvent,
    callerPhone: callEvent.phone_from,
    callerName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : undefined,
    businessName: business?.name || 'Unknown Business',
    emergencyCategory,
  };
}

/**
 * Run the full escalation ladder for a call event
 */
export async function runEscalationLadder(
  callEventId: string,
  steps: Array<{
    step: number;
    actionType: EscalationActionType;
    targetContactId: string;
    waitMinutes: number;
  }>
): Promise<void> {
  const context = await getEscalationContext(callEventId);
  if (!context) {
    executorLogger.error({ msg: 'Failed to get escalation context', callEventId });
    return;
  }

  const supabase = createAdminClient();

  // Group steps by wait time
  const stepGroups = new Map<number, typeof steps>();
  for (const step of steps) {
    const group = stepGroups.get(step.waitMinutes) || [];
    group.push(step);
    stepGroups.set(step.waitMinutes, group);
  }

  // Execute steps in order with waits
  const sortedWaitTimes = Array.from(stepGroups.keys()).sort((a, b) => a - b);

  for (const waitMinutes of sortedWaitTimes) {
    // Wait if needed (skip for immediate steps)
    if (waitMinutes > 0) {
      // Check if already acknowledged before waiting
      const { data: ack } = await supabase
        .from('voice_escalation_events')
        .select('acknowledged_at')
        .eq('call_event_id', callEventId)
        .not('acknowledged_at', 'is', null)
        .limit(1);

      if (ack && ack.length > 0) {
        executorLogger.info({
          msg: 'Escalation already acknowledged, stopping ladder',
          callEventId,
        });
        return;
      }

      // Wait for the specified time
      await new Promise((resolve) => setTimeout(resolve, waitMinutes * 60 * 1000));
    }

    // Execute all steps at this wait time
    const stepsToExecute = stepGroups.get(waitMinutes) || [];
    for (const step of stepsToExecute) {
      const target = await getEscalationTarget(step.targetContactId);
      if (!target) {
        executorLogger.warn({
          msg: 'Escalation target not found',
          targetId: step.targetContactId,
        });
        continue;
      }

      const result = await executeEscalation(step.actionType, target, context);

      // Record the escalation event
      await supabase.from('voice_escalation_events').insert({
        call_event_id: callEventId,
        step: step.step,
        action_type: step.actionType,
        target_contact_id: step.targetContactId,
        is_emergency_escalation: context.callEvent.is_emergency,
        sent_at: new Date().toISOString(),
        failed_at: result.success ? null : new Date().toISOString(),
        failure_reason: result.error,
      });
    }
  }

  executorLogger.info({
    msg: 'Escalation ladder completed',
    callEventId,
    totalSteps: steps.length,
  });
}
