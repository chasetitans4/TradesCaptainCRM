// =====================================================
// RECURRING COMMISSIONS API
// GET /api/commissions/recurring
// Get recurring commission data and rate bump tracking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getRecurringCommissions } from '@/lib/admin/commission-tracker';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recurringData = await getRecurringCommissions(admin.id);

    return NextResponse.json(recurringData);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/commissions/recurring' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get recurring commissions' },
      { status: 500 }
    );
  }
}
