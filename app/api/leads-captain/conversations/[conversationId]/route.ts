// =====================================================
// LEADS CAPTAIN SINGLE CONVERSATION API
// GET /api/leads-captain/conversations/:conversationId
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/permissions/check-permission';
import { getLeadsCaptainConversation } from '@/lib/admin/leads-captain-dashboard';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    await checkPermission('view_leads_captain');

    const { conversationId } = await params;

    const conversation = await getLeadsCaptainConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    apiLogger.error({
      message: 'Leads Captain conversation error',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
