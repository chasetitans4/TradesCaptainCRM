// =====================================================
// SPOKE VOICE WEBHOOK
// POST /api/spoke/webhook
//
// Per Spoke Spec v1.0:
// Entry point for voice updates from crew.
// Flow: Answer → Identify caller → Record → Hang up
//
// No prompts, no menus, no back-and-forth.
// Just a beep and record.
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature, formatPhoneE164 } from '@/lib/twilio';
import { createAdminClient } from '@/lib/supabase/server';
import twilio from 'twilio';
import { smsLogger } from '@/lib/logger';
import {
  TWILIO_VOICE_CONFIG,
  AUDIO_QUALITY_CONFIG,
  getSpokeWebhookUrl,
} from '@/lib/spoke/config';
import type { ContractorPhone } from '@/lib/spoke/types';

const spokeLogger = smsLogger.child({ context: 'api.spoke.webhook' });

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate Twilio signature in all environments
    const headersList = await headers();
    const signature = headersList.get('x-twilio-signature') || '';

    if (!validateTwilioSignature(signature, request.url, params)) {
      spokeLogger.warn({ msg: 'Invalid Twilio signature for Spoke webhook', url: request.url });
      return new NextResponse('Forbidden', { status: 403 });
    }

    const {
      From: from,
      To: to,
      CallSid: callSid,
      CallStatus: callStatus,
    } = params;

    const formattedFrom = formatPhoneE164(from);
    const formattedTo = formatPhoneE164(to);

    spokeLogger.info({
      msg: 'Spoke voice webhook received',
      callSid,
      from: formattedFrom,
      to: formattedTo,
      callStatus,
    });

    const supabase = createAdminClient();

    // Idempotency check - prevent double-processing
    if (callSid) {
      try {
        const idempotencyKey = `spoke_call:${callSid}`;
        const { data: existing } = await supabase
          .from('processed_webhook_events')
          .select('id')
          .eq('event_id', idempotencyKey)
          .single();

        if (existing) {
          spokeLogger.info({ msg: 'Duplicate Spoke call webhook ignored', callSid });
          return twimlHangup();
        }

        // Mark as processed early
        await supabase.from('processed_webhook_events').upsert({
          event_id: idempotencyKey,
          event_type: 'spoke.voice.incoming',
          processed_at: new Date().toISOString(),
        }, { onConflict: 'event_id' });
      } catch {
        spokeLogger.warn({ msg: 'Spoke idempotency check failed', callSid });
      }
    }

    // Find business by Spoke phone number
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, spoke_enabled, spoke_unknown_caller_policy, spoke_settings')
      .eq('spoke_phone_number', formattedTo)
      .single();

    if (businessError || !business) {
      spokeLogger.warn({
        msg: 'No business found for Spoke number',
        to: formattedTo,
        error: businessError,
      });
      return twimlReject('This number is not configured.');
    }

    if (!business.spoke_enabled) {
      spokeLogger.warn({
        msg: 'Spoke not enabled for business',
        businessId: business.id,
      });
      return twimlReject('Spoke is not enabled for this business.');
    }

    // Look up contractor by phone number
    const { data: contractors } = await supabase
      .from('contractor_phones')
      .select('*')
      .eq('phone_number', formattedFrom)
      .eq('business_id', business.id)
      .eq('is_active', true);

    let contractor: ContractorPhone | null = (contractors && contractors[0]) || null;
    let isNewContractor = false;

    // Handle unknown caller
    if (!contractor) {
      const policy = business.spoke_unknown_caller_policy || 'reject';

      if (policy === 'reject') {
        spokeLogger.warn({
          msg: 'Unknown caller rejected by policy',
          from: formattedFrom,
          businessId: business.id,
        });

        // Create spoke_update record for rejected call
        await supabase.from('spoke_updates').insert({
          business_id: business.id,
          contractor_phone_id: null,
          source: 'CALL',
          status: 'REJECTED',
          error_code: 'UNKNOWN_CALLER',
          error_message: 'Caller not in contractor registry',
          parsed_data: {},
        });

        return twimlReject('Your phone number is not registered. Please contact your office.');
      }

      // Policy is 'provisional' - auto-create contractor record
      spokeLogger.info({
        msg: 'Creating provisional contractor record',
        from: formattedFrom,
        businessId: business.id,
      });

      const { data: newContractor, error: createError } = await supabase
        .from('contractor_phones')
        .insert({
          business_id: business.id,
          phone_number: formattedFrom,
          display_name: 'New Crew Member', // Will be updated on first-time flow
          role: 'TECH',
          is_verified: false,
          is_active: true,
        })
        .select()
        .single();

      if (createError || !newContractor) {
        spokeLogger.error({
          msg: 'Failed to create provisional contractor',
          error: createError,
        });
        return twimlReject('Unable to register. Please try again.');
      }

      contractor = newContractor as unknown as ContractorPhone;
      isNewContractor = true;
    }

    // Check if contractor is flagged for review
    if (contractor.flagged_for_review) {
      spokeLogger.warn({
        msg: 'Flagged contractor attempted call',
        contractorId: contractor.id,
        from: formattedFrom,
      });
      return twimlReject('Your account is under review. Please contact your office.');
    }

    // Create initial spoke_update record
    const { data: spokeUpdate, error: updateError } = await supabase
      .from('spoke_updates')
      .insert({
        business_id: business.id,
        contractor_phone_id: contractor.id,
        source: 'CALL',
        status: 'PROCESSING',
        parsed_data: {},
        confidence_scores: {},
      })
      .select('id')
      .single();

    if (updateError || !spokeUpdate) {
      spokeLogger.error({
        msg: 'Failed to create spoke_update record',
        error: updateError,
      });
      return twimlReject('Unable to process. Please try again.');
    }

    spokeLogger.info({
      msg: 'Spoke update created, starting recording',
      spokeUpdateId: spokeUpdate.id,
      contractorId: contractor.id,
      contractorName: contractor.display_name,
      isNewContractor,
      latencyMs: Date.now() - startTime,
    });

    // Return TwiML to record the message
    return twimlRecord(spokeUpdate.id, contractor.display_name, isNewContractor);

  } catch (error) {
    spokeLogger.error({
      msg: 'Error processing Spoke voice webhook',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: 'Unknown error' },
      latencyMs: Date.now() - startTime,
    });
    return twimlReject('An error occurred. Please try again.');
  }
}

/**
 * TwiML to record the voice update
 * Per spec: Just a beep and record. No prompts.
 */
function twimlRecord(spokeUpdateId: string, contractorName: string, isNewContractor: boolean): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();

  // If new contractor, play a brief welcome message
  if (isNewContractor) {
    twiml.say(
      { voice: TWILIO_VOICE_CONFIG.VOICE, language: TWILIO_VOICE_CONFIG.LANGUAGE },
      'Welcome to Spoke. Your number has been registered. Please record your update after the beep.'
    );
  }

  // Record the message
  // Recording callback will trigger transcription
  twiml.record({
    maxLength: AUDIO_QUALITY_CONFIG.MAX_RECORDING_DURATION_SECONDS,
    timeout: TWILIO_VOICE_CONFIG.TIMEOUT,
    playBeep: TWILIO_VOICE_CONFIG.PLAY_BEEP,
    // Callback when recording is complete
    action: getSpokeWebhookUrl(`/api/spoke/recording?updateId=${spokeUpdateId}`),
    method: 'POST',
    // Recording status callback for the actual audio URL
    recordingStatusCallback: getSpokeWebhookUrl(`/api/spoke/recording-status?updateId=${spokeUpdateId}`),
    recordingStatusCallbackMethod: 'POST',
    recordingStatusCallbackEvent: ['completed'],
  });

  // Fallback if no recording (caller hung up without speaking)
  twiml.say(
    { voice: TWILIO_VOICE_CONFIG.VOICE },
    'No recording received. Goodbye.'
  );
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

/**
 * TwiML to reject a call with a message
 */
function twimlReject(message: string): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ voice: TWILIO_VOICE_CONFIG.VOICE, language: TWILIO_VOICE_CONFIG.LANGUAGE }, message);
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

/**
 * TwiML to simply hang up (for duplicates)
 */
function twimlHangup(): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
