// =====================================================
// ADMIN RETENTION TRACKING API
// GET /api/admin/retention
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getRetentionTasks } from '@/lib/admin/commissions';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Non-management roles can only see their own retention tasks
    const agentId = ['super_admin', 'admin', 'finance'].includes(auth.user.role)
      ? undefined
      : auth.user.id;

    const tasks = await getRetentionTasks(agentId);

    return NextResponse.json({ tasks });
  } catch (error) {
    apiLogger.error({ msg: 'Get retention tasks error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get retention tasks' },
      { status: 500 }
    );
  }
}
