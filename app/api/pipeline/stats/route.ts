// =====================================================
// PIPELINE STATS API
// GET /api/pipeline/stats
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPipelineStats } from '@/lib/admin/pipeline';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getPipelineStats(admin.id);

    return NextResponse.json({ stats });
  } catch (error) {
    apiLogger.error({ error, context: 'Pipeline stats error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
