// =====================================================
// ONBOARDING TEMPLATE API
// GET /api/onboarding/templates/:track
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getOnboardingTemplate } from '@/lib/admin/onboarding';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ track: string }> }
) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { track } = await params;

    const templates = await getOnboardingTemplate(track);

    return NextResponse.json({ templates });
  } catch (error) {
    apiLogger.error({ message: 'Get template error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch template' },
      { status: 500 }
    );
  }
}
