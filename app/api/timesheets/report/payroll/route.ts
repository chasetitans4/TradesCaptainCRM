// =====================================================
// PAYROLL REPORT API
// GET /api/timesheets/report/payroll - Get payroll data
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPayrollExport } from '@/lib/timesheets';
import { startOfWeek, endOfWeek, parseISO, format } from 'date-fns';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can access payroll
    if (session.user.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can access payroll reports' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const weekOf = searchParams.get('week_of') || new Date().toISOString();

    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
        return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const weekDate = parseISO(weekOf);
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

    const payrollData = await getPayrollExport(
      businessId,
      weekStart,
      weekEnd
    );

    return NextResponse.json({
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      payroll: payrollData,
    });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in GET /api/timesheets/report/payroll' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get payroll report' },
      { status: 500 }
    );
  }
}
