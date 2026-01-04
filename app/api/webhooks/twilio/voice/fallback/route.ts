// =====================================================
// TWILIO VOICE FALLBACK (When forward fails)
// POST /api/webhooks/twilio/voice/fallback
// Triggers Leads Captain AI conversation on missed calls
// Supports both v1 and v2 Leads Captain processing
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { handleMissedCall, hasLeadsCaptainAccess, TwilioMissedCallPayload } from '@/lib/leads-captain';
import { processInboundMessage, type ProcessorOptions } from '@/lib/leads-captain/v2';
import { createAdminClient } from '@/lib/supabase/server';
import { formatPhoneE164, sendSMS } from '@/lib/twilio';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const dialCallStatus = params.DialCallStatus;
    const callSid = params.CallSid;
    const from = params.From;
    const to = params.To;

    const twiml = new twilio.twiml.VoiceResponse();
    const voiceLogger = apiLogger.child({ context: 'api.twilio.voice.fallback' });

    // If the call wasn't answered, trigger Leads Captain and/or voicemail
    if (dialCallStatus !== 'completed') {
      // Check if Leads Captain is enabled for this business
      const supabase = createAdminClient();
      const { data: business } = await supabase
        .from('businesses')
        .select('id, ai_sms_enabled')
        .eq('twilio_phone_number', formatPhoneE164(to))
        .single();

      if (business && business.ai_sms_enabled) {
        // Check for Leads Captain v2 config first
        const { data: v2Config } = await supabase
          .from('leads_captain_config')
          .select('id, global_mode')
          .eq('business_id', business.id)
          .neq('global_mode', 'paused')
          .single();

        if (v2Config) {
          // Use Leads Captain v2 processor for missed calls
          const handleV2MissedCall = async () => {
            try {
              const options: ProcessorOptions = {
                config_id: v2Config.id,
                business_id: business.id,
                customer_phone: from,
                business_phone: to,
                message: '[MISSED CALL]', // Special marker for missed calls
                is_missed_call: true,
                twilio_sid: callSid,
              };

              const result = await processInboundMessage(options);

              // Send response if ready (not pending approval)
              if (result.should_send && result.response_content) {
                await sendSMS({
                  to: from,
                  body: result.response_content,
                  businessId: business.id,
                  isAIResponse: result.ai_used,
                });
                voiceLogger.info('Leads Captain v2 missed call response sent');
              }
            } catch (error) {
              voiceLogger.error({ msg: 'Leads Captain v2 missed call handler error', error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) } });
            }
          };

          // Trigger in background
          handleV2MissedCall();
        } else {
          // Check if business has Leads Captain v1 access based on plan
          const hasAccess = await hasLeadsCaptainAccess(business.id);

          if (hasAccess) {
            // Trigger Leads Captain v1 AI conversation
            const missedCallPayload: TwilioMissedCallPayload = {
              CallSid: callSid,
              AccountSid: params.AccountSid || '',
              From: from,
              To: to,
              CallStatus: (dialCallStatus as 'no-answer' | 'busy' | 'canceled' | 'failed') || 'no-answer',
              Direction: 'inbound',
              Timestamp: new Date().toISOString(),
              CallerName: params.CallerName,
              FromCity: params.FromCity,
              FromState: params.FromState,
              FromZip: params.FromZip,
              FromCountry: params.FromCountry,
            };

            // Trigger Leads Captain in background (don't block TwiML response)
            handleMissedCall(missedCallPayload).catch(error => {
              voiceLogger.error({ msg: 'Leads Captain v1 missed call handler error', error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) } });
            });
          }
        }
      }

      // Still play voicemail prompt
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
    const voiceLogger = apiLogger.child({ context: 'api.twilio.voice.fallback' });
    voiceLogger.error({ msg: 'Error in voice fallback', error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) } });

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'alice' }, 'An error occurred. Please try again later.');

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
