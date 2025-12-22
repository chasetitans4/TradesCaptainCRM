// =====================================================
// CONVERSATION MESSAGES
// GET /api/sms/conversations/[id]/messages
// POST /api/sms/conversations/[id]/messages (send new message)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, clearHumanAttention } from '@/lib/twilio';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch messages for a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('sms_conversations')
      .select('*, customer:customers(id, name, phone)')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get pagination params
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const before = request.nextUrl.searchParams.get('before'); // cursor for pagination

    let query = supabase
      .from('sms_messages')
      .select('*, sender_user:users(id, name)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error: msgError } = await query;

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Reverse to get chronological order for display
    const chronologicalMessages = (messages || []).reverse();

    return NextResponse.json({
      conversation,
      messages: chronologicalMessages,
      has_more: messages?.length === limit,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send a new message in the conversation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('sms_conversations')
      .select('phone, business_id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Send the SMS
    const result = await sendSMS({
      to: conversation.phone,
      body: message,
      businessId: conversation.business_id,
      conversationId: id,
      senderId: profile.id,
      isAIResponse: false,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      );
    }

    // Clear human attention flag since a human responded
    await clearHumanAttention(id);

    return NextResponse.json({
      success: true,
      message_id: result.messageId,
      twilio_sid: result.twilioSid,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
