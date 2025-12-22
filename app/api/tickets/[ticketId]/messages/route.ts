// =====================================================
// TICKET MESSAGES API
// Add messages to tickets
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { addTicketMessage, getTicket } from '@/lib/tickets';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

// POST /api/tickets/[ticketId]/messages - Add a message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const {
      sender_type,
      sender_id,
      sender_name,
      message,
      is_internal = false,
    } = body;

    // Validate required fields
    if (!sender_type || !sender_id || !sender_name || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['customer', 'agent', 'system'].includes(sender_type)) {
      return NextResponse.json(
        { error: 'Invalid sender_type' },
        { status: 400 }
      );
    }

    const ticketMessage = await addTicketMessage(
      ticketId,
      sender_type,
      sender_id,
      sender_name,
      message,
      is_internal
    );

    if (!ticketMessage) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: ticketMessage }, { status: 201 });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

// GET /api/tickets/[ticketId]/messages - Get all messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;

    const ticket = await getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ messages: ticket.messages || [] });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
