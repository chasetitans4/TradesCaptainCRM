// =====================================================
// ADMIN SUPPORT - CONVERSATION LOGS API
// GET /api/admin/support/conversations - Get conversation logs
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  getConversationLogs,
  getConversationById,
  getConversationMessages,
} from '@/lib/admin/leads-captain-support';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organization_id');
    const conversationId = searchParams.get('conversation_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // If conversation ID is provided, get single conversation with messages
    if (conversationId) {
      const conversation = await getConversationById(conversationId);

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const messages = await getConversationMessages(conversationId);

      return NextResponse.json({
        conversation: {
          ...conversation,
          messages,
        },
      });
    }

    // Otherwise, get list of conversations for organization
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    const { conversations, total } = await getConversationLogs(
      organizationId,
      limit,
      offset
    );

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/support/conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get conversations' },
      { status: 500 }
    );
  }
}
