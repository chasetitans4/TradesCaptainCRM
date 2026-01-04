// =====================================================
// CLIENT LOCATIONS API
// GET /api/admin/locations/clients/[clientId] - Get locations
// POST /api/admin/locations/clients/[clientId] - Add location
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getClientLocations, addLocation, calculateLocationPricing } from '@/lib/admin/locations';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const locations = await getClientLocations(clientId);
    const { searchParams } = new URL(request.url);
    const basePlanParam = searchParams.get('base_plan_price_cents');
    const basePlanPriceCents = basePlanParam ? parseInt(basePlanParam) || 0 : 0;
    const pricing = await calculateLocationPricing(clientId, basePlanPriceCents);

    return NextResponse.json({ locations, pricing });
  } catch (error) {
    apiLogger.error({
      msg: 'Get locations error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await request.json();

    const { name, address, city, state, zip, phone } = body;

    if (!name || !address || !city || !state || !zip) {
      return NextResponse.json(
        { error: 'name, address, city, state, and zip are required' },
        { status: 400 }
      );
    }

    const location = await addLocation(
      clientId,
      {
        location_name: name,
        address_line1: address,
        city,
        state,
        zip,
        phone,
        use_separate_leads_captain: body.use_separate_leads_captain || false,
      }
    );

    return NextResponse.json({
      success: true,
      location,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Add location error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add location' },
      { status: 500 }
    );
  }
}
