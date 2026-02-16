// =====================================================
// CUSTOMER AGREEMENT API
// GET /api/customers/[id]/agreement
//
// Per CIL Spec Section 4.1:
// Returns the active/expiring maintenance agreement for a customer
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { addDays } from 'date-fns';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const EXPIRING_THRESHOLD_DAYS = 30;

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;
    const supabase = await createClient();

    // Verify customer belongs to this business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', profile.business_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get active or expiring agreement
    const thirtyDaysFromNow = addDays(new Date(), EXPIRING_THRESHOLD_DAYS);

    const { data: agreements, error: agreementError } = await supabase
      .from('service_agreements')
      .select('id, name, status, next_service_date, end_date')
      .eq('customer_id', customerId)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (agreementError) {
      console.error('Error fetching agreement:', agreementError);
      return NextResponse.json(
        { error: 'Failed to fetch agreement' },
        { status: 500 }
      );
    }

    const agreement = agreements?.[0];

    if (!agreement) {
      return NextResponse.json({ agreement: null });
    }

    // Determine if expiring
    let status = agreement.status;
    if (
      agreement.end_date &&
      new Date(agreement.end_date) <= thirtyDaysFromNow &&
      new Date(agreement.end_date) > new Date()
    ) {
      status = 'expiring';
    }

    return NextResponse.json({
      agreement: {
        id: agreement.id,
        name: agreement.name,
        status,
        nextServiceDate: agreement.next_service_date,
        endDate: agreement.end_date,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/customers/[id]/agreement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
