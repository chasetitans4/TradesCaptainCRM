// =====================================================
// PORTAL ESCALATE TO HUMAN API
// POST /api/portal/messages/escalate - Request human support
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId } = body;

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get or create active conversation for this customer
    const { data: conversation } = await supabase
      .from('sms_conversations')
      .select('id')
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (conversation) {
      // Update the conversation to flag for human attention
      await supabase
        .from('sms_conversations')
        .update({
          requires_human_attention: true,
          human_requested_at: new Date().toISOString(),
          metadata: supabase.rpc('jsonb_set_key', {
            target: 'metadata',
            key: 'escalation_source',
            value: '"customer_portal"',
          }),
        })
        .eq('id', conversation.id);
    }

    // Get customer details for notification
    const { data: customer } = await supabase
      .from('customers')
      .select('name, phone')
      .eq('id', session.customerId)
      .single();

    // Notify business users (owners and admins) about the escalation
    const { data: businessUsers } = await supabase
      .from('users')
      .select('id')
      .eq('business_id', session.businessId)
      .in('role', ['owner', 'admin']);

    if (businessUsers?.length) {
      await supabase.from('notifications').insert(
        businessUsers.map((user) => ({
          user_id: user.id,
          type: 'escalation_request',
          title: 'Human Support Requested',
          message: `${customer?.name || 'A customer'} has requested to speak with a team member.`,
          data: {
            customerId: session.customerId,
            customerName: customer?.name,
            customerPhone: customer?.phone,
            conversationId: conversation?.id,
            source: 'customer_portal',
          },
          priority: 'high',
        }))
      );
    }

    apiLogger.info({
      msg: 'Customer requested human support',
      customerId: session.customerId,
      businessId: session.businessId,
      conversationId: conversation?.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Your request has been escalated. A team member will respond shortly.',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal escalation error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to escalate request' },
      { status: 500 }
    );
  }
}
