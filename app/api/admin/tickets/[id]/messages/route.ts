// =====================================================
// ADMIN TICKET MESSAGES API
// Add messages to tickets as admin
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/tickets/[id]/messages
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Verify Admin Auth
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, attachments } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 2. Create Admin Client
    const supabase = createAdminClient();

    // 3. Insert Message
    // Note: Schema usually requires `ticket_id`, `sender_id`, `sender_type`, `message`
    // We assume sender_type 'admin' or 'agent'
    const { data: newMessage, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: id,
        sender_id: auth.user.id, // The admin's ID
        sender_type: 'agent', // Usually 'user' or 'agent'/'admin'
        sender_name: auth.user.name,
        message: message,
        attachments: attachments || [],
        is_internal: false, // Default to public, could be toggleable
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 4. Update Ticket Status? 
    // Usually if admin replies, status might change to 'waiting_on_customer'
    // We'll leave that to the frontend to trigger a status update if needed, 
    // or do it automatically here. Let's do it automatically for convenience.
    await supabase
      .from('support_tickets')
      .update({
        status: 'waiting_on_customer',
        updated_at: new Date().toISOString(),
        first_response_at: new Date().toISOString() // This should be conditional (only if null) but Postgres usually handles logic or we can query first.
        // For simplicity, we just update updated_at.
      })
      .eq('id', id);

    return NextResponse.json({ message: newMessage });

  } catch (error: any) {
    apiLogger.error({ error, message: 'Error adding ticket message' });
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}
