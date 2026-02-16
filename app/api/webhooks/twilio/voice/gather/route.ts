/**
 * TWILIO VOICE GATHER WEBHOOK
 * POST /api/webhooks/twilio/voice/gather
 *
 * Handles DTMF input during AI voice calls:
 * - Press 9: Voicemail escape (skip to voicemail)
 * - Other digits: Reserved for future use (emergency confirmation, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature } from '@/lib/twilio';
import { handleVoicemailEscape } from '@/lib/voice';
import { apiLogger } from '@/lib/logger';
import twilio from 'twilio';

const gatherLogger = apiLogger.child({ context: 'api.twilio.voice.gather' });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate Twilio signature (all environments)
    if (process.env.TWILIO_AUTH_TOKEN) {
      const headersList = await headers();
      const signature = headersList.get('x-twilio-signature') || '';
      const url = request.url;

      if (!validateTwilioSignature(signature, url, params)) {
        gatherLogger.warn({ msg: 'Invalid Twilio gather signature', url });
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      gatherLogger.error({ msg: 'TWILIO_AUTH_TOKEN not set - rejecting webhook' });
      return new NextResponse('Forbidden', { status: 403 });
    }

    const digits = params.Digits;
    const callSid = params.CallSid;

    gatherLogger.info({
      msg: 'Gather input received',
      callSid,
      digits,
    });

    // Handle voicemail escape (press 9)
    if (digits === '9') {
      // Find call event by call_sid
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();

      const { data: callEvent } = await supabase
        .from('voice_call_events')
        .select('id')
        .eq('call_sid', callSid)
        .single();

      if (callEvent) {
        const twiml = await handleVoicemailEscape(callEvent.id);
        return new NextResponse(twiml, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      // Fallback voicemail if no call event found
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'Polly.Joanna' }, 'Please leave your message after the beep.');
      twiml.record({
        maxLength: 120,
        transcribe: true,
        playBeep: true,
      });

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Handle emergency confirmation (press 1 for yes, 2 for no)
    if (digits === '1') {
      // Emergency confirmed
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();

      const { data: callEvent } = await supabase
        .from('voice_call_events')
        .select('id, business_id, location_id')
        .eq('call_sid', callSid)
        .single();

      if (callEvent) {
        const { handleEmergencyDetection, triggerEmergencyEscalation } = await import('@/lib/voice');

        await handleEmergencyDetection(
          callEvent.id,
          { matched: false, confidence: 0 },
          true // Caller confirmed emergency
        );

        // Trigger escalation
        await triggerEmergencyEscalation(
          callEvent.id,
          callEvent.business_id,
          callEvent.location_id
        );

        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say(
          { voice: 'Polly.Joanna' },
          'I understand this is an emergency. I am contacting staff immediately. Please stay on the line or a team member will call you right back.'
        );
        twiml.pause({ length: 2 });
        twiml.say(
          { voice: 'Polly.Joanna' },
          'If you need to leave additional details, please do so after the beep.'
        );
        twiml.record({
          maxLength: 120,
          transcribe: true,
          playBeep: true,
        });

        return new NextResponse(twiml.toString(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        });
      }
    }

    if (digits === '2') {
      // Emergency denied - continue normal flow
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say(
        { voice: 'Polly.Joanna' },
        'Thank you for confirming. How can I help you today?'
      );
      // Continue with AI conversation
      twiml.redirect('/api/webhooks/twilio/voice/continue');

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Unrecognized input - repeat options
    const twiml = new twilio.twiml.VoiceResponse();
    const gather = twiml.gather({
      numDigits: 1,
      action: '/api/webhooks/twilio/voice/gather',
      method: 'POST',
      timeout: 5,
    });
    gather.say(
      { voice: 'Polly.Joanna' },
      'I didn\'t catch that. Press 9 at any time to leave a voicemail.'
    );

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    gatherLogger.error({
      msg: 'Error processing voice gather',
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: 'Unknown error' },
    });

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, 'An error occurred. Please leave a message after the beep.');
    twiml.record({
      maxLength: 120,
      transcribe: true,
      playBeep: true,
    });

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
