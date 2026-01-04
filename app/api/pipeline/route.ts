// =====================================================
// PIPELINE API
// GET /api/pipeline - Get pipeline overview
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPipelineOverview } from '@/lib/admin/pipeline';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pipeline = await getPipelineOverview(admin.id);

    return NextResponse.json(pipeline);
  } catch (error) {
    apiLogger.error({ error, context: 'Pipeline overview error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pipeline' },
      { status: 500 }
    );
  }
}
