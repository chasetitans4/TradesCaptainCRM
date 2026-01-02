// =====================================================
// CLIENT SMS USAGE API
// GET /api/admin/sms-usage/clients/[clientId] - Get history
// PATCH /api/admin/sms-usage/clients/[clientId] - Update cap
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getClientSmsHistory, updateClientSmsCap } from '@/lib/admin/sms-usage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6');

    const history = await getClientSmsHistory(clientId, months);

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Get SMS history error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SMS history' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await request.json();

    const { soft_cap } = body;

    if (!soft_cap || soft_cap < 100) {
      return NextResponse.json(
        { error: 'soft_cap must be at least 100' },
        { status: 400 }
      );
    }

    await updateClientSmsCap(clientId, soft_cap);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update SMS cap error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update SMS cap' },
      { status: 500 }
    );
  }
}
