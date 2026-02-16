import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/outreach/conversations
 * Get conversations with filters
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status');
    const contactId = searchParams.get('contact_id');
    const campaignId = searchParams.get('campaign_id');
    const humanTakeover = searchParams.get('human_takeover');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '25');

    let query = supabase
      .from('outreach_conversations')
      .select(`
        *,
        contact:outreach_contacts(*),
        campaign:outreach_campaigns(id, name)
      `, { count: 'exact' });

    if (status) {
      query = query.in('status', status.split(','));
    }

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (humanTakeover !== null) {
      query = query.eq('human_takeover', humanTakeover === 'true');
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('last_message_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_more: (count || 0) > page * pageSize,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error getting conversations', error });
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}
