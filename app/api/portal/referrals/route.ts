import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import {
  getReferralProgram,
  getCustomerReferralCode,
  getCustomerReferrals,
  getCustomerReferralStats,
  submitReferral,
  getReferralProgramDetails,
} from '@/lib/portal/referrals';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/referrals - Get referral program and customer's referrals
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('include')?.split(',') || [];

    // Get referral program details
    const programDetails = await getReferralProgramDetails(session.businessId);

    if (!programDetails.program) {
      return NextResponse.json({
        available: false,
        message: 'Referral program is not currently available',
      });
    }

    // Get customer's referral code
    const referralCode = await getCustomerReferralCode(
      session.customerId,
      session.businessId
    );

    const response: Record<string, any> = {
      available: true,
      program: {
        rewards: programDetails.rewards,
        terms: programDetails.terms,
      },
      referralCode,
    };

    // Optionally include referral history
    if (includeDetails.includes('history')) {
      response.referrals = await getCustomerReferrals(
        session.customerId,
        session.businessId
      );
    }

    // Optionally include stats
    if (includeDetails.includes('stats')) {
      response.stats = await getCustomerReferralStats(
        session.customerId,
        session.businessId
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal referrals GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch referral info' }, { status: 500 });
  }
}

// POST /api/portal/referrals - Submit a new referral
export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, notes } = body;

    // Validate required fields
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please provide the referral\'s name' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Please provide either an email or phone number' },
        { status: 400 }
      );
    }

    // Basic email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Please provide a valid email address' },
          { status: 400 }
        );
      }
    }

    const result = await submitReferral(
      session.customerId,
      session.businessId,
      {
        name: name.trim(),
        email: email?.trim(),
        phone: phone?.trim(),
        notes: notes?.trim(),
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'referral_submitted',
      details: { referralId: result.referralId },
      request,
    });

    return NextResponse.json({
      success: true,
      referralId: result.referralId,
      message: 'Thank you for your referral! We\'ll reach out to them soon.',
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal referrals POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to submit referral' }, { status: 500 });
  }
}
