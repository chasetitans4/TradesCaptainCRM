// =====================================================
// ADMIN TICKET DETAIL API
// Get and update a specific ticket
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/tickets/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Verify Admin Auth
    const auth = await verifyAdminAuth(_request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Create Admin Client
    const supabase = createAdminClient();

    // 3. Fetch Ticket with Messages
    // Note: We need to check if 'messages' alias is correct in the schema or if it's 'ticket_messages'
    // The previous library code used `messages:ticket_messages(*)`.
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        messages:ticket_messages(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // 4. Sort messages (older first usually makes sense for reading flow, but UI might expect newer first)
    // Library sorted by created_at ascending (oldest first).
    if (ticket.messages) {
      ticket.messages.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return NextResponse.json({ ticket });
  } catch (error: any) {
    apiLogger.error({ error, message: 'Error fetching admin ticket' });
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tickets/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Verify Admin Auth
    const auth = await verifyAdminAuth(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Fields we allow updating
    const { 
      status, 
      priority, 
      category, 
      assigned_to, 
      resolution_notes,
      ai_summary 
    } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    if (assigned_to) {
        updates.assigned_to = assigned_to;
        updates.assigned_at = new Date().toISOString();
    }
    if (resolution_notes) updates.resolution_notes = resolution_notes;
    if (ai_summary) updates.ai_summary = ai_summary;

    // If resolving/closing, set resolved_at/by
    if (status === 'resolved' || status === 'closed') {
        if (!updates.resolved_at) updates.resolved_at = new Date().toISOString();
        if (!updates.resolved_by) updates.resolved_by = auth.user?.id; 
    }

    // 2. Create Admin Client
    const supabase = createAdminClient();

    // 3. Update
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ ticket });

  } catch (error: any) {
    apiLogger.error({ error, message: 'Error updating admin ticket' });
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
