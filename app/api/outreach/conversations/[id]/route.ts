import { NextRequest, NextResponse } from 'next/server';
import {
  getConversationWithMessages,
  takeOverConversation,
  closeConversation,
} from '@/lib/outreach/sms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/outreach/conversations/[id]
 * Get a conversation with messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data = await getConversationWithMessages(id);

    if (!data) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/outreach/conversations/[id]
 * Update a conversation (takeover, close)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'takeover': {
        const success = await takeOverConversation(
          id,
          data.agent_id,
          data.reason
        );

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to takeover conversation' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case 'close': {
        const success = await closeConversation(id, data.status);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to close conversation' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
