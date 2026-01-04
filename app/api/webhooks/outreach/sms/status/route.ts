import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';

/**
 * POST /api/webhooks/outreach/sms/status
 * Handle SMS delivery status updates from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse Twilio webhook data
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;

    if (!messageSid || !messageStatus) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map Twilio status to our status
    let status: string;
    switch (messageStatus) {
      case 'queued':
      case 'accepted':
        status = 'queued';
        break;
      case 'sending':
      case 'sent':
        status = 'sent';
        break;
      case 'delivered':
        status = 'delivered';
        break;
      case 'failed':
      case 'undelivered':
        status = 'failed';
        break;
      case 'read':
        status = 'read';
        break;
      default:
        status = messageStatus;
    }

    // Update message in database
    const updateData: Record<string, unknown> = {
      status,
      twilio_status: messageStatus,
    };

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    if (status === 'failed') {
      updateData.error_code = errorCode;
      updateData.error_message = errorMessage;
    }

    await supabase
      .from('outreach_messages')
      .update(updateData)
      .eq('twilio_sid', messageSid);

    return NextResponse.json({ success: true });
  } catch (error) {
    smsLogger.error({ msg: 'Error handling SMS status webhook', error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) } });
    return NextResponse.json(
      { error: 'Failed to update message status' },
      { status: 500 }
    );
  }
}
