// =====================================================
// PORTAL SESSION API
// GET /api/portal/session - Get current portal session
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getBusinessForPortal, getCustomerProfile } from '@/lib/portal/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      );
    }

    // Check for portal session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`portal_session_${businessId}`);

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse session data
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { customerId, accessId } = sessionData;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Verify session is still valid
    const supabase = await createClient();
    const { data: access } = await supabase
      .from('customer_portal_access')
      .select('is_active')
      .eq('id', accessId)
      .eq('is_active', true)
      .single();

    if (!access) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get customer and business info
    const [customer, business] = await Promise.all([
      getCustomerProfile(customerId),
      getBusinessForPortal(businessId),
    ]);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      customer,
      business,
    });
  } catch (error) {
    console.error('Error in GET /api/portal/session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
