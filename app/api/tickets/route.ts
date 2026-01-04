// =====================================================
// SUPPORT TICKETS API
// List and create support tickets
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  createTicket,
  getTicketsForBusiness,
  getAllTickets,
  getTicketStats,
} from '@/lib/tickets';
import { CreateTicketInput } from '@/lib/admin/types';
import { apiLogger } from '@/lib/logger';

// GET /api/tickets - Get tickets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const category = searchParams.get('category') || undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;
    const search = searchParams.get('search') || undefined;
    const stats = searchParams.get('stats') === 'true';

    // Return stats only
    if (stats) {
      const ticketStats = await getTicketStats();
      return NextResponse.json(ticketStats);
    }

    // Get tickets for specific business
    if (businessId) {
      const tickets = await getTicketsForBusiness(businessId, {
        status,
        priority,
        category,
      });
      return NextResponse.json({ tickets });
    }

    // Get all tickets (admin view)
    const tickets = await getAllTickets({
      status,
      priority,
      category,
      assigned_to,
      search,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    apiLogger.error({ error, message: 'Error fetching tickets' });
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subject,
      description,
      ai_summary,
      category,
      priority,
      conversation_context,
      page_context,
      // User info (should come from auth in production)
      user_id,
      user_name,
      user_email,
      business_id,
      business_name,
    } = body;

    // Validate required fields
    if (!subject || !description || !ai_summary || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, description, ai_summary, category' },
        { status: 400 }
      );
    }

    if (!user_id || !user_name || !user_email || !business_id || !business_name) {
      return NextResponse.json(
        { error: 'Missing user information' },
        { status: 400 }
      );
    }

    const input: CreateTicketInput = {
      subject,
      description,
      ai_summary,
      category,
      priority,
      conversation_context,
      page_context,
    };

    const ticket = await createTicket(
      input,
      user_id,
      user_name,
      user_email,
      business_id,
      business_name
    );

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, message: 'Error creating ticket' });
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
