// =====================================================
// Leads Captain v2 Approvals API
// GET /api/nevermiss/v2/approvals - List pending approvals
// =====================================================

import { NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApprovalQueueItem, ApprovalQueueResponse, NevermissMessage } from '@/types/nevermiss';

export async function GET() {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get config
    const { data: config } = await supabase
      .from('nevermiss_config')
      .select('id, approval_timeout_minutes')
      .eq('business_id', profile.business_id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Leads Captain not configured' }, { status: 404 });
    }

    // Get pending approval messages with conversation info
    const { data: messages, error } = await supabase
      .from('nevermiss_messages_v2')
      .select(`
        *,
        conversation:nevermiss_conversations_v2!inner (
          id,
          customer_phone,
          customer_name,
          status,
          config_id
        )
      `)
      .eq('approval_required', true)
      .eq('approval_status', 'pending')
      .eq('conversation.config_id', config.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Calculate timeout for each message
    const timeoutMinutes = config.approval_timeout_minutes || 5;
    const items: ApprovalQueueItem[] = (messages || []).map(msg => {
      const createdAt = new Date(msg.created_at);
      const timeoutAt = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);

      // Extract conversation from msg and get the rest as message data
      const { conversation, ...messageData } = msg;

      return {
        message: messageData as NevermissMessage,
        conversation: {
          id: conversation.id,
          customer_phone: conversation.customer_phone,
          customer_name: conversation.customer_name,
          status: conversation.status,
        },
        pending_since: msg.created_at,
        timeout_at: timeoutAt.toISOString(),
      };
    });

    const response: ApprovalQueueResponse = {
      items,
      total: items.length,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
