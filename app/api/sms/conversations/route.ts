// =====================================================
// SMS CONVERSATIONS LIST
// GET /api/sms/conversations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get filter params
    const status = request.nextUrl.searchParams.get('status') || 'active';
    const needsAttention = request.nextUrl.searchParams.get('needs_attention') === 'true';

    let query = supabase
      .from('sms_conversations')
      .select(`
        *,
        customer:customers(id, name, phone),
        last_message:sms_messages(
          id,
          body,
          direction,
          sender,
          created_at,
          status
        )
      `)
      .eq('business_id', profile.business_id)
      .order('updated_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (needsAttention) {
      query = query.eq('needs_human_attention', true);
    }

    // Get last message only (order by created_at desc and limit 1)
    const { data: conversations, error } = await query;

    if (error) {
      apiLogger.error({ error, context: 'fetching conversations' });
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Process to get only the latest message and add unread count
    const processedConversations = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Get unread count (messages after last human response)
        const { count: unreadCount } = await supabase
          .from('sms_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('direction', 'inbound')
          .eq('status', 'received');

        // Get the actual last message
        const { data: lastMessages } = await supabase
          .from('sms_messages')
          .select('id, body, direction, sender, created_at, status')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          ...conv,
          last_message: lastMessages?.[0] || null,
          unread_count: unreadCount || 0,
        };
      })
    );

    return NextResponse.json({ conversations: processedConversations });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching conversations' });
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
