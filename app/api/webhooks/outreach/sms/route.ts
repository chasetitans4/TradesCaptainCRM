import { NextRequest, NextResponse } from 'next/server';
import { handleInboundMessage, sendOutreachMessage, generateAIResponse } from '@/lib/outreach/sms';
import { qualifyContact } from '@/lib/outreach/sms';
import { smsLogger } from '@/lib/logger';

/**
 * POST /api/webhooks/outreach/sms
 * Handle inbound SMS from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle the inbound message
    const result = await handleInboundMessage({
      from_phone: from,
      message_text: body,
      twilio_sid: messageSid,
    });

    if (!result.success) {
      smsLogger.error({ msg: 'Failed to handle inbound message', error: result.error });
      // Return 200 to Twilio to prevent retries
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response></Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // If opt-out, send confirmation
    if (result.is_opt_out) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>You have been unsubscribed and will no longer receive messages. Reply START to opt back in.</Message>
        </Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // If AI response is needed, generate and send
    if (result.ai_response_needed && result.contact && result.message) {
      // Get conversation ID from the message
      const conversationId = result.message.conversation_id;

      // Attempt AI response
      const aiResponse = await generateAIResponse(
        result.contact.id,
        conversationId,
        body
      );

      if (aiResponse) {
        // Send AI response
        await sendOutreachMessage({
          contact_id: result.contact.id,
          message_text: aiResponse,
          sender_type: 'ai',
          skip_compliance_check: true, // Already verified on inbound
        });

        // Trigger qualification
        await qualifyContact(result.contact.id, conversationId);
      }
    }

    // Return empty TwiML (we send responses separately)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error) {
    smsLogger.error({ msg: 'Error handling SMS webhook', error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) } });
    // Return 200 to prevent Twilio retries
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}
