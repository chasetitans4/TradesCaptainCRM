// =====================================================
// TICKET SUMMARIZATION API
// AI-powered issue summarization for ticket creation
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { summarizeIssue } from '@/lib/tickets';
import { apiLogger } from '@/lib/logger';

// POST /api/tickets/summarize - Generate AI summary for ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_history, current_page } = body;

    if (!conversation_history || !Array.isArray(conversation_history)) {
      return NextResponse.json(
        { error: 'conversation_history is required and must be an array' },
        { status: 400 }
      );
    }

    if (conversation_history.length === 0) {
      return NextResponse.json(
        { error: 'conversation_history cannot be empty' },
        { status: 400 }
      );
    }

    const summary = await summarizeIssue(conversation_history, current_page);

    return NextResponse.json(summary);
  } catch (error) {
    apiLogger.error({ error, message: 'Error summarizing issue' });
    return NextResponse.json(
      { error: 'Failed to summarize issue' },
      { status: 500 }
    );
  }
}
