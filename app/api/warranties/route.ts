// =====================================================
// WARRANTY TRACKING API
// GET /api/warranties - Get warranties
// POST /api/warranties - Create warranty
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  createWarranty,
  getCustomerWarranties,
  getExpiringWarranties,
  getPendingClaims,
  getWarrantyStats,
} from '@/lib/warranties';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const expiring = searchParams.get('expiring') === 'true';
    const pendingClaims = searchParams.get('pendingClaims') === 'true';
    const stats = searchParams.get('stats') === 'true';
    const withinDays = parseInt(searchParams.get('withinDays') || '30');
    const includeExpired = searchParams.get('includeExpired') === 'true';

    if (stats) {
      const warrantyStats = await getWarrantyStats(profile.business_id);
      return NextResponse.json(warrantyStats);
    }

    if (pendingClaims) {
      const claims = await getPendingClaims(profile.business_id);
      return NextResponse.json(claims);
    }

    if (expiring) {
      const expiringWarranties = await getExpiringWarranties(profile.business_id, withinDays);
      return NextResponse.json(expiringWarranties);
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    const warranties = await getCustomerWarranties(customerId, includeExpired);
    return NextResponse.json(warranties);
  } catch (error: any) {
    console.error('Error fetching warranties:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warranties' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      equipmentId,
      jobId,
      warrantyType,
      provider,
      coverageDetails,
      startDate,
      endDate,
      terms,
      contactInfo,
      documentationUrl,
    } = body;

    if (!customerId || !warrantyType || !provider || !coverageDetails || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'customerId, warrantyType, provider, coverageDetails, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    const warranty = await createWarranty({
      businessId: profile.business_id,
      customerId,
      equipmentId,
      jobId,
      warrantyType,
      provider,
      coverageDetails,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      terms,
      contactInfo,
      documentationUrl,
    });

    return NextResponse.json(warranty);
  } catch (error: any) {
    console.error('Error creating warranty:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create warranty' },
      { status: 500 }
    );
  }
}
