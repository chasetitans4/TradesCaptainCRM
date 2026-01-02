// =====================================================
// CLIENT ONBOARDING API
// GET /api/onboarding/clients/:clientId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getClientOnboarding } from '@/lib/admin/onboarding';

export async function GET(
  request: NextRequest,
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
  } catch (error: any) {
    console.error('Get client onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch onboarding' },
      { status: 500 }
    );
  }
}
