// =====================================================
// PORTAL CONVERSATIONS API
// GET /api/portal/conversations - List SMS conversations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get customer's phone number
    const { data: customer } = await supabase
      .from('customers')
      .select('phone')
      .eq('id', session.customerId)
      .single();

    if (!customer?.phone) {
      return NextResponse.json({
        conversations: [],
        hasPhone: false,
      });
    }

    // Get conversations for this phone + business
    const { data: conversations, error } = await supabase
      .from('sms_conversations')
      .select(`
        id,
        phone,
        status,
        last_message_at,
        last_customer_message_at,
        needs_human_attention,
        ai_response_count,
        created_at
      `)
      .eq('business_id', session.businessId)
      .eq('phone', customer.phone)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      conversations: conversations || [],
      hasPhone: true,
      customerPhone: customer.phone,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Get conversations error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}
