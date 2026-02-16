/**
 * Voice Call Handler - AI Voice Receptionist v2.0
 *
 * Orchestrates the AI voice flow with all Delta adjustments:
 * - Delta 1: Emergency-only voice escalation
 * - Delta 2: Multi-location config hierarchy
 * - Delta 3: Hard minute caps
 * - Delta 4: Silence-over-guessing
 * - Delta 5: Initiation evidence logging
 * - Delta 6: No training / no cross-tenant
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { resolveVoiceConfig } from './config-resolver';
import { checkVoiceUsageAvailable, recordVoiceMinutes } from '@/lib/billing/voice-usage';
import { buildEscalationPlan, executeEscalationStep } from './escalation';
import { evaluateEmergencyConfidence } from './confidence';
import { isSynthflowAvailable } from '@/lib/synthflow';
import type {
  AvailabilityState,
  AnswerCertaintySignal,
  VoiceCallEvent,
  CreateCallEventInput,
  InitiationSource,
} from '@/types/voice-receptionist';

const voiceLogger = logger.child({ module: 'voice-handler' });

// =====================================================
// TYPES
// =====================================================

export interface IncomingCallParams {
  callSid: string;
  from: string;
  to: string;
  businessId: string;
  locationId?: string;
  customerId?: string;
  callerName?: string;
}

export interface CallHandlerResult {
  twiml: string;
  callEventId?: string;
  availabilityState: AvailabilityState;
  useAIVoice: boolean;
  synthflowSessionId?: string;
}

export interface AvailabilityCheck {
  state: AvailabilityState;
  signal?: AnswerCertaintySignal;
  isBusinessHours: boolean;
  forwardNumbers: string[];
}

// =====================================================
// MAIN HANDLER
// =====================================================

/**
 * Handle incoming voice call
 * Returns TwiML response based on configuration and availability
 */
export async function handleIncomingCall(
  params: IncomingCallParams
): Promise<CallHandlerResult> {
  const { callSid, from, to, businessId, locationId, customerId } = params;

  voiceLogger.info({
    msg: 'Handling incoming call',
    callSid,
    from: from.slice(-4),
    businessId,
  });

  // Get resolved configuration (Delta 2: location hierarchy)
  const config = await resolveVoiceConfig(businessId, locationId);

  if (!config) {
    voiceLogger.warn({ msg: 'No voice config found for business', businessId });
    return {
      twiml: buildVoicemailTwiML('Thank you for calling. Please leave a message.'),
      availabilityState: 'MESSAGE_ONLY',
      useAIVoice: false,
    };
  }

  // Delta 3: Check voice usage before proceeding with AI
  const usageAvailable = await checkVoiceUsageAvailable(businessId);
  if (!usageAvailable.available) {
    voiceLogger.warn({ msg: 'Voice usage cap reached', businessId, reason: usageAvailable.reason });
    return {
      twiml: buildVoicemailTwiML(
        config.settings.after_hours_greeting ||
        'Thank you for calling. Please leave a message after the beep.'
      ),
      availabilityState: 'MESSAGE_ONLY',
      useAIVoice: false,
    };
  }

  // Determine availability state
  const availability = await determineAvailability(
    businessId,
    config.businessHours,
    config.settings
  );

  // Delta 5: Create call event with initiation evidence
  const callEventId = await createCallEvent({
    business_id: businessId,
    location_id: locationId,
    customer_id: customerId,
    initiation_source: 'CALL' as InitiationSource,
    initiation_evidence_id: callSid,
    call_sid: callSid,
    phone_from: from,
    phone_to: to,
    call_start_time: new Date().toISOString(),
    availability_state: availability.state,
    answer_certainty_signal: availability.signal,
  });

  // Determine if we should use AI voice
  const shouldUseAI = shouldUseAIVoice(config.settings, availability);

  if (shouldUseAI) {
    return await handleAIVoiceFlow(params, config, availability, callEventId);
  }

  // Non-AI path: Forward or voicemail
  return await handleTraditionalFlow(params, config, availability, callEventId);
}

// =====================================================
// AVAILABILITY LOGIC
// =====================================================

/**
 * Determine availability state based on business hours and settings
 */
async function determineAvailability(
  businessId: string,
  businessHours: Record<string, { start: string; end: string }>,
  settings: { ring_timeout_seconds: number }
): Promise<AvailabilityCheck> {
  const supabase = createAdminClient();

  // Get business timezone
  const { data: business } = await supabase
    .from('businesses')
    .select('timezone, call_forward_numbers')
    .eq('id', businessId)
    .single();

  const timezone = business?.timezone || 'America/Chicago';
  const forwardNumbers = business?.call_forward_numbers || [];
  const isBusinessHours = checkBusinessHours(businessHours, timezone);

  // Determine availability state
  let state: AvailabilityState;
  let signal: AnswerCertaintySignal | undefined;

  if (isBusinessHours && forwardNumbers.length > 0) {
    state = 'LIVE_ANSWER';
    signal = 'TIMEOUT'; // Will wait for ring timeout
  } else if (!isBusinessHours && forwardNumbers.length > 0) {
    state = 'ON_CALL';
    signal = 'FORWARD'; // May forward to on-call
  } else {
    state = 'MESSAGE_ONLY';
    signal = 'IMMEDIATE'; // Go straight to AI/voicemail
  }

  return {
    state,
    signal,
    isBusinessHours,
    forwardNumbers,
  };
}

/**
 * Check if current time is within business hours
 */
function checkBusinessHours(
  hours: Record<string, { start: string; end: string }>,
  timezone: string
): boolean {
  if (!hours || Object.keys(hours).length === 0) {
    return true; // If no hours set, assume always open
  }

  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayOfWeek = localTime.getDay();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[dayOfWeek];

  const todayHours = hours[dayName];
  if (!todayHours) return false;

  const currentHour = localTime.getHours();
  const currentMinute = localTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMin] = todayHours.start.split(':').map(Number);
  const [endHour, endMin] = todayHours.end.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
}

/**
 * Determine if AI voice should be used
 */
function shouldUseAIVoice(
  settings: { enable_daytime_ai_voice: boolean; daytime_ai_voice_consent_at?: string },
  availability: AvailabilityCheck
): boolean {
  // AI voice requires consent
  if (!settings.daytime_ai_voice_consent_at) {
    return false;
  }

  // During business hours, check daytime AI setting
  if (availability.isBusinessHours) {
    return settings.enable_daytime_ai_voice;
  }

  // After hours: always use AI if configured
  return true;
}

// =====================================================
// AI VOICE FLOW
// =====================================================

/**
 * Handle AI voice flow with Synthflow
 */
async function handleAIVoiceFlow(
  params: IncomingCallParams,
  config: Awaited<ReturnType<typeof resolveVoiceConfig>>,
  availability: AvailabilityCheck,
  callEventId: string
): Promise<CallHandlerResult> {
  if (!config) {
    return {
      twiml: buildVoicemailTwiML('Please leave a message.'),
      availabilityState: availability.state,
      useAIVoice: false,
    };
  }

  // Check if Synthflow is available
  const synthflowReady = await isSynthflowAvailable();
  if (!synthflowReady) {
    voiceLogger.warn('Synthflow not available, falling back to voicemail');
    return {
      twiml: buildVoicemailTwiML(
        config.settings.greeting_text || 'Please leave a message.'
      ),
      callEventId,
      availabilityState: availability.state,
      useAIVoice: false,
    };
  }

  // Build TwiML for AI voice interaction
  // This uses Twilio <Connect> to stream to Synthflow
  const greeting = availability.isBusinessHours
    ? config.settings.greeting_text
    : config.settings.after_hours_greeting;

  const twiml = buildAIVoiceTwiML({
    callEventId,
    businessId: params.businessId,
    greeting: greeting || 'Hello, thank you for calling.',
    greetingAudioUrl: availability.isBusinessHours
      ? config.settings.greeting_audio_url
      : config.settings.after_hours_audio_url,
    voicemailEscapeEnabled: config.settings.voicemail_escape_enabled,
    synthflowAssistantId: config.settings.synthflow_assistant_id,
    availabilityState: availability.state,
  });

  return {
    twiml,
    callEventId,
    availabilityState: availability.state,
    useAIVoice: true,
  };
}

/**
 * Handle traditional (non-AI) call flow
 */
async function handleTraditionalFlow(
  params: IncomingCallParams,
  config: Awaited<ReturnType<typeof resolveVoiceConfig>>,
  availability: AvailabilityCheck,
  callEventId: string
): Promise<CallHandlerResult> {
  if (!config) {
    return {
      twiml: buildVoicemailTwiML('Please leave a message.'),
      availabilityState: availability.state,
      useAIVoice: false,
    };
  }

  // Forward to staff if available
  if (availability.forwardNumbers.length > 0) {
    const twiml = buildForwardTwiML({
      numbers: availability.forwardNumbers,
      timeout: config.settings.ring_timeout_seconds,
      greeting: config.settings.greeting_text || 'Please hold.',
      fallbackGreeting: config.settings.after_hours_greeting || 'Please leave a message.',
    });

    return {
      twiml,
      callEventId,
      availabilityState: availability.state,
      useAIVoice: false,
    };
  }

  // No forward numbers, go to voicemail
  const greeting = availability.isBusinessHours
    ? config.settings.greeting_text
    : config.settings.after_hours_greeting;

  return {
    twiml: buildVoicemailTwiML(greeting || 'Please leave a message.'),
    callEventId,
    availabilityState: availability.state,
    useAIVoice: false,
  };
}

// =====================================================
// TWIML BUILDERS
// =====================================================

/**
 * Build TwiML for AI voice interaction
 */
function buildAIVoiceTwiML(params: {
  callEventId: string;
  businessId: string;
  greeting: string;
  greetingAudioUrl?: string;
  voicemailEscapeEnabled: boolean;
  synthflowAssistantId?: string;
  availabilityState: AvailabilityState;
}): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];

  // AI Disclosure (required for compliance)
  lines.push('  <Say voice="Polly.Joanna">');
  lines.push('    This call may be answered by an AI assistant.');
  lines.push('  </Say>');

  // Voicemail escape option
  if (params.voicemailEscapeEnabled) {
    lines.push('  <Gather numDigits="1" action="/api/webhooks/twilio/voice/gather" method="POST" timeout="2">');
    lines.push('    <Say voice="Polly.Joanna">Press 9 at any time to leave a voicemail.</Say>');
    lines.push('  </Gather>');
  }

  // Custom greeting (audio or TTS)
  if (params.greetingAudioUrl) {
    lines.push(`  <Play>${params.greetingAudioUrl}</Play>`);
  } else {
    lines.push(`  <Say voice="Polly.Joanna">${escapeXml(params.greeting)}</Say>`);
  }

  // Connect to Synthflow via Stream (WebSocket)
  if (params.synthflowAssistantId) {
    const streamUrl = `wss://${process.env.SYNTHFLOW_STREAM_HOST || 'stream.synthflow.ai'}/v1/stream`;
    lines.push(`  <Connect>`);
    lines.push(`    <Stream url="${streamUrl}">`);
    lines.push(`      <Parameter name="assistant_id" value="${params.synthflowAssistantId}"/>`);
    lines.push(`      <Parameter name="call_event_id" value="${params.callEventId}"/>`);
    lines.push(`      <Parameter name="business_id" value="${params.businessId}"/>`);
    lines.push(`      <Parameter name="training_opt_out" value="true"/>`);
    lines.push(`    </Stream>`);
    lines.push(`  </Connect>`);
  }

  // Fallback to voicemail if stream ends
  lines.push('  <Say voice="Polly.Joanna">The assistant is no longer available. Please leave a message after the beep.</Say>');
  lines.push('  <Record maxLength="120" transcribe="true" playBeep="true"/>');

  lines.push('</Response>');

  return lines.join('\n');
}

/**
 * Build TwiML for call forwarding
 */
function buildForwardTwiML(params: {
  numbers: string[];
  timeout: number;
  greeting: string;
  fallbackGreeting: string;
}): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];

  lines.push(`  <Say voice="Polly.Joanna">${escapeXml(params.greeting)}</Say>`);

  lines.push(`  <Dial timeout="${params.timeout}" action="/api/webhooks/twilio/voice/fallback" method="POST">`);
  params.numbers.forEach((number) => {
    lines.push(`    <Number>${number}</Number>`);
  });
  lines.push('  </Dial>');

  lines.push('</Response>');

  return lines.join('\n');
}

/**
 * Build TwiML for voicemail
 */
function buildVoicemailTwiML(greeting: string, greetingUrl?: string): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];

  if (greetingUrl) {
    lines.push(`  <Play>${greetingUrl}</Play>`);
  } else {
    lines.push(`  <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>`);
  }

  lines.push('  <Record maxLength="120" transcribe="true" playBeep="true"/>');
  lines.push('</Response>');

  return lines.join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// =====================================================
// CALL EVENT MANAGEMENT
// =====================================================

/**
 * Create call event record (Delta 5: initiation evidence)
 */
async function createCallEvent(input: CreateCallEventInput): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('voice_call_events')
    .insert({
      ...input,
      was_ai_answered: false,
      was_missed: false,
      voicemail_requested: false,
      is_emergency: false,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    voiceLogger.error({ msg: 'Failed to create call event', error });
    throw new Error('Failed to log call event');
  }

  voiceLogger.info({ msg: 'Call event created', callEventId: data.id });
  return data.id;
}

/**
 * Update call event with AI handling results
 */
export async function updateCallEvent(
  callEventId: string,
  updates: Partial<VoiceCallEvent>
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('voice_call_events')
    .update(updates)
    .eq('id', callEventId);

  if (error) {
    voiceLogger.error({ msg: 'Failed to update call event', callEventId, error });
  }
}

/**
 * Mark call as ended and record duration
 */
export async function endCall(
  callEventId: string,
  durationSeconds: number,
  aiSummary?: string,
  extractedData?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();

  // Get call event to find business
  const { data: callEvent } = await supabase
    .from('voice_call_events')
    .select('business_id')
    .eq('id', callEventId)
    .single();

  if (!callEvent) {
    voiceLogger.error({ msg: 'Call event not found for end', callEventId });
    return;
  }

  // Update call event
  await supabase
    .from('voice_call_events')
    .update({
      call_end_time: new Date().toISOString(),
      call_duration_seconds: durationSeconds,
      ai_summary: aiSummary,
      ai_extracted_data: extractedData,
    })
    .eq('id', callEventId);

  // Record voice usage (Delta 3: respects hard caps)
  const minutes = Math.ceil(durationSeconds / 60);
  await recordVoiceMinutes(callEvent.business_id, minutes);

  voiceLogger.info({ msg: 'Call ended', callEventId, durationSeconds, minutes });
}

// =====================================================
// EMERGENCY HANDLING
// =====================================================

/**
 * Handle emergency detection during call
 * Delta 4: Silence-over-guessing - only mark as emergency with high confidence
 */
export async function handleEmergencyDetection(
  callEventId: string,
  phraseMatch: { matched: boolean; confidence: number; phrase?: string },
  callerConfirmation: boolean | null
): Promise<{ isEmergency: boolean; action: string }> {
  const result = evaluateEmergencyConfidence(phraseMatch, callerConfirmation);

  if (result.action === 'proceed' && phraseMatch.matched) {
    // High confidence emergency
    await updateCallEvent(callEventId, {
      is_emergency: true,
      emergency_source: callerConfirmation
        ? 'CALLER_CONFIRMATION'
        : phraseMatch.confidence >= 0.9
          ? 'PHRASE_REQUIRED'
          : 'PHRASE_OPTIONAL_CONFIRMED',
      ai_confidence: result.confidence,
    });

    voiceLogger.warn({
      msg: 'Emergency detected',
      callEventId,
      confidence: result.confidence,
      phrase: phraseMatch.phrase,
    });

    return { isEmergency: true, action: 'escalate' };
  }

  if (result.action === 'clarify') {
    // Need to ask caller for confirmation
    await updateCallEvent(callEventId, {
      ai_confidence: result.confidence,
      ai_deferred_reason: result.reason,
    });

    return { isEmergency: false, action: 'ask_confirmation' };
  }

  // Not an emergency
  return { isEmergency: false, action: 'continue' };
}

/**
 * Trigger emergency escalation
 * Delta 1: Only voice escalation for confirmed emergencies
 */
export async function triggerEmergencyEscalation(
  callEventId: string,
  businessId: string,
  locationId?: string
): Promise<void> {
  const config = await resolveVoiceConfig(businessId, locationId);
  if (!config) return;

  const { data: callEvent } = await createAdminClient()
    .from('voice_call_events')
    .select('is_emergency')
    .eq('id', callEventId)
    .single();

  if (!callEvent?.is_emergency) {
    voiceLogger.error({ msg: 'STOP: Attempted emergency escalation for non-emergency', callEventId });
    return;
  }

  const plan = buildEscalationPlan(
    { is_emergency: true },
    {
      primaryContactId: config.primaryContactId,
      backupContactId: config.backupContactId,
      escalationWaitMinutes: config.settings.default_escalation_wait_minutes,
      voiceEscalationEnabled: config.settings.emergency_voice_escalation_enabled,
      maxVoiceAttempts: config.settings.max_voice_escalation_attempts,
    }
  );

  // Execute first escalation step immediately
  if (plan.steps.length > 0) {
    const firstStep = plan.steps[0];
    await executeEscalationStep(
      callEventId,
      firstStep.step,
      firstStep.actionType,
      firstStep.targetContactId
    );
  }

  voiceLogger.info({
    msg: 'Emergency escalation triggered',
    callEventId,
    steps: plan.steps.length,
  });
}

// =====================================================
// VOICEMAIL ESCAPE HANDLER
// =====================================================

/**
 * Handle voicemail escape (press 9)
 */
export async function handleVoicemailEscape(callEventId: string): Promise<string> {
  await updateCallEvent(callEventId, {
    voicemail_requested: true,
  });

  voiceLogger.info({ msg: 'Voicemail escape requested', callEventId });

  return buildVoicemailTwiML(
    'You have chosen to leave a voicemail. Please leave your message after the beep.'
  );
}
