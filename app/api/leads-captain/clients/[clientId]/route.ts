// =====================================================
// LEADS CAPTAIN CLIENT DETAIL API
// GET /api/leads-captain/clients/:clientId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getLeadsCaptainClientDetail } from '@/lib/admin/leads-captain-dashboard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;

    const detail = await getLeadsCaptainClientDetail(clientId);

    if (!detail) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(detail);
  } catch (error: any) {
    console.error('Leads Captain client detail error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch client detail' },
      { status: 500 }
    );
  }
}
