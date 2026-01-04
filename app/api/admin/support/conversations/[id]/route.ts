// =====================================================
// ADMIN SUPPORT - SINGLE CONVERSATION API
// GET /api/admin/support/conversations/[id] - Get conversation details
// PATCH /api/admin/support/conversations/[id] - Update conversation
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher, requireAdminOrHigher } from '@/lib/admin/auth';
import {
  getConversationById,
  getConversationMessages,
  forceEndConversation,
  unblockConversation,
  getAIApiLogs,
} from '@/lib/admin/leads-captain-support';
import { apiLogger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const includeAiLogs = searchParams.get('include_ai_logs') === 'true';

    const conversation = await getConversationById(id);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const messages = await getConversationMessages(id);

    let aiLogs = null;
    if (includeAiLogs) {
      aiLogs = await getAIApiLogs(id);
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages,
        ai_logs: aiLogs,
      },
    });
  } catch (error) {
    apiLogger.error({ msg: 'Error in GET /api/admin/support/conversations/[id]', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    const conversation = await getConversationById(id);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    let success = false;

    switch (action) {
      case 'force_end':
        success = await forceEndConversation(id, body.status || 'completed');
        break;

      case 'unblock':
        if (conversation.state !== 'blocked_spam') {
          return NextResponse.json(
            { error: 'Conversation is not blocked' },
            { status: 400 }
          );
        }
        success = await unblockConversation(id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Action failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      conversation_id: id,
    });
  } catch (error) {
    apiLogger.error({ msg: 'Error in PATCH /api/admin/support/conversations/[id]', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
