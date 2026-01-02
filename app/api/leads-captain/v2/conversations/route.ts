// =====================================================
// Leads Captain v2 Conversations API
// GET /api/leads-captain/v2/conversations - List conversations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ConversationFilters, ConversationListResponse } from '@/types/leads-captain';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    // Get config ID
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Parse filters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('page_size') || '20'), 100);
    const status = searchParams.get('status');
    const isHotLead = searchParams.get('is_hot_lead');
    const isEmergency = searchParams.get('is_emergency');
    const requiresHuman = searchParams.get('requires_human');
    const search = searchParams.get('search');
    const intent = searchParams.get('intent');
    const sentiment = searchParams.get('sentiment');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Build query
    let query = supabase
      .from('leads_captain_conversations_v2')
      .select('*', { count: 'exact' })
      .eq('config_id', config.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Apply filters
    if (status) {
      if (status.includes(',')) {
        query = query.in('status', status.split(','));
      } else {
        query = query.eq('status', status);
      }
    }

    if (isHotLead === 'true') {
      query = query.eq('is_hot_lead', true);
    }

    if (isEmergency === 'true') {
      query = query.eq('is_emergency', true);
    }

    if (requiresHuman === 'true') {
      query = query.eq('requires_human', true);
    }

    if (search) {
      query = query.or(`customer_phone.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    if (intent) {
      query = query.eq('current_intent', intent);
    }

    if (sentiment) {
      query = query.eq('sentiment', sentiment);
    }

    if (dateFrom) {
      query = query.gte('started_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('started_at', dateTo);
    }

    const { data: conversations, count, error } = await query;
    if (error) throw error;

    const response: ConversationListResponse = {
      conversations: conversations || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_more: (count || 0) > page * pageSize,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
