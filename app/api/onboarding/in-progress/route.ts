// =====================================================
// ONBOARDING IN PROGRESS API
// GET /api/onboarding/in-progress
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { getOnboardingsInProgress } from '@/lib/admin/onboarding';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    await checkPermission('view_onboarding');
    const session = await getServerSession();

    const onboardings = await getOnboardingsInProgress(session!.user.id);

    return NextResponse.json({ onboardings });
  } catch (error) {
    apiLogger.error({ message: 'Get onboardings error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch onboardings' },
      { status: 500 }
    );
  }
}
