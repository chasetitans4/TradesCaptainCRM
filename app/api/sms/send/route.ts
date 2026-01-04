// =====================================================
// SEND SMS
// POST /api/sms/send
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, clearHumanAttention, formatPhoneE164 } from '@/lib/twilio';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, message, conversation_id } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    // Check if business has a phone number
    const supabase = await createServerSupabaseClient();
    const { data: business } = await supabase
      .from('businesses')
      .select('twilio_phone_number')
      .eq('id', profile.business_id)
      .single();

    if (!business?.twilio_phone_number) {
      return NextResponse.json(
        { error: 'Business has no phone number configured' },
        { status: 400 }
      );
    }

    // Send the SMS
    const result = await sendSMS({
      to: formatPhoneE164(to),
      body: message,
      businessId: profile.business_id,
      conversationId: conversation_id,
      senderId: profile.id,
      isAIResponse: false,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // If sending to an existing conversation, clear human attention flag
    if (conversation_id) {
      await clearHumanAttention(conversation_id);
    }

    return NextResponse.json({
      success: true,
      message_id: result.messageId,
      twilio_sid: result.twilioSid,
    });
  } catch (error) {
    import('@/lib/logger').then(({ logApiError }) => {
      logApiError('POST', '/api/sms/send', error as Error);
    });
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
