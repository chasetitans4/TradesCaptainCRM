// =====================================================
// SPOKE RECORDING ACTION WEBHOOK
// POST /api/spoke/recording
//
// Per Spoke Spec v1.0:
// Called by Twilio when recording completes (action callback).
// This is called immediately when the caller hangs up.
// Returns TwiML to end the call gracefully.
//
// Note: The actual recording URL comes via recording-status webhook.
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature } from '@/lib/twilio';
import { createAdminClient } from '@/lib/supabase/server';
import twilio from 'twilio';
import { smsLogger } from '@/lib/logger';

const spokeLogger = smsLogger.child({ context: 'api.spoke.recording' });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Get the updateId from query params
    const { searchParams } = new URL(request.url);
    const spokeUpdateId = searchParams.get('updateId');

    // Validate Twilio signature in all environments
    const headersList = await headers();
    const signature = headersList.get('x-twilio-signature') || '';
    const url = request.url;

    if (!validateTwilioSignature(signature, url, params)) {
      spokeLogger.warn({ msg: 'Invalid Twilio signature for recording action' });
      return new NextResponse('Forbidden', { status: 403 });
    }

    const {
      RecordingUrl: recordingUrl,
      RecordingDuration: recordingDuration,
      RecordingSid: recordingSid,
    } = params;

    spokeLogger.info({
      msg: 'Recording action callback received',
      spokeUpdateId,
      recordingSid,
      recordingDuration,
      hasUrl: !!recordingUrl,
    });

    // If we got recording info, update the spoke_update
    // (recording-status webhook will also fire, this is a backup)
    if (spokeUpdateId && recordingUrl) {
      const supabase = createAdminClient();

      await supabase
        .from('spoke_updates')
        .update({
          audio_url: recordingUrl,
          audio_duration_seconds: parseFloat(recordingDuration) || null,
        })
        .eq('id', spokeUpdateId);
    }

    // Return TwiML to hang up
    const twiml = new twilio.twiml.VoiceResponse();

    // Brief thank you message
    twiml.say(
      { voice: 'alice', language: 'en-US' },
      'Got it. Processing your update now.'
    );
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    spokeLogger.error({
      msg: 'Error in recording action webhook',
      error: error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error' },
    });

    // Return TwiML to hang up even on error
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
