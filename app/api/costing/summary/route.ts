import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateJobCostSummary,
  getJobCostSummary,
  getProfitabilityReport,
  getTechnicianProfitability,
  getJobTypeProfitability,
  getCostVarianceAnalysis,
} from '@/lib/costing/summary';

// GET /api/costing/summary - Get cost summaries and reports
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
    const jobId = searchParams.get('jobId');
    const report = searchParams.get('report');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get single job cost summary
    if (jobId) {
      const summary = await getJobCostSummary(jobId);
      return NextResponse.json({ summary });
    }

    // Generate reports
    if (report) {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Start date and end date are required for reports' },
          { status: 400 }
        );
      }

      switch (report) {
        case 'profitability':
          const profitReport = await getProfitabilityReport(
            userData.business_id,
            startDate,
            endDate
          );
          return NextResponse.json({ report: profitReport });

        case 'technician':
          const techReport = await getTechnicianProfitability(
            userData.business_id,
            startDate,
            endDate
          );
          return NextResponse.json({ report: techReport });

        case 'jobType':
          const jobTypeReport = await getJobTypeProfitability(
            userData.business_id,
            startDate,
            endDate
          );
          return NextResponse.json({ report: jobTypeReport });

        case 'variance':
          const varianceReport = await getCostVarianceAnalysis(
            userData.business_id,
            startDate,
            endDate
          );
          return NextResponse.json({ report: varianceReport });

        default:
          return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Job ID or report type is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error fetching cost summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/costing/summary - Update job cost summary
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, quotedAmount, invoicedAmount, collectedAmount, estimatedHours } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Update summary with optional revenue/estimate data
    const result = await updateJobCostSummary(jobId, {
      quotedAmount,
      invoicedAmount,
      collectedAmount,
      estimatedHours,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating cost summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
