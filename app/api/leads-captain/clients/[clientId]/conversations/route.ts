// =====================================================
// LEADS CAPTAIN CONVERSATIONS API
// GET /api/leads-captain/clients/:clientId/conversations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getLeadsCaptainConversations } from '@/lib/admin/leads-captain-dashboard';
import { apiLogger } from '@/lib/logger';

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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conversations = await getLeadsCaptainConversations(clientId, limit, offset);

    return NextResponse.json({ conversations });
  } catch (error) {
    apiLogger.error({
      message: 'Leads Captain conversations error',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
