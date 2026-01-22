import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getReferralSettings,
  upsertReferralSettings,
  getOrCreateReferralCode,
  validateReferralCode,
  createReferral,
  convertReferral,
  getCustomerReferralStats,
  getBusinessReferrals,
  getReferralReport,
  addCustomerCredit,
  redeemCredit,
  getCustomerCreditBalance,
} from '@/lib/referrals';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

// GET /api/referrals - Get referral data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let businessId = session.user.businessId;

    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
       if (session.user.role === 'admin' || session.user.role === 'super_admin') {
           return NextResponse.json({ referrals: [] });
       }
       return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const customerId = searchParams.get('customerId');
    const settings = searchParams.get('settings');
    const code = searchParams.get('code');
    const report = searchParams.get('report');
    const status = searchParams.get('status');
    const creditBalance = searchParams.get('creditBalance');

    // Get settings
    if (settings === 'true') {
      const referralSettings = await getReferralSettings(businessId);
      return NextResponse.json({ settings: referralSettings });
    }

    // Validate a code
    if (code) {
      const validation = await validateReferralCode(businessId, code);
      return NextResponse.json(validation);
    }

    // Get report
    if (report === 'true') {
      const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = searchParams.get('endDate') || new Date().toISOString();
      const reportData = await getReferralReport(businessId, startDate, endDate);
      return NextResponse.json({ report: reportData });
    }

    // Get customer stats
    if (customerId) {
      if (creditBalance === 'true') {
        const balance = await getCustomerCreditBalance(customerId, businessId);
        return NextResponse.json({ balance });
      }
      const stats = await getCustomerReferralStats(customerId, businessId);
      return NextResponse.json({ stats });
    }

    // Get all referrals
    const referrals = await getBusinessReferrals(businessId, status || undefined);
    return NextResponse.json({ referrals });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching referral data' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch referral data' }, { status: 500 });
  }
}

// POST /api/referrals - Referral actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Determine Business ID
    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
       if (data.businessId) businessId = data.businessId;
    }

    // Some actions require businessId, check if we have it when needed
    // updateSettings, getCode, createReferral, addCredit, redeemCredit
    if (!businessId && ['updateSettings', 'getCode', 'createReferral', 'addCredit', 'redeemCredit'].includes(action)) {
         return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'updateSettings':
        if (!businessId) throw new Error("Business ID missing");
        result = await upsertReferralSettings(businessId, data);
        break;

      case 'getCode':
        if (!data.customerId) {
          return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }
        if (!businessId) throw new Error("Business ID missing");
        const code = await getOrCreateReferralCode(data.customerId, businessId);
        return NextResponse.json({ code });

      case 'createReferral':
        if (!data.referralCode || !data.referee?.name) {
          return NextResponse.json(
            { error: 'Referral code and referee name are required' },
            { status: 400 }
          );
        }
        if (!businessId) throw new Error("Business ID missing");
        result = await createReferral(businessId, data.referralCode, data.referee);
        break;

      case 'convert':
        if (!data.referralId || !data.jobId) {
          return NextResponse.json(
            { error: 'Referral ID and Job ID are required' },
            { status: 400 }
          );
        }
        result = await convertReferral(data.referralId, data.jobId, data.jobValue || 0);
        break;

      case 'addCredit':
        if (!data.customerId || !data.amount) {
          return NextResponse.json(
            { error: 'Customer ID and amount are required' },
            { status: 400 }
          );
        }
        if (!businessId) throw new Error("Business ID missing");
        result = await addCustomerCredit(
          data.customerId,
          businessId,
          data.amount,
          data.type || 'manual',
          data.description || 'Manual credit'
        );
        break;

      case 'redeemCredit':
        if (!data.customerId || !data.amount || !data.invoiceId) {
          return NextResponse.json(
            { error: 'Customer ID, amount, and invoice ID are required' },
            { status: 400 }
          );
        }
        if (!businessId) throw new Error("Business ID missing");
        result = await redeemCredit(
          data.customerId,
          businessId,
          data.amount,
          data.invoiceId
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (result && !result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result || { success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'referral action' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to perform referral action' }, { status: 500 });
  }
}
