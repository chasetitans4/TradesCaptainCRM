/**
 * SYNTHFLOW WEBHOOK HANDLER
 * POST /api/webhooks/synthflow
 *
 * Receives call events from Synthflow AI voice platform:
 * - call_started: AI answered the call
 * - transcript_ready: Call transcript available
 * - call_ended: Call completed with summary and extracted data
 * - error: Call encountered an error
 *
 * Delta 4: Processes confidence scores for silence-over-guessing
 * Delta 5: Updates call events with AI handling results
 * Delta 6: Verifies no training data is collected
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSynthflowClient } from '@/lib/synthflow';
import { updateCallEvent, endCall, handleEmergencyDetection, triggerEmergencyEscalation } from '@/lib/voice';
import { evaluateConfidence } from '@/lib/voice/confidence';
import { apiLogger } from '@/lib/logger';
import type { SynthflowWebhookPayload } from '@/types/voice-receptionist';

const synthflowLogger = apiLogger.child({ context: 'api.webhooks.synthflow' });

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headersList = await headers();

    // Validate webhook signature
    const signature = headersList.get('x-synthflow-signature') || '';
    const client = getSynthflowClient();

    if (!client.validateWebhookSignature(rawBody, signature)) {
      synthflowLogger.warn('Invalid Synthflow webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const payload = client.parseWebhookPayload(rawBody) as SynthflowWebhookPayload;

    synthflowLogger.info({
      msg: 'Synthflow webhook received',
      eventType: payload.event_type,
      callId: payload.call_id,
    });

    // Get call event by Synthflow call ID
    const callEventId = await findCallEventId(payload.call_id);

    if (!callEventId) {
      synthflowLogger.warn({
        msg: 'Call event not found for Synthflow call',
        synthflowCallId: payload.call_id,
      });
      return NextResponse.json({ received: true });
    }

    switch (payload.event_type) {
      case 'call_started':
        await handleCallStarted(callEventId, payload);
        break;

      case 'transcript_ready':
        await handleTranscriptReady(callEventId, payload);
        break;

      case 'call_ended':
        await handleCallEnded(callEventId, payload);
        break;

      case 'error':
        await handleCallError(callEventId, payload);
        break;

      default:
        synthflowLogger.warn({
          msg: 'Unknown Synthflow event type',
          eventType: (payload as any).event_type,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    synthflowLogger.error({
      msg: 'Error processing Synthflow webhook',
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: 'Unknown error' },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Find call event ID from Synthflow call ID
 * This mapping is stored when we initiate the call
 */
async function findCallEventId(synthflowCallId: string): Promise<string | null> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  // Check synthflow_call_mapping table
  const { data } = await supabase
    .from('synthflow_call_mapping')
    .select('call_event_id')
    .eq('synthflow_call_id', synthflowCallId)
    .single();

  return data?.call_event_id || null;
}

/**
 * Handle call_started event
 * AI has answered and is now handling the call
 */
async function handleCallStarted(
  callEventId: string,
  payload: SynthflowWebhookPayload
): Promise<void> {
  await updateCallEvent(callEventId, {
    was_ai_answered: true,
    was_missed: false,
  });

  synthflowLogger.info({ msg: 'AI call started', callEventId });
}

/**
 * Handle transcript_ready event
 * Analyze transcript for emergency phrases and intent
 *
 * Delta 4: Apply silence-over-guessing with confidence thresholds
 */
async function handleTranscriptReady(
  callEventId: string,
  payload: SynthflowWebhookPayload
): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  // Get call event with business config
  const { data: callEvent } = await supabase
    .from('voice_call_events')
    .select('id, business_id, location_id, is_emergency')
    .eq('id', callEventId)
    .single();

  if (!callEvent) return;

  // Check for emergency phrases in transcript
  if (payload.transcript) {
    const emergencyResult = await checkEmergencyPhrases(
      callEvent.business_id,
      callEvent.location_id,
      payload.transcript
    );

    if (emergencyResult.matched && !callEvent.is_emergency) {
      // Potential emergency detected - evaluate confidence
      const result = await handleEmergencyDetection(
        callEventId,
        emergencyResult,
        null // Caller hasn't confirmed yet
      );

      if (result.isEmergency) {
        // High confidence emergency - trigger escalation
        await triggerEmergencyEscalation(
          callEventId,
          callEvent.business_id,
          callEvent.location_id
        );
      }
      // If action is 'ask_confirmation', Synthflow will handle asking the caller
    }
  }

  // Update with AI confidence
  if (payload.confidence !== undefined) {
    const confidenceResult = evaluateConfidence(
      payload.confidence,
      'call_handling'
    );

    await updateCallEvent(callEventId, {
      ai_confidence: payload.confidence,
      ai_deferred_reason: confidenceResult.action === 'defer'
        ? confidenceResult.reason
        : undefined,
    });
  }

  synthflowLogger.info({
    msg: 'Transcript processed',
    callEventId,
    confidence: payload.confidence,
  });
}

/**
 * Handle call_ended event
 * Record final call data and trigger any follow-up actions
 */
async function handleCallEnded(
  callEventId: string,
  payload: SynthflowWebhookPayload
): Promise<void> {
  // End call and record usage
  await endCall(
    callEventId,
    payload.duration_seconds || 0,
    extractSummary(payload.extracted_data),
    payload.extracted_data
  );

  // Trigger any pending escalations for non-emergency calls
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  const { data: callEvent } = await supabase
    .from('voice_call_events')
    .select('business_id, is_emergency, ai_extracted_data')
    .eq('id', callEventId)
    .single();

  if (callEvent && !callEvent.is_emergency) {
    // Process lead from call data
    await processCallLead(callEvent.business_id, callEventId, payload.extracted_data);
  }

  synthflowLogger.info({
    msg: 'Call ended',
    callEventId,
    durationSeconds: payload.duration_seconds,
  });
}

/**
 * Handle error event
 * Log error and ensure proper fallback handling
 */
async function handleCallError(
  callEventId: string,
  payload: SynthflowWebhookPayload
): Promise<void> {
  await updateCallEvent(callEventId, {
    ai_deferred_reason: `Synthflow error: ${payload.error}`,
  });

  synthflowLogger.error({
    msg: 'Synthflow call error',
    callEventId,
    error: payload.error,
  });
}

/**
 * Check for emergency phrases in transcript
 */
async function checkEmergencyPhrases(
  businessId: string,
  locationId: string | undefined,
  transcript: string
): Promise<{ matched: boolean; confidence: number; phrase?: string }> {
  const { resolveVoiceConfig } = await import('@/lib/voice/config-resolver');
  const config = await resolveVoiceConfig(businessId, locationId);

  if (!config || config.emergencyPhrases.length === 0) {
    return { matched: false, confidence: 0 };
  }

  const lowerTranscript = transcript.toLowerCase();

  // Check each phrase
  for (const phraseConfig of config.emergencyPhrases) {
    const phrase = phraseConfig.phrase.toLowerCase();

    if (lowerTranscript.includes(phrase)) {
      // Calculate confidence based on phrase type and match quality
      const confidence = phraseConfig.phrase_type === 'required' ? 0.95 : 0.75;

      return {
        matched: true,
        confidence,
        phrase: phraseConfig.phrase,
      };
    }
  }

  return { matched: false, confidence: 0 };
}

/**
 * Extract summary from AI extracted data
 */
function extractSummary(data?: Record<string, unknown>): string | undefined {
  if (!data) return undefined;

  // Look for common summary fields
  const summaryFields = ['summary', 'call_summary', 'ai_summary', 'description'];
  for (const field of summaryFields) {
    if (typeof data[field] === 'string') {
      return data[field] as string;
    }
  }

  // Generate basic summary from extracted fields
  const parts: string[] = [];
  if (data.caller_name) parts.push(`Caller: ${data.caller_name}`);
  if (data.service_needed) parts.push(`Service: ${data.service_needed}`);
  if (data.urgency) parts.push(`Urgency: ${data.urgency}`);

  return parts.length > 0 ? parts.join('. ') : undefined;
}

/**
 * Process lead from call data
 * Creates or updates customer/lead from extracted data
 */
async function processCallLead(
  businessId: string,
  callEventId: string,
  extractedData?: Record<string, unknown>
): Promise<void> {
  if (!extractedData) return;

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  // Get call event for phone number
  const { data: callEvent } = await supabase
    .from('voice_call_events')
    .select('phone_from, customer_id')
    .eq('id', callEventId)
    .single();

  if (!callEvent) return;

  // If customer already linked, update with new info
  if (callEvent.customer_id) {
    if (extractedData.caller_name) {
      await supabase
        .from('customers')
        .update({
          first_name: extractedData.caller_name as string,
          updated_at: new Date().toISOString(),
        })
        .eq('id', callEvent.customer_id);
    }
    return;
  }

  // Create new customer if we have identifying info
  if (extractedData.caller_name || extractedData.caller_email) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        phone: callEvent.phone_from,
        first_name: extractedData.caller_name as string || 'Unknown',
        email: extractedData.caller_email as string,
        source: 'voice_call',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (newCustomer) {
      // Link customer to call event
      await supabase
        .from('voice_call_events')
        .update({ customer_id: newCustomer.id })
        .eq('id', callEventId);
    }
  }
}
