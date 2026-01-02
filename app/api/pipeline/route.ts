// =====================================================
// PIPELINE API
// GET /api/pipeline - Get pipeline overview
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getPipelineOverview } from '@/lib/admin/pipeline';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pipeline = await getPipelineOverview(admin.id);

    return NextResponse.json(pipeline);
  } catch (error: any) {
    console.error('Pipeline overview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pipeline' },
      { status: 500 }
    );
  }
}
