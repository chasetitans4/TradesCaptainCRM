// =====================================================
// TWILIO VOICE FALLBACK (When forward fails)
// POST /api/webhooks/twilio/voice/fallback
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dialCallStatus = formData.get('DialCallStatus')?.toString();

    const twiml = new twilio.twiml.VoiceResponse();

    // If the call wasn't answered, go to voicemail
    if (dialCallStatus !== 'completed') {
      twiml.say({ voice: 'alice' }, "We're sorry, no one is available to take your call. Please leave a message after the beep.");
      twiml.record({
        maxLength: 120,
        transcribe: true,
        playBeep: true,
      });
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in voice fallback:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'alice' }, 'An error occurred. Please try again later.');

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
