// =====================================================
// PERFORMANCE REPORT API
// GET /api/admin/reports/performance - Get agent performance
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, hasServerPermission, getServerSession } from '@/lib/permissions/check-permission';
import { getPerformanceReport } from '@/lib/admin/reports';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check permission - agents can view reports (their own), admins can view all
    const hasPermission = await hasServerPermission('view_reports');
    const session = await getServerSession();

    if (!hasPermission || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'this_month') as
      | 'this_month'
      | 'last_month'
      | 'this_quarter'
      | 'this_year';
    
    const requestedAgentId = searchParams.get('agentId');

    // Role-based data access
    const userRole = session.user.role;
    const canViewOthers = ['super_admin', 'admin', 'finance', 'manager'].includes(userRole);
    
    // If user can view others and requested an agent ID, use it.
    // Otherwise, force their own ID.
    const effectiveAgentId = (canViewOthers && requestedAgentId) 
      ? requestedAgentId 
      : session.user.id;

    const report = await getPerformanceReport(effectiveAgentId, period);

    return NextResponse.json(report);
  } catch (error) {
    apiLogger.error({
      msg: 'Get performance report error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch performance report' },
      { status: 500 }
    );
  }
}
