// =====================================================
// EXTEND TRIAL API
// POST /api/admin/accounts/:id/extend-trial
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrHigher } from '@/lib/admin/auth';
import { extendTrial, logAdminActivity } from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const days = body.days || 7;

    const account = await extendTrial(id, days);

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || '';
    await logAdminActivity(admin.id, 'extended_trial', 'crm_account', id, { days }, ip);

    return NextResponse.json({ account });
  } catch (error) {
    apiLogger.error({
      msg: 'Error extending trial',
      path: '/api/admin/accounts/[id]/extend-trial',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extend trial' },
      { status: 400 }
    );
  }
}
