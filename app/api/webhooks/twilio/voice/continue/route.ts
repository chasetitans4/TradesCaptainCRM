/**
 * TWILIO VOICE CONTINUE WEBHOOK
 * POST /api/webhooks/twilio/voice/continue
 *
 * Resumes AI voice conversation after DTMF input or interruption.
 * Used when caller confirms non-emergency or returns from a prompt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature } from '@/lib/twilio';
import { resolveVoiceConfig } from '@/lib/voice/config-resolver';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiLogger } from '@/lib/logger';
import twilio from 'twilio';

const continueLogger = apiLogger.child({ context: 'api.twilio.voice.continue' });

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
        continueLogger.warn({ msg: 'Invalid Twilio continue signature', url });
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      continueLogger.error({ msg: 'TWILIO_AUTH_TOKEN not set - rejecting webhook' });
      return new NextResponse('Forbidden', { status: 403 });
    }

    const callSid = params.CallSid;

    // Find call event by call_sid
    const supabase = createAdminClient();
    const { data: callEvent } = await supabase
      .from('voice_call_events')
      .select('id, business_id, location_id')
      .eq('call_sid', callSid)
      .single();

    if (!callEvent) {
      continueLogger.warn({ msg: 'Call event not found for continue', callSid });
      // Fall back to basic voicemail
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

    // Get voice config
    const config = await resolveVoiceConfig(callEvent.business_id, callEvent.location_id);

    if (!config?.settings.synthflow_assistant_id) {
      // No Synthflow configured - fall back to basic conversation flow
      const twiml = new twilio.twiml.VoiceResponse();

      // Ask what they need help with
      const gather = twiml.gather({
        input: ['speech', 'dtmf'],
        action: '/api/webhooks/twilio/voice/gather',
        method: 'POST',
        timeout: 5,
        speechTimeout: 'auto',
      });
      gather.say(
        { voice: 'Polly.Joanna' },
        'How can I help you today? You can describe your needs or press 9 to leave a voicemail.'
      );

      // Fallback if no input
      twiml.say(
        { voice: 'Polly.Joanna' },
        'I didn\'t catch that. Please leave a message after the beep.'
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

    // Resume Synthflow AI conversation
    const twiml = new twilio.twiml.VoiceResponse();

    // Reconnect to Synthflow stream
    const streamUrl = `wss://${process.env.SYNTHFLOW_STREAM_HOST || 'stream.synthflow.ai'}/v1/stream`;
    const connect = twiml.connect();
    const stream = connect.stream({ url: streamUrl });
    stream.parameter({ name: 'assistant_id', value: config.settings.synthflow_assistant_id });
    stream.parameter({ name: 'call_event_id', value: callEvent.id });
    stream.parameter({ name: 'business_id', value: callEvent.business_id });
    stream.parameter({ name: 'training_opt_out', value: 'true' });
    stream.parameter({ name: 'resume', value: 'true' });

    // Fallback after stream ends
    twiml.say(
      { voice: 'Polly.Joanna' },
      'The assistant is no longer available. Please leave a message after the beep.'
    );
    twiml.record({
      maxLength: 120,
      transcribe: true,
      playBeep: true,
    });

    continueLogger.info({ msg: 'Resuming AI conversation', callEventId: callEvent.id });

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    continueLogger.error({
      msg: 'Error processing voice continue',
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
