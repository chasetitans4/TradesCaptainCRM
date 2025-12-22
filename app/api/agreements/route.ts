// =====================================================
// SERVICE AGREEMENTS API
// GET /api/agreements - Get agreements
// POST /api/agreements - Create agreement
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  createServiceAgreement,
  getCustomerAgreements,
  getActiveAgreements,
  getAgreementStats,
  getUpcomingServices,
} from '@/lib/agreements';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const stats = searchParams.get('stats') === 'true';
    const upcoming = searchParams.get('upcoming') === 'true';
    const days = parseInt(searchParams.get('days') || '30');

    if (stats) {
      const agreementStats = await getAgreementStats(profile.business_id);
      return NextResponse.json(agreementStats);
    }

    if (upcoming) {
      const upcomingServices = await getUpcomingServices(profile.business_id, days);
      return NextResponse.json(upcomingServices);
    }

    if (customerId) {
      const agreements = await getCustomerAgreements(customerId);
      return NextResponse.json(agreements);
    }

    const agreements = await getActiveAgreements(profile.business_id);
    return NextResponse.json(agreements);
  } catch (error: any) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agreements' },
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
      name,
      serviceType,
      frequency,
      startDate,
      endDate,
      price,
      description,
      terms,
      equipmentIds,
      autoRenew,
      reminderDays,
    } = body;

    if (!customerId || !name || !serviceType || !frequency || !startDate || !price) {
      return NextResponse.json(
        { error: 'customerId, name, serviceType, frequency, startDate, and price are required' },
        { status: 400 }
      );
    }

    const agreement = await createServiceAgreement({
      businessId: profile.business_id,
      customerId,
      name,
      serviceType,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      price,
      description,
      terms,
      equipmentIds,
      autoRenew,
      reminderDays,
    });

    return NextResponse.json(agreement);
  } catch (error: any) {
    console.error('Error creating agreement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agreement' },
      { status: 500 }
    );
  }
}
