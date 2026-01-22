// =====================================================
// PORTAL QUOTE BY ID API
// GET /api/portal/quotes/[id] - Get single quote
// PATCH /api/portal/quotes/[id] - Update quote status (accept/decline)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { checkSimpleRateLimit } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        total,
        subtotal,
        tax,
        valid_until,
        created_at,
        items,
        notes,
        terms,
        job:jobs(id, title, description)
      `)
      .eq('id', id)
      .eq('customer_id', session.customerId)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal quote GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    // Verify portal session
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business ID matches session
    if (businessId && session.businessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 20 quote actions per hour per customer
    const rateLimit = await checkSimpleRateLimit(
      `portal_quote_action:${session.customerId}`,
      20,
      3600
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 3600).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!['accept', 'decline', 'request_changes'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be accept, decline, or request_changes' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify quote exists and belongs to customer
    const { data: existingQuote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status, customer_id, business_id, quote_number')
      .eq('id', id)
      .eq('customer_id', session.customerId)
      .single();

    if (fetchError || !existingQuote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Check if quote can be acted upon
    if (!['sent', 'viewed'].includes(existingQuote.status)) {
      return NextResponse.json(
        { error: 'This quote cannot be modified' },
        { status: 400 }
      );
    }

    // Handle different actions
    if (action === 'accept') {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: 'customer_portal',
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify business
      await notifyQuoteResponse(supabase, existingQuote, 'accepted', session);

      apiLogger.info({
        msg: 'Quote accepted via portal',
        quoteId: id,
        customerId: session.customerId,
      });

      return NextResponse.json({ success: true, status: 'accepted' });
    }

    if (action === 'decline') {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          declined_reason: reason || 'Declined via customer portal',
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify business
      await notifyQuoteResponse(supabase, existingQuote, 'declined', session, reason);

      apiLogger.info({
        msg: 'Quote declined via portal',
        quoteId: id,
        customerId: session.customerId,
        reason,
      });

      return NextResponse.json({ success: true, status: 'declined' });
    }

    if (action === 'request_changes') {
      // Don't change status, just notify business
      await notifyQuoteResponse(supabase, existingQuote, 'changes_requested', session, reason);

      apiLogger.info({
        msg: 'Quote changes requested via portal',
        quoteId: id,
        customerId: session.customerId,
        reason,
      });

      return NextResponse.json({ success: true, status: 'changes_requested' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal quote PATCH error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}

async function notifyQuoteResponse(
  supabase: ReturnType<typeof createAdminClient>,
  quote: { business_id: string; quote_number: string },
  action: 'accepted' | 'declined' | 'changes_requested',
  session: { customerName: string; customerId: string },
  reason?: string
) {
  try {
    // Get business users to notify
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('business_id', quote.business_id)
      .in('role', ['owner', 'admin', 'sales']);

    if (!users?.length) return;

    const actionMessages = {
      accepted: `Quote #${quote.quote_number} has been accepted by ${session.customerName}`,
      declined: `Quote #${quote.quote_number} has been declined by ${session.customerName}${reason ? `: "${reason}"` : ''}`,
      changes_requested: `${session.customerName} requested changes to Quote #${quote.quote_number}${reason ? `: "${reason}"` : ''}`,
    };

    // Create notifications for business users
    await supabase.from('notifications').insert(
      users.map((user) => ({
        user_id: user.id,
        type: 'quote_response',
        title: action === 'accepted' ? 'Quote Accepted!' : action === 'declined' ? 'Quote Declined' : 'Quote Changes Requested',
        message: actionMessages[action],
        data: {
          quote_number: quote.quote_number,
          customer_id: session.customerId,
          action,
          reason,
        },
      }))
    );
  } catch (error) {
    // Log but don't fail the main operation
    apiLogger.error({
      msg: 'Failed to send quote response notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
