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

// GET /api/referrals - Get referral data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const settings = searchParams.get('settings');
    const code = searchParams.get('code');
    const report = searchParams.get('report');
    const status = searchParams.get('status');
    const creditBalance = searchParams.get('creditBalance');

    // Get settings
    if (settings === 'true') {
      const referralSettings = await getReferralSettings(userData.business_id);
      return NextResponse.json({ settings: referralSettings });
    }

    // Validate a code
    if (code) {
      const validation = await validateReferralCode(userData.business_id, code);
      return NextResponse.json(validation);
    }

    // Get report
    if (report === 'true') {
      const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = searchParams.get('endDate') || new Date().toISOString();
      const reportData = await getReferralReport(userData.business_id, startDate, endDate);
      return NextResponse.json({ report: reportData });
    }

    // Get customer stats
    if (customerId) {
      if (creditBalance === 'true') {
        const balance = await getCustomerCreditBalance(customerId, userData.business_id);
        return NextResponse.json({ balance });
      }
      const stats = await getCustomerReferralStats(customerId, userData.business_id);
      return NextResponse.json({ stats });
    }

    // Get all referrals
    const referrals = await getBusinessReferrals(userData.business_id, status || undefined);
    return NextResponse.json({ referrals });
  } catch (error: any) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/referrals - Referral actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    let result;

    switch (action) {
      case 'updateSettings':
        result = await upsertReferralSettings(userData.business_id, data);
        break;

      case 'getCode':
        if (!data.customerId) {
          return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }
        const code = await getOrCreateReferralCode(data.customerId, userData.business_id);
        return NextResponse.json({ code });

      case 'createReferral':
        if (!data.referralCode || !data.referee?.name) {
          return NextResponse.json(
            { error: 'Referral code and referee name are required' },
            { status: 400 }
          );
        }
        result = await createReferral(userData.business_id, data.referralCode, data.referee);
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
        result = await addCustomerCredit(
          data.customerId,
          userData.business_id,
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
        result = await redeemCredit(
          data.customerId,
          userData.business_id,
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
  } catch (error: any) {
    console.error('Error with referral action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
