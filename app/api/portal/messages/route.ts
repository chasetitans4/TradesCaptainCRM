// =====================================================
// CUSTOMER PORTAL MESSAGES API
// GET /api/portal/messages - Get customer's message history
// POST /api/portal/messages - Send a message to the business
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { checkPortalMessageRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, businessId } = session;
    const supabase = createAdminClient();

    // Get customer's phone number
    const { data: customer } = await supabase
      .from('customers')
      .select('phone')
      .eq('id', customerId)
      .single();

    if (!customer?.phone) {
      return NextResponse.json({ messages: [], hasPhone: false });
    }

    // Find conversation for this customer
    const { data: conversation } = await supabase
      .from('sms_conversations')
      .select('id')
      .eq('business_id', businessId)
      .eq('customer_phone', customer.phone)
      .single();

    if (!conversation) {
      return NextResponse.json({ messages: [], hasPhone: true });
    }

    // Get messages
    const { data: messages } = await supabase
      .from('sms_messages')
      .select(`
        id,
        direction,
        sender,
        body,
        status,
        created_at
      `)
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(100);

    return NextResponse.json({
      messages: messages || [],
      conversationId: conversation.id,
      hasPhone: true,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching portal messages' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, businessId } = session;

    // Get client IP for rate limiting
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-real-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               'unknown';

    // Check rate limit (10 messages per 5 minutes per customer+IP)
    const rateLimit = await checkPortalMessageRateLimit(customerId, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'You are sending messages too quickly. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 300).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 1600) {
      return NextResponse.json({ error: 'Message too long (max 1600 characters)' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get customer's phone number
    const { data: customer } = await supabase
      .from('customers')
      .select('phone, name')
      .eq('id', customerId)
      .single();

    if (!customer?.phone) {
      return NextResponse.json(
        { error: 'No phone number on file. Please update your profile.' },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversationId: string;
    const { data: existingConversation } = await supabase
      .from('sms_conversations')
      .select('id')
      .eq('business_id', businessId)
      .eq('customer_phone', customer.phone)
      .single();

    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      // Get business phone number
      const { data: business } = await supabase
        .from('businesses')
        .select('twilio_phone_number')
        .eq('id', businessId)
        .single();

      const { data: newConversation, error: convError } = await supabase
        .from('sms_conversations')
        .insert({
          business_id: businessId,
          business_phone: business?.twilio_phone_number || '',
          customer_phone: customer.phone,
          customer_id: customerId,
          is_customer_initiated: true,
          status: 'active',
        })
        .select('id')
        .single();

      if (convError) throw convError;
      conversationId = newConversation.id;
    }

    // Insert message into SMS messages table (for unified history)
    const { data: newMessage, error: msgError } = await supabase
      .from('sms_messages')
      .insert({
        conversation_id: conversationId,
        direction: 'inbound',
        sender: 'customer',
        body: message.trim(),
        status: 'delivered',
        metadata: { source: 'portal' },
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation
    await supabase
      .from('sms_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_customer_message_at: new Date().toISOString(),
        unread_count: supabase.rpc('increment', { row_id: conversationId }),
      })
      .eq('id', conversationId);

    // Also create an internal notification for the business
    const { data: businessUsers } = await supabase
      .from('users')
      .select('id')
      .eq('business_id', businessId)
      .in('role', ['owner', 'admin', 'dispatcher']);

    if (businessUsers?.length) {
      await supabase.from('notifications').insert(
        businessUsers.map((user) => ({
          user_id: user.id,
          type: 'new_message',
          title: `New message from ${customer.name}`,
          message: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
          data: { conversationId, customerId },
        }))
      );
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error sending portal message' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
