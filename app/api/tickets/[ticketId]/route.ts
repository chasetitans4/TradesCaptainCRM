// =====================================================
// SINGLE TICKET API
// Get, update, and manage individual tickets
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getTicket,
  getTicketByNumber,
  updateTicket,
} from '@/lib/tickets';
import { UpdateTicketInput } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

// GET /api/tickets/[ticketId] - Get ticket details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;

    // Check if looking up by ticket number (starts with TC-)
    let ticket;
    if (ticketId.startsWith('TC-')) {
      ticket = await getTicketByNumber(ticketId);
    } else {
      ticket = await getTicket(ticketId);
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    apiLogger.error({ error, message: 'Error fetching ticket' });
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[ticketId] - Update ticket
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const { status, priority, category, assigned_to, resolution_notes, updated_by } = body;

    const updates: UpdateTicketInput = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    if (assigned_to) updates.assigned_to = assigned_to;
    if (resolution_notes) updates.resolution_notes = resolution_notes;

    const ticket = await updateTicket(ticketId, updates, updated_by);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    apiLogger.error({ error, message: 'Error updating ticket' });
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
