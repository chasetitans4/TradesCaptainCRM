/**
 * TWILIO OUTBOUND ESCALATION WEBHOOK
 * POST /api/webhooks/twilio/voice/outbound-escalation
 *
 * Handles outbound calls to staff for emergency escalations.
 * Delta 1: This endpoint is ONLY reached for confirmed emergencies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature } from '@/lib/twilio';
import { createAdminClient } from '@/lib/supabase/admin';
import { acknowledgeEscalation } from '@/lib/voice/escalation';
import { apiLogger } from '@/lib/logger';
import twilio from 'twilio';

const outboundLogger = apiLogger.child({ context: 'api.twilio.voice.outbound-escalation' });

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
        outboundLogger.warn({ msg: 'Invalid Twilio signature', url });
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      outboundLogger.error({ msg: 'TWILIO_AUTH_TOKEN not set - rejecting webhook' });
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Get query parameters
    const callEventId = request.nextUrl.searchParams.get('call_event_id');
    const targetId = request.nextUrl.searchParams.get('target_id');
    const answeredBy = params.AnsweredBy; // human, machine, or fax

    if (!callEventId || !targetId) {
      outboundLogger.error({ msg: 'Missing required parameters' });
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabase = createAdminClient();

    // Get call event details
    const { data: callEvent } = await supabase
      .from('voice_call_events')
      .select(`
        *,
        businesses (name)
      `)
      .eq('id', callEventId)
      .single();

    if (!callEvent) {
      outboundLogger.error({ msg: 'Call event not found', callEventId });
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Delta 1: Verify this is actually an emergency (defense in depth)
    if (!callEvent.is_emergency) {
      outboundLogger.error({
        msg: 'STOP: Outbound escalation attempted for non-emergency',
        callEventId,
      });
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Get target contact details
    const { data: contact } = await supabase
      .from('admin_users')
      .select('first_name')
      .eq('id', targetId)
      .single();

    const businessName = (callEvent.businesses as any)?.name || 'your business';
    const contactName = contact?.first_name || 'team member';

    // Handle machine detection
    if (answeredBy === 'machine_start' || answeredBy === 'machine_end_beep') {
      // Leave voicemail message
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.pause({ length: 1 });
      twiml.say(
        { voice: 'Polly.Joanna' },
        `Urgent message for ${contactName}. ` +
        `This is an emergency escalation from ${businessName}. ` +
        `A customer has reported an emergency and needs immediate assistance. ` +
        `Please call back the customer at ${formatPhoneForSpeech(callEvent.phone_from)} as soon as possible. ` +
        `Repeating: ${formatPhoneForSpeech(callEvent.phone_from)}. ` +
        `This is an emergency. Thank you.`
      );
      twiml.hangup();

      outboundLogger.info({
        msg: 'Left emergency voicemail',
        callEventId,
        targetId,
      });

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Human answered - play emergency message with options
    const twiml = new twilio.twiml.VoiceResponse();

    twiml.say(
      { voice: 'Polly.Joanna' },
      `Hello ${contactName}. This is an urgent emergency escalation from ${businessName}.`
    );

    twiml.pause({ length: 1 });

    twiml.say(
      { voice: 'Polly.Joanna' },
      `A customer at ${formatPhoneForSpeech(callEvent.phone_from)} has reported an emergency.`
    );

    if (callEvent.ai_summary) {
      twiml.say(
        { voice: 'Polly.Joanna' },
        `The situation is: ${callEvent.ai_summary}`
      );
    }

    twiml.pause({ length: 1 });

    // Give options
    const gather = twiml.gather({
      numDigits: 1,
      action: `/api/webhooks/twilio/voice/outbound-escalation/response?call_event_id=${callEventId}&target_id=${targetId}`,
      method: 'POST',
      timeout: 10,
    });

    gather.say(
      { voice: 'Polly.Joanna' },
      'Press 1 to acknowledge and be connected to the customer. ' +
      'Press 2 to acknowledge only. ' +
      'Press 9 to repeat this message.'
    );

    // Repeat if no input
    twiml.redirect(`/api/webhooks/twilio/voice/outbound-escalation?call_event_id=${callEventId}&target_id=${targetId}`);

    outboundLogger.info({
      msg: 'Emergency escalation call answered',
      callEventId,
      targetId,
    });

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    outboundLogger.error({
      msg: 'Error processing outbound escalation',
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: 'Unknown error' },
    });

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, 'An error occurred. Please check your dashboard for emergency details.');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

/**
 * Format phone number for text-to-speech
 */
function formatPhoneForSpeech(phone: string): string {
  // Remove non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Format for US numbers
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}, ${digits.slice(3, 6)}, ${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(1, 4)}, ${digits.slice(4, 7)}, ${digits.slice(7)}`;
  }

  // Just read digits with pauses
  return digits.split('').join(', ');
}
