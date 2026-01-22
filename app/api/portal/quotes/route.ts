// =====================================================
// PORTAL QUOTES API
// GET /api/portal/quotes - Get customer quotes
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status'); // 'pending', 'past', 'all'

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

    let query = supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        total,
        subtotal,
        tax:tax_amount,
        valid_until,
        created_at,
        items:quote_items(*),
        notes,
        job:jobs(id, title:service_type)
      `)
      .eq('customer_id', session.customerId)
      .order('created_at', { ascending: false });

    // Filter by status
    if (status === 'pending') {
      query = query.in('status', ['sent', 'viewed']);
    } else if (status === 'past') {
      query = query.in('status', ['accepted', 'declined', 'expired']);
    }

    const { data: quotes, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(quotes || []);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal quotes GET error',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return NextResponse.json(
      { error: 'Failed to get quotes' },
      { status: 500 }
    );
  }
}
