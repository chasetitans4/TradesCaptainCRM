// =====================================================
// PORTAL SESSION API
// GET /api/portal/session - Get current portal session
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getBusinessForPortal, getCustomerProfile, getPlatformSettings } from '@/lib/portal/data';
import { apiLogger } from '@/lib/logger';

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

    // Verify session using the shared library (checks JWT)
    const session = await getPortalSession(undefined); // Pass undefined for slug as we check businessId manually

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify session belongs to this business
    if (session.businessId !== businessId) {
       return NextResponse.json(
        { error: 'Invalid session for this business' },
        { status: 401 }
      );
    }

    // Get customer and business info using admin client (via data lib)
    const [customer, business, platform] = await Promise.all([
      getCustomerProfile(session.customerId),
      getBusinessForPortal(businessId),
      getPlatformSettings(),
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
      platform,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/portal/session' });
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
