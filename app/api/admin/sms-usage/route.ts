// =====================================================
// SMS USAGE API
// GET /api/admin/sms-usage - Get SMS usage for portfolio
// =====================================================

import { NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getSmsUsageForAgent } from '@/lib/admin/sms-usage';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await getSmsUsageForAgent(admin.id);

    return NextResponse.json(usage);
  } catch (error) {
    apiLogger.error({ msg: 'Get SMS usage error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch SMS usage' },
      { status: 500 }
    );
  }
}
