// =====================================================
// TWILIO INCOMING VOICE CALL WEBHOOK
// POST /api/webhooks/twilio/voice
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature, formatPhoneE164 } from '@/lib/twilio';
import { createAdminClient } from '@/lib/supabase/server';
import twilio from 'twilio';
import { smsLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const headersList = await headers();
      const signature = headersList.get('x-twilio-signature') || '';
      const url = request.url;

      if (!validateTwilioSignature(signature, url, params)) {
        smsLogger.warn({ msg: 'Invalid Twilio voice signature', url });
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const {
      From: from,
      To: to,
      CallSid: callSid,
    } = params;

    const supabase = createAdminClient();

    // Deduplicate by CallSid to prevent double-processing
    // Twilio may retry webhooks if they timeout or fail
    if (callSid) {
      try {
        const idempotencyKey = `twilio_call:${callSid}`;
        const qb: any = supabase.from('processed_webhook_events');
        if (qb && typeof qb.select === 'function') {
          const { data: existing } = await qb
            .select('id')
            .eq('event_id', idempotencyKey)
            .single();

          if (existing) {
            smsLogger.info({ msg: 'Duplicate call webhook ignored', callSid });
            return twimlVoicemail('Thank you for calling.');
          }
        }

        // Mark as processed early to prevent race conditions (best-effort)
        if (qb && typeof qb.upsert === 'function') {
          await qb.upsert({
            event_id: idempotencyKey,
            event_type: 'twilio.voice.incoming',
            processed_at: new Date().toISOString(),
          }, { onConflict: 'event_id' });
        }
      } catch {
        smsLogger.warn({ msg: 'Voice idempotency check failed', callSid });
      }
    }

    // Find business by phone number
    const { data: business } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        call_forwarding_mode,
        call_forward_numbers,
        call_ring_timeout,
        call_business_hours_only,
        call_after_hours_mode,
        voicemail_greeting_url,
        business_hours,
        timezone
      `)
      .eq('twilio_phone_number', formatPhoneE164(to))
      .single();

    if (!business) {
      smsLogger.warn({ msg: 'No business found for voice number', to });
      return twimlVoicemail('Sorry, this number is not configured properly.');
    }

    // Log the incoming call
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', business.id)
      .eq('phone', formatPhoneE164(from))
      .single();

    await supabase.from('call_logs').insert({
      business_id: business.id,
      customer_id: customer?.id || null,
      phone: formatPhoneE164(from),
      direction: 'inbound',
    });

    // Determine call handling mode
    let mode = business.call_forwarding_mode || 'voicemail';

    // Check if we should use after-hours mode
    if (business.call_business_hours_only) {
      const isBusinessHours = checkBusinessHours(business.business_hours, business.timezone);
      if (!isBusinessHours) {
        mode = business.call_after_hours_mode || 'voicemail';
      }
    }

    // Handle based on mode
    const forwardNumbers = business.call_forward_numbers || [];
    const ringTimeout = business.call_ring_timeout || 20;
    const greetingUrl = business.voicemail_greeting_url;

    switch (mode) {
      case 'forward_owner':
      case 'forward_custom':
        if (forwardNumbers.length > 0) {
          return twimlForward(forwardNumbers[0], ringTimeout, business.name, greetingUrl);
        }
        return twimlVoicemail(`Thank you for calling ${business.name}. Please leave a message.`, greetingUrl);

      case 'forward_sequential':
        if (forwardNumbers.length > 0) {
          return twimlSequentialForward(forwardNumbers, ringTimeout, business.name, greetingUrl);
        }
        return twimlVoicemail(`Thank you for calling ${business.name}. Please leave a message.`, greetingUrl);

      case 'forward_simultaneous':
        if (forwardNumbers.length > 0) {
          return twimlSimultaneousForward(forwardNumbers, ringTimeout, business.name, greetingUrl);
        }
        return twimlVoicemail(`Thank you for calling ${business.name}. Please leave a message.`, greetingUrl);

      case 'voicemail':
      default:
        return twimlVoicemail(`Thank you for calling ${business.name}. Please leave a message after the beep.`, greetingUrl);
    }
  } catch (error) {
    smsLogger.error({
      msg: 'Error processing voice webhook',
      error: error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error' },
    });
    return twimlVoicemail('Sorry, an error occurred. Please try again later.');
  }
}

function twimlVoicemail(message: string, greetingUrl?: string): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();

  if (greetingUrl) {
    twiml.play(greetingUrl);
  } else {
    twiml.say({ voice: 'alice' }, message);
  }

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

function twimlForward(number: string, timeout: number, businessName: string, _greetingUrl?: string): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say({ voice: 'alice' }, `Please hold while we connect you to ${businessName}.`);

  const dial = twiml.dial({
    timeout,
    action: '/api/webhooks/twilio/voice/fallback',
    method: 'POST',
  });
  dial.number(number);

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function twimlSequentialForward(numbers: string[], timeout: number, businessName: string, _greetingUrl?: string): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say({ voice: 'alice' }, `Please hold while we connect you to ${businessName}.`);

  const dial = twiml.dial({
    timeout,
    action: '/api/webhooks/twilio/voice/fallback',
    method: 'POST',
  });

  // Try numbers sequentially
  numbers.forEach((number) => {
    dial.number(number);
  });

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function twimlSimultaneousForward(numbers: string[], timeout: number, businessName: string, _greetingUrl?: string): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say({ voice: 'alice' }, `Please hold while we connect you to ${businessName}.`);

  const dial = twiml.dial({
    timeout,
    action: '/api/webhooks/twilio/voice/fallback',
    method: 'POST',
  });

  // Ring all numbers simultaneously
  numbers.forEach((number) => {
    dial.number(number);
  });

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function checkBusinessHours(hours: any, timezone: string): boolean {
  if (!hours) return true; // If no hours set, assume always open

  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone || 'America/Chicago' }));
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
