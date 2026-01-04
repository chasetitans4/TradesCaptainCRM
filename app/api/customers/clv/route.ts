import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import {
  updateCustomerCLV,
  updateAllCustomerCLV,
  getCLVReport,
  getTopCustomers,
  getAtRiskCustomers,
  getCustomersBySegment,
  getCustomerCLVDetails,
  identifyChurnRisk,
  getCLVTrends,
} from '@/lib/customers/clv';

// GET /api/customers/clv - Get CLV data
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
    const report = searchParams.get('report');
    const top = searchParams.get('top');
    const atRisk = searchParams.get('atRisk');
    const segment = searchParams.get('segment');
    const churnRisk = searchParams.get('churnRisk');
    const trends = searchParams.get('trends');

    // Get single customer CLV details
    if (customerId) {
      const details = await getCustomerCLVDetails(customerId);
      return NextResponse.json(details);
    }

    // Get CLV report
    if (report === 'true') {
      const reportData = await getCLVReport(userData.business_id);
      return NextResponse.json({ report: reportData });
    }

    // Get top customers
    if (top) {
      const limit = parseInt(top) || 10;
      const customers = await getTopCustomers(userData.business_id, limit);
      return NextResponse.json({ customers });
    }

    // Get at-risk customers
    if (atRisk === 'true') {
      const customers = await getAtRiskCustomers(userData.business_id);
      return NextResponse.json({ customers });
    }

    // Get customers by segment
    if (segment) {
      if (!['high', 'medium', 'low', 'at_risk'].includes(segment)) {
        return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
      }
      const customers = await getCustomersBySegment(
        userData.business_id,
        segment as 'high' | 'medium' | 'low' | 'at_risk'
      );
      return NextResponse.json({ customers });
    }

    // Get churn risk analysis
    if (churnRisk === 'true') {
      const risk = await identifyChurnRisk(userData.business_id);
      return NextResponse.json(risk);
    }

    // Get CLV trends
    if (trends === 'true') {
      const months = parseInt(searchParams.get('months') || '12');
      const trendData = await getCLVTrends(userData.business_id, months);
      return NextResponse.json({ trends: trendData });
    }

    // Default: get CLV report
    const reportData = await getCLVReport(userData.business_id);
    return NextResponse.json({ report: reportData });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/customers/clv' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch CLV data' }, { status: 500 });
  }
}

// POST /api/customers/clv - CLV actions
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
    const { action, customerId } = body;

    switch (action) {
      case 'updateCustomer':
        if (!customerId) {
          return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }
        await updateCustomerCLV(customerId);
        return NextResponse.json({ success: true });

      case 'updateAll':
        const updated = await updateAllCustomerCLV(userData.business_id);
        return NextResponse.json({ success: true, updated });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/customers/clv' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CLV action failed' }, { status: 500 });
  }
}
