// =====================================================
// RECURRING COMMISSIONS API
// GET /api/commissions/recurring
// Get recurring commission data and rate bump tracking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getRecurringCommissions } from '@/lib/admin/commission-tracker';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recurringData = await getRecurringCommissions(admin.id);

    return NextResponse.json(recurringData);
  } catch (error: any) {
    console.error('Error in GET /api/commissions/recurring:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recurring commissions' },
      { status: 500 }
    );
  }
}
