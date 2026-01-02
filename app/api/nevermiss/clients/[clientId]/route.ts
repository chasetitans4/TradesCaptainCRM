// =====================================================
// NEVERMISS CLIENT DETAIL API
// GET /api/nevermiss/clients/:clientId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getNevermissClientDetail } from '@/lib/admin/nevermiss-dashboard';

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

    const detail = await getNevermissClientDetail(clientId);

    if (!detail) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(detail);
  } catch (error: any) {
    console.error('NeverMiss client detail error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch client detail' },
      { status: 500 }
    );
  }
}
