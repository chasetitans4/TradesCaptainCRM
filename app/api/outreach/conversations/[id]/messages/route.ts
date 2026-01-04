import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendOutreachMessage } from '@/lib/outreach/sms';
import { apiLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/outreach/conversations/[id]/messages
 * Get messages for a conversation
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('outreach_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error getting messages', error });
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/conversations/[id]/messages
 * Send a message in a conversation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Get the conversation to find the contact_id
    const { data: conversation } = await supabase
      .from('outreach_conversations')
      .select('contact_id')
      .eq('id', id)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const result = await sendOutreachMessage({
      contact_id: conversation.contact_id,
      message_text: body.message_text,
      sender_type: body.sender_type || 'human',
      sender_id: body.sender_id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, blocked_reason: result.blocked_reason },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error sending message', error });
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
