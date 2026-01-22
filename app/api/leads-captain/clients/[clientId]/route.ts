// =====================================================
// LEADS CAPTAIN CLIENT DETAIL API
// GET /api/leads-captain/clients/:clientId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/permissions/check-permission';
import { getLeadsCaptainClientDetail } from '@/lib/admin/leads-captain-dashboard';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await checkPermission('view_leads_captain');

    const { clientId } = await params;

    const detail = await getLeadsCaptainClientDetail(clientId);

    if (!detail) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(detail);
  } catch (error) {
    apiLogger.error({
      message: 'Leads Captain client detail error',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch client detail' },
      { status: 500 }
    );
  }
}
