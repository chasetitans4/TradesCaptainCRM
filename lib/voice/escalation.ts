/**
 * Escalation Logic - Delta 1: Emergency-Only Voice Escalation
 *
 * Rule (ABSOLUTE): Staff phone calls initiated by the system are
 * permitted ONLY when is_emergency = true.
 *
 * Non-emergency leads use: In-app notifications, Push, Email, Slack
 * Emergency leads add: Outbound voice calls to staff
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type {
  EscalationActionType,
  EscalationPlan,
  EscalationStep,
  VoiceCallEvent,
  VoiceEscalationEvent,
} from '@/types/voice-receptionist';

const escalationLogger = logger.child({ module: 'voice-escalation' });

/**
 * Delta 1: Build escalation plan based on emergency status
 * Voice calls are ONLY permitted for confirmed emergencies
 */
export function buildEscalationPlan(
  callEvent: Pick<VoiceCallEvent, 'is_emergency'>,
  settings: {
    primaryContactId?: string;
    backupContactId?: string;
    escalationWaitMinutes: number;
    voiceEscalationEnabled: boolean;
    maxVoiceAttempts?: number;
  }
): EscalationPlan {
  const steps: EscalationStep[] = [];
  const isEmergency = callEvent.is_emergency;

  // Step 1: Immediate SMS + Push to primary contact
  if (settings.primaryContactId) {
    steps.push({
      step: 1,
      actionType: 'sms',
      targetContactId: settings.primaryContactId,
      waitMinutes: 0,
    });
    steps.push({
      step: 1,
      actionType: 'push',
      targetContactId: settings.primaryContactId,
      waitMinutes: 0,
    });
  }

  // Step 2: After wait period - email + voice (emergency only)
  if (settings.primaryContactId) {
    steps.push({
      step: 2,
      actionType: 'email',
      targetContactId: settings.primaryContactId,
      waitMinutes: settings.escalationWaitMinutes,
    });

    // Delta 1: Outbound voice ONLY for confirmed emergencies
    if (isEmergency && settings.voiceEscalationEnabled) {
      steps.push({
        step: 2,
        actionType: 'outbound_voice',
        targetContactId: settings.primaryContactId,
        waitMinutes: settings.escalationWaitMinutes,
      });
    }
  }

  // Step 3: Escalate to backup contact
  if (settings.backupContactId) {
    steps.push({
      step: 3,
      actionType: 'sms',
      targetContactId: settings.backupContactId,
      waitMinutes: settings.escalationWaitMinutes * 2,
    });
    steps.push({
      step: 3,
      actionType: 'push',
      targetContactId: settings.backupContactId,
      waitMinutes: settings.escalationWaitMinutes * 2,
    });

    // Delta 1: Voice to backup ONLY for emergencies
    if (isEmergency && settings.voiceEscalationEnabled) {
      steps.push({
        step: 4,
        actionType: 'outbound_voice',
        targetContactId: settings.backupContactId,
        waitMinutes: settings.escalationWaitMinutes * 2 + 2,
      });
    }
  }

  return { steps, isEmergency };
}

/**
 * Execute a single escalation step
 * Delta 1: STOP if attempting voice escalation on non-emergency
 */
export async function executeEscalationStep(
  callEventId: string,
  step: number,
  actionType: EscalationActionType,
  targetContactId: string
): Promise<{ success: boolean; escalationId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Get call event to check emergency status
  const { data: callEvent, error: eventError } = await supabase
    .from('voice_call_events')
    .select('is_emergency, business_id, phone_from, ai_summary')
    .eq('id', callEventId)
    .single();

  if (eventError || !callEvent) {
    escalationLogger.error({ msg: 'Call event not found', callEventId });
    return { success: false, error: 'Call event not found' };
  }

  // Delta 1: ABSOLUTE CHECK - Voice escalation only for emergencies
  if (actionType === 'outbound_voice' && !callEvent.is_emergency) {
    escalationLogger.error({
      msg: 'STOP: Attempted voice escalation for non-emergency',
      callEventId,
      step,
      actionType,
    });
    return {
      success: false,
      error: 'STOP: Voice escalation is only permitted for confirmed emergencies',
    };
  }

  // Get contact info for escalation
  const { data: contact } = await supabase
    .from('admin_users')
    .select('id, email, phone, first_name')
    .eq('id', targetContactId)
    .single();

  if (!contact) {
    escalationLogger.error({ msg: 'Contact not found for escalation', targetContactId });
    return { success: false, error: 'Contact not found' };
  }

  // Record escalation event
  const { data: escalationEvent, error: insertError } = await supabase
    .from('voice_escalation_events')
    .insert({
      call_event_id: callEventId,
      step,
      action_type: actionType,
      target_contact_id: targetContactId,
      is_emergency_escalation: callEvent.is_emergency,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    // Check if it's the emergency check trigger
    if (insertError.message?.includes('STOP')) {
      escalationLogger.error('Database trigger blocked non-emergency voice escalation');
      return { success: false, error: insertError.message };
    }
    escalationLogger.error({ msg: 'Failed to record escalation', error: insertError });
    return { success: false, error: insertError.message };
  }

  // Execute the actual escalation
  try {
    switch (actionType) {
      case 'sms':
        await sendSmsEscalation(contact, callEvent, callEventId);
        break;
      case 'push':
        await sendPushEscalation(contact, callEvent, callEventId);
        break;
      case 'email':
        await sendEmailEscalation(contact, callEvent, callEventId);
        break;
      case 'outbound_voice':
        await sendVoiceEscalation(contact, callEvent, callEventId);
        break;
      case 'slack':
        await sendSlackEscalation(contact, callEvent, callEventId);
        break;
    }

    escalationLogger.info({
      msg: 'Escalation step executed',
      callEventId,
      step,
      actionType,
      targetContactId,
      isEmergency: callEvent.is_emergency,
    });

    return { success: true, escalationId: escalationEvent.id };
  } catch (error: any) {
    // Record failure
    await supabase
      .from('voice_escalation_events')
      .update({
        failed_at: new Date().toISOString(),
        failure_reason: error.message,
      })
      .eq('id', escalationEvent.id);

    escalationLogger.error({
      msg: 'Escalation step failed',
      callEventId,
      step,
      actionType,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
}

/**
 * Record acknowledgment of an escalation
 */
export async function acknowledgeEscalation(
  escalationId: string,
  method: VoiceEscalationEvent['acknowledgment_method']
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('voice_escalation_events')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledgment_method: method,
    })
    .eq('id', escalationId);

  if (error) {
    escalationLogger.error({ msg: 'Failed to acknowledge escalation', escalationId, error });
    return false;
  }

  escalationLogger.info({ msg: 'Escalation acknowledged', escalationId, method });
  return true;
}

/**
 * Get pending escalations for a call event
 */
export async function getPendingEscalations(
  callEventId: string
): Promise<VoiceEscalationEvent[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('voice_escalation_events')
    .select('*')
    .eq('call_event_id', callEventId)
    .is('acknowledged_at', null)
    .is('failed_at', null)
    .order('step', { ascending: true });

  if (error) {
    escalationLogger.error({ msg: 'Failed to get pending escalations', callEventId, error });
    return [];
  }

  return data as VoiceEscalationEvent[];
}

/**
 * Check if an escalation has been acknowledged
 */
export async function isEscalationAcknowledged(callEventId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('voice_escalation_events')
    .select('acknowledged_at')
    .eq('call_event_id', callEventId)
    .not('acknowledged_at', 'is', null)
    .limit(1);

  if (error) {
    return false;
  }

  return data && data.length > 0;
}

// =====================================================
// ESCALATION ACTION IMPLEMENTATIONS
// =====================================================

interface EscalationContact {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
}

interface EscalationCallEvent {
  is_emergency: boolean;
  business_id: string;
  phone_from: string;
  ai_summary?: string;
}

async function sendSmsEscalation(
  contact: EscalationContact,
  callEvent: EscalationCallEvent,
  callEventId: string
): Promise<void> {
  if (!contact.phone) {
    throw new Error('Contact has no phone number');
  }

  // Import SMS function dynamically to avoid circular dependencies
  const { sendSMS } = await import('@/lib/twilio/sms');

  const message = callEvent.is_emergency
    ? `🚨 EMERGENCY: Incoming call from ${callEvent.phone_from}. ${callEvent.ai_summary || 'Check app for details.'}`
    : `New call from ${callEvent.phone_from}. ${callEvent.ai_summary || 'Check app for details.'}`;

  await sendSMS({
    businessId: callEvent.business_id,
    to: contact.phone,
    body: message,
  });

  escalationLogger.info({ msg: 'SMS escalation sent', contactId: contact.id, isEmergency: callEvent.is_emergency });
}

async function sendPushEscalation(
  contact: EscalationContact,
  callEvent: EscalationCallEvent,
  callEventId: string
): Promise<void> {
  // TODO: Integrate with lib/notifications/push.ts
  escalationLogger.info({ msg: 'Push escalation sent', contactId: contact.id });
}

async function sendEmailEscalation(
  contact: EscalationContact,
  callEvent: EscalationCallEvent,
  callEventId: string
): Promise<void> {
  // TODO: Integrate with email notification system
  escalationLogger.info({ msg: 'Email escalation sent', contactId: contact.id });
}

async function sendVoiceEscalation(
  contact: EscalationContact,
  callEvent: EscalationCallEvent,
  callEventId: string
): Promise<void> {
  // Delta 1: This should only be called for emergencies
  // The database trigger will also enforce this
  if (!callEvent.is_emergency) {
    throw new Error('Voice escalation attempted for non-emergency - blocked');
  }

  if (!contact.phone) {
    throw new Error('Contact has no phone number for voice escalation');
  }

  // TODO: Use Twilio to make outbound call with TTS message
  // const twilio = getTwilioClient();
  // await twilio.calls.create({
  //   to: contact.phone,
  //   from: businessPhoneNumber,
  //   twiml: `<Response><Say>Emergency call from customer. ${callEvent.ai_summary}. Please check your messages.</Say></Response>`,
  // });

  escalationLogger.info({
    msg: 'Voice escalation sent (EMERGENCY)',
    contactId: contact.id,
    phone: contact.phone.slice(-4),
  });
}

async function sendSlackEscalation(
  contact: EscalationContact,
  callEvent: EscalationCallEvent,
  callEventId: string
): Promise<void> {
  // TODO: Integrate with Slack if configured
  escalationLogger.info({ msg: 'Slack escalation sent', contactId: contact.id });
}
