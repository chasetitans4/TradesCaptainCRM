// =====================================================
// TWILIO INCOMING SMS WEBHOOK
// POST /api/webhooks/twilio/sms
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  validateTwilioSignature,
  getOrCreateConversation,
  saveIncomingMessage,
  handleIncomingWithAI,
  formatPhoneE164,
} from '@/lib/twilio';
import { createAdminClient } from '@/lib/supabase/server';
import twilio from 'twilio';

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
        console.error('Invalid Twilio signature');
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const {
      From: from,
      To: to,
      Body: body,
      MessageSid: messageSid,
    } = params;

    if (!from || !to || !body) {
      console.error('Missing required fields in SMS webhook');
      return new NextResponse('Bad Request', { status: 400 });
    }

    const supabase = createAdminClient();

    // Find business by phone number
    const { data: business } = await supabase
      .from('businesses')
      .select('id, ai_sms_enabled')
      .eq('twilio_phone_number', formatPhoneE164(to))
      .single();

    if (!business) {
      console.error('No business found for phone number:', to);
      // Return 200 to acknowledge receipt even if we can't process
      return twimlResponse('');
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(from, business.id);

    // Save the incoming message
    await saveIncomingMessage(conversation.id, body, messageSid);

    // Try to find or create customer
    if (!conversation.customer_id && conversation.isNew) {
      // Create a basic customer record
      await supabase.from('customers').insert({
        business_id: business.id,
        name: 'Unknown',
        phone: formatPhoneE164(from),
        source: 'ai_sms',
      }).onConflict('business_id, phone');
    }

    // Handle AI response if enabled
    if (business.ai_sms_enabled) {
      await handleIncomingWithAI(body, conversation.id, business.id, from);
    }

    // Return empty TwiML (we send responses via API, not TwiML)
    return twimlResponse('');
  } catch (error) {
    console.error('Error processing incoming SMS:', error);
    return twimlResponse('');
  }
}

function twimlResponse(message: string): NextResponse {
  const twiml = new twilio.twiml.MessagingResponse();
  if (message) {
    twiml.message(message);
  }

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
