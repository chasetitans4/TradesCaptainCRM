// =====================================================
// PENDING COMMISSIONS API
// GET /api/commissions/pending
// Get pending commissions and clawback risks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPendingCommissions } from '@/lib/admin/commission-tracker';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingData = await getPendingCommissions(admin.id);

    return NextResponse.json(pendingData);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/commissions/pending' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get pending commissions' },
      { status: 500 }
    );
  }
}
