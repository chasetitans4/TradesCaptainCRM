// =====================================================
// NEVERMISS CONVERSATIONS API
// GET /api/nevermiss/clients/:clientId/conversations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getNevermissConversations } from '@/lib/admin/nevermiss-dashboard';

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

    const conversations = await getNevermissConversations(clientId, limit, offset);

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('NeverMiss conversations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
