// =====================================================
// CLIENT ONBOARDING API
// GET /api/onboarding/clients/:clientId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getClientOnboarding } from '@/lib/admin/onboarding';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;

    const onboarding = await getClientOnboarding(clientId);

    if (!onboarding) {
      return NextResponse.json({ error: 'Onboarding not found' }, { status: 404 });
    }

    return NextResponse.json(onboarding);
  } catch (error) {
    apiLogger.error({ message: 'Get client onboarding error', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch onboarding' },
      { status: 500 }
    );
  }
}
