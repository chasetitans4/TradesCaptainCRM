// =====================================================
// PENDING COMMISSIONS API
// GET /api/commissions/pending
// Get pending commissions and clawback risks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPendingCommissions } from '@/lib/admin/commission-tracker';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingData = await getPendingCommissions(admin.id);

    return NextResponse.json(pendingData);
  } catch (error: any) {
    console.error('Error in GET /api/commissions/pending:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get pending commissions' },
      { status: 500 }
    );
  }
}
