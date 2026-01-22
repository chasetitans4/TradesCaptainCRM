// =====================================================
// ONBOARDING TEMPLATE API
// GET /api/onboarding/templates/:track
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/permissions/check-permission';
import { getOnboardingTemplate } from '@/lib/admin/onboarding';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ track: string }> }
) {
  try {
    await checkPermission('view_onboarding');

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
