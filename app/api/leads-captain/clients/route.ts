// =====================================================
// LEADS CAPTAIN CLIENTS API
// GET /api/leads-captain/clients
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { getLeadsCaptainClients } from '@/lib/admin/leads-captain-dashboard';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_leads_captain');
    const session = await getServerSession();
    const userId = session!.user.id;

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') as 'all' | 'near_cap' | 'over_cap' | 'low_usage' | 'healthy' | null;

    const clients = await getLeadsCaptainClients(userId, filter || 'all');

    return NextResponse.json({ clients });
  } catch (error) {
    apiLogger.error({
      message: 'Leads Captain clients error',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
