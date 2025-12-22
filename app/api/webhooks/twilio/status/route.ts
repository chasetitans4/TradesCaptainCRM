// =====================================================
// TWILIO MESSAGE STATUS WEBHOOK
// POST /api/webhooks/twilio/status
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { validateTwilioSignature, updateMessageStatus } from '@/lib/twilio';

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
      MessageSid: messageSid,
      MessageStatus: messageStatus,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
    } = params;

    if (!messageSid || !messageStatus) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Map Twilio status to our status
    let status: 'queued' | 'sent' | 'delivered' | 'failed';
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
      case 'read':
        status = 'delivered';
        break;
      case 'failed':
      case 'undelivered':
        status = 'failed';
        break;
      default:
        status = 'sent';
    }

    // Update message status in database
    await updateMessageStatus(
      messageSid,
      status,
      errorCode ? `${errorCode}: ${errorMessage || 'Unknown error'}` : undefined
    );

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing status webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
