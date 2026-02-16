/**
 * TWILIO OUTBOUND ESCALATION RESPONSE WEBHOOK
 * POST /api/webhooks/twilio/voice/outbound-escalation/response
 *
 * Handles staff response to emergency escalation call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature } from '@/lib/twilio';
import { createAdminClient } from '@/lib/supabase/admin';
import { acknowledgeEscalation } from '@/lib/voice/escalation';
import { apiLogger } from '@/lib/logger';
import twilio from 'twilio';

const responseLogger = apiLogger.child({ context: 'api.twilio.voice.outbound-escalation.response' });

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
        responseLogger.warn({ msg: 'Invalid Twilio signature', url });
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      responseLogger.error({ msg: 'TWILIO_AUTH_TOKEN not set - rejecting webhook' });
      return new NextResponse('Forbidden', { status: 403 });
    }

    const digits = params.Digits;
    const callEventId = request.nextUrl.searchParams.get('call_event_id');
    const targetId = request.nextUrl.searchParams.get('target_id');

    if (!callEventId || !targetId) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabase = createAdminClient();

    // Get call event
    const { data: callEvent } = await supabase
      .from('voice_call_events')
      .select('phone_from')
      .eq('id', callEventId)
      .single();

    if (!callEvent) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'Polly.Joanna' }, 'Unable to find call details. Please check your dashboard.');
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const twiml = new twilio.twiml.VoiceResponse();

    // Press 1: Acknowledge and connect
    if (digits === '1') {
      // Acknowledge the escalation
      await acknowledgeEscalationForTarget(callEventId, targetId, 'callback');

      twiml.say(
        { voice: 'Polly.Joanna' },
        'Thank you. Connecting you to the customer now.'
      );

      // Dial the customer
      const dial = twiml.dial({
        callerId: params.To, // Use business number as caller ID
        timeout: 30,
        action: `/api/webhooks/twilio/voice/outbound-escalation/dial-status?call_event_id=${callEventId}&target_id=${targetId}`,
        method: 'POST',
      });
      dial.number(callEvent.phone_from);

      responseLogger.info({
        msg: 'Staff connecting to customer',
        callEventId,
        targetId,
      });

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Press 2: Acknowledge only
    if (digits === '2') {
      await acknowledgeEscalationForTarget(callEventId, targetId, 'callback');

      twiml.say(
        { voice: 'Polly.Joanna' },
        'Acknowledged. The customer callback number is: ' +
        formatPhoneForSpeech(callEvent.phone_from) + '. ' +
        'Please contact them as soon as possible. Thank you.'
      );
      twiml.hangup();

      responseLogger.info({
        msg: 'Staff acknowledged emergency',
        callEventId,
        targetId,
      });

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Press 9: Repeat
    if (digits === '9') {
      twiml.redirect(
        `/api/webhooks/twilio/voice/outbound-escalation?call_event_id=${callEventId}&target_id=${targetId}`
      );
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Invalid input
    twiml.say({ voice: 'Polly.Joanna' }, "I didn't understand that.");
    twiml.redirect(
      `/api/webhooks/twilio/voice/outbound-escalation?call_event_id=${callEventId}&target_id=${targetId}`
    );

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    responseLogger.error({
      msg: 'Error processing escalation response',
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: 'Unknown error' },
    });

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, 'An error occurred. Please check your dashboard.');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

/**
 * Acknowledge escalation for a specific target
 */
async function acknowledgeEscalationForTarget(
  callEventId: string,
  targetId: string,
  method: 'callback' | 'sms_reply' | 'app_interaction' | 'portal_click'
): Promise<void> {
  const supabase = createAdminClient();

  // Find and acknowledge the escalation event
  const { data: escalations } = await supabase
    .from('voice_escalation_events')
    .select('id')
    .eq('call_event_id', callEventId)
    .eq('target_contact_id', targetId)
    .is('acknowledged_at', null);

  if (escalations && escalations.length > 0) {
    await supabase
      .from('voice_escalation_events')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledgment_method: method,
      })
      .in('id', escalations.map((e) => e.id));
  }
}

/**
 * Format phone number for text-to-speech
 */
function formatPhoneForSpeech(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}, ${digits.slice(3, 6)}, ${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(1, 4)}, ${digits.slice(4, 7)}, ${digits.slice(7)}`;
  }
  return digits.split('').join(', ');
}
