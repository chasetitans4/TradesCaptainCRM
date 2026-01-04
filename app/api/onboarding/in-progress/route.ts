// =====================================================
// ONBOARDING IN PROGRESS API
// GET /api/onboarding/in-progress
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getOnboardingsInProgress } from '@/lib/admin/onboarding';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const onboardings = await getOnboardingsInProgress(auth.id);

    return NextResponse.json({ onboardings });
  } catch (error) {
    apiLogger.error({ message: 'Get onboardings error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch onboardings' },
      { status: 500 }
    );
  }
}
