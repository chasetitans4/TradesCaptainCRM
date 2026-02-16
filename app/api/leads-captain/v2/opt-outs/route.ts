/**
 * OPT-OUT MANAGEMENT API
 * GET /api/leads-captain/v2/opt-outs - List opt-out events
 * POST /api/leads-captain/v2/opt-outs - Create manual opt-out
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

const optOutLogger = apiLogger.child({ context: 'api.leads-captain.opt-outs' });

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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '50');
    const eventType = searchParams.get('event_type'); // 'opt_out', 'opt_back_in', or null for all
    const search = searchParams.get('search');

    // Get config_id for this business
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', userData.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ events: [], total: 0, page, page_size: pageSize, has_more: false });
    }

    // Build query
    let query = supabase
      .from('leads_captain_audit_log')
      .select('*', { count: 'exact' })
      .eq('config_id', config.id)
      .in('action', ['opt_out', 'opt_in'])
      .order('created_at', { ascending: false });

    // Filter by event type
    if (eventType === 'opt_out') {
      query = query.eq('action', 'opt_out');
    } else if (eventType === 'opt_back_in') {
      query = query.eq('action', 'opt_in');
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: auditLogs, count, error } = await query;

    if (error) {
      optOutLogger.error({
        msg: 'Failed to fetch opt-out events',
        error: error.message,
        businessId: userData.business_id,
      });
      return NextResponse.json({ error: 'Failed to fetch opt-out events' }, { status: 500 });
    }

    // Get conversation details for each event
    const conversationIds = [...new Set((auditLogs || []).map((log: any) => log.conversation_id).filter(Boolean))];

    let conversations: any[] = [];
    if (conversationIds.length > 0) {
      const { data: convData } = await supabase
        .from('leads_captain_conversations_v2')
        .select('id, customer_phone, customer_name')
        .in('id', conversationIds);
      conversations = convData || [];
    }

    const conversationMap = new Map(conversations.map((c: any) => [c.id, c]));

    // Format events
    const events = (auditLogs || []).map((log: any) => {
      const conversation = conversationMap.get(log.conversation_id);
      return {
        id: log.id,
        event_type: log.action === 'opt_out' ? 'opt_out' : 'opt_back_in',
        phone: conversation?.customer_phone || log.details?.phone || 'Unknown',
        customer_name: conversation?.customer_name || log.details?.customer_name || null,
        reason: log.details?.reason || null,
        method: log.details?.method || 'keyword', // 'keyword' (STOP), 'manual', 'api'
        actor: log.actor,
        conversation_id: log.conversation_id,
        created_at: log.created_at,
        details: log.details,
      };
    });

    // Apply search filter if provided
    let filteredEvents = events;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = events.filter((e: any) =>
        (e.phone && e.phone.includes(search)) ||
        (e.customer_name && e.customer_name.toLowerCase().includes(searchLower))
      );
    }

    return NextResponse.json({
      events: filteredEvents,
      total: count || 0,
      page,
      page_size: pageSize,
      has_more: (count || 0) > page * pageSize,
    });
  } catch (error) {
    optOutLogger.error({
      msg: 'Error fetching opt-out events',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch opt-out events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { phone, reason, action } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!action || !['opt_out', 'opt_in'].includes(action)) {
      return NextResponse.json({ error: 'Action must be opt_out or opt_in' }, { status: 400 });
    }

    // Get config_id
    const { data: config } = await supabase
      .from('leads_captain_config')
      .select('id')
      .eq('business_id', userData.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Find conversation by phone
    const { data: conversation } = await supabase
      .from('leads_captain_conversations_v2')
      .select('id')
      .eq('config_id', config.id)
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const actorName = `${userData.first_name} ${userData.last_name}`.trim() || 'Staff';

    // Create audit log entry
    const adminClient = createAdminClient();
    const { error: auditError } = await adminClient
      .from('leads_captain_audit_log')
      .insert({
        config_id: config.id,
        conversation_id: conversation?.id || null,
        action: action,
        actor: actorName,
        details: {
          phone,
          reason: reason || (action === 'opt_out' ? 'Manual opt-out by staff' : 'Manual opt-in by staff'),
          method: 'manual',
          recorded_by: user.id,
        },
      });

    if (auditError) {
      optOutLogger.error({
        msg: 'Failed to create opt-out audit log',
        error: auditError.message,
        businessId: userData.business_id,
      });
      return NextResponse.json({ error: 'Failed to record opt-out' }, { status: 500 });
    }

    // Update conversation if exists
    if (conversation?.id) {
      await adminClient
        .from('leads_captain_conversations_v2')
        .update({
          opted_out: action === 'opt_out',
          status: action === 'opt_out' ? 'blocked' : 'active',
        })
        .eq('id', conversation.id);
    }

    optOutLogger.info({
      msg: `Manual ${action} recorded`,
      businessId: userData.business_id,
      phone,
      actor: actorName,
    });

    return NextResponse.json({
      success: true,
      message: action === 'opt_out' ? 'Phone number has been opted out' : 'Phone number has been opted back in',
    });
  } catch (error) {
    optOutLogger.error({
      msg: 'Error creating opt-out',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to create opt-out' },
      { status: 500 }
    );
  }
}
