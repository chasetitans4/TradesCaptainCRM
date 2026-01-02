// =====================================================
// SMS USAGE API
// GET /api/admin/sms-usage - Get SMS usage for portfolio
// =====================================================

import { NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getSmsUsageForAgent } from '@/lib/admin/sms-usage';

export async function GET() {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await getSmsUsageForAgent(admin.id);

    return NextResponse.json(usage);
  } catch (error: any) {
    console.error('Get SMS usage error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SMS usage' },
      { status: 500 }
    );
  }
}
