/**
 * FOLLOW-UP SCHEDULING API
 * GET /api/leads-captain/v2/follow-ups - List scheduled follow-ups
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

const followUpLogger = apiLogger.child({ context: 'api.leads-captain.follow-ups' });

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending'; // 'pending', 'sent', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '50');

    // Get config_id for this business
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', userData.business_id)
      .single();

    if (!config) {
      return NextResponse.json({
        follow_ups: [],
        total: 0,
        page,
        page_size: pageSize,
        has_more: false,
      });
    }

    // Get conversations with pending follow-ups
    // Since we may not have a dedicated follow_ups table, we'll construct from conversation state
    let query = supabase
      .from('leads_captain_conversations_v2')
      .select(`
        id,
        customer_phone,
        customer_name,
        status,
        current_intent,
        is_hot_lead,
        message_count,
        last_message_at,
        last_customer_message_at,
        created_at
      `, { count: 'exact' })
      .eq('config_id', config.id);

    // Filter by follow-up status
    if (status === 'pending') {
      // Pending = active conversations that need follow-up (no recent customer message)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      query = query
        .eq('status', 'active')
        .lt('last_customer_message_at', twoHoursAgo)
        .order('last_customer_message_at', { ascending: true });
    } else if (status === 'sent') {
      // Recently followed up - messages sent in last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query
        .gte('last_message_at', oneDayAgo)
        .order('last_message_at', { ascending: false });
    } else {
      // All conversations ordered by last activity
      query = query.order('last_message_at', { ascending: false, nullsFirst: false });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: conversations, count, error } = await query;

    if (error) {
      followUpLogger.error({
        msg: 'Failed to fetch follow-ups',
        error: error.message,
        businessId: userData.business_id,
      });
      return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
    }

    // Format follow-ups with calculated timing
    const followUps = (conversations || []).map((conv: any) => {
      const lastCustomerMessage = conv.last_customer_message_at
        ? new Date(conv.last_customer_message_at)
        : new Date(conv.created_at);
      const now = new Date();
      const hoursSinceLastMessage = (now.getTime() - lastCustomerMessage.getTime()) / (1000 * 60 * 60);

      // Calculate which follow-up is due
      let followUpNumber = 0;
      let scheduledAt = null;
      let isOverdue = false;

      if (hoursSinceLastMessage >= 24) {
        followUpNumber = 3;
        scheduledAt = new Date(lastCustomerMessage.getTime() + 24 * 60 * 60 * 1000);
        isOverdue = true;
      } else if (hoursSinceLastMessage >= 4) {
        followUpNumber = 2;
        scheduledAt = new Date(lastCustomerMessage.getTime() + 4 * 60 * 60 * 1000);
        isOverdue = hoursSinceLastMessage >= 4;
      } else if (hoursSinceLastMessage >= 1) {
        followUpNumber = 1;
        scheduledAt = new Date(lastCustomerMessage.getTime() + 60 * 60 * 1000);
        isOverdue = hoursSinceLastMessage >= 1;
      }

      return {
        id: conv.id,
        conversation_id: conv.id,
        customer_phone: conv.customer_phone,
        customer_name: conv.customer_name,
        status: conv.status,
        current_intent: conv.current_intent,
        is_hot_lead: conv.is_hot_lead,
        message_count: conv.message_count,
        last_customer_message_at: conv.last_customer_message_at,
        last_message_at: conv.last_message_at,
        follow_up_number: followUpNumber,
        scheduled_at: scheduledAt?.toISOString() || null,
        is_overdue: isOverdue,
        hours_since_last_message: Math.round(hoursSinceLastMessage * 10) / 10,
      };
    });

    return NextResponse.json({
      follow_ups: followUps,
      total: count || 0,
      page,
      page_size: pageSize,
      has_more: (count || 0) > page * pageSize,
    });
  } catch (error) {
    followUpLogger.error({
      msg: 'Error fetching follow-ups',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    );
  }
}
