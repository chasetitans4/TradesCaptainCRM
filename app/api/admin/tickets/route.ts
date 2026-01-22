// =====================================================
// ADMIN TICKETS API
// List all support tickets for admin portal
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Admin Auth
    const auth = await verifyAdminAuth(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse Query Params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const category = searchParams.get('category') || undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;
    const search = searchParams.get('search') || undefined;
    const stats = searchParams.get('stats') === 'true';

    // 3. Create Admin Client (Bypass RLS)
    const supabase = createAdminClient();

    // 4. Handle Stats Request
    if (stats) {
      // Fetch minimal data for stats calculation
      const { data: allTickets, error } = await supabase
        .from('support_tickets')
        .select('status, created_at, first_response_at, resolved_at');

      if (error) throw error;

      let total = 0;
      let open = 0;
      let in_progress = 0;
      let waiting_on_customer = 0;
      let resolved = 0;
      let closed = 0;
      let totalResponseTime = 0;
      let responseCount = 0;
      let totalResolutionTime = 0;
      let resolutionCount = 0;

      for (const ticket of (allTickets || [])) {
        total++;
        switch (ticket.status) {
          case 'open':
            open++;
            break;
          case 'in_progress':
            in_progress++;
            break;
          case 'waiting_on_customer':
            waiting_on_customer++;
            break;
          case 'resolved':
            resolved++;
            break;
          case 'closed':
            closed++;
            break;
        }

        if (ticket.first_response_at) {
          const created = new Date(ticket.created_at).getTime();
          const firstResponse = new Date(ticket.first_response_at).getTime();
          totalResponseTime += (firstResponse - created) / (1000 * 60 * 60);
          responseCount++;
        }

        if (ticket.resolved_at) {
          const created = new Date(ticket.created_at).getTime();
          const resolved = new Date(ticket.resolved_at).getTime();
          totalResolutionTime += (resolved - created) / (1000 * 60 * 60);
          resolutionCount++;
        }
      }

      return NextResponse.json({
        total,
        open,
        in_progress,
        waiting_on_customer,
        resolved,
        closed,
        avg_response_time_hours: responseCount > 0 ? totalResponseTime / responseCount : 0,
        avg_resolution_time_hours: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
      });
    }

    // 5. Build List Query
    let query = supabase
      .from('support_tickets')
      .select('*');

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (category) query = query.eq('category', category);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    
    if (search) {
      // Simple OR search across text fields
      query = query.or(`subject.ilike.%${search}%,description.ilike.%${search}%,ticket_number.ilike.%${search}%,user_name.ilike.%${search}%,business_name.ilike.%${search}%`);
    }

    // 5. Execute
    const { data: tickets, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ tickets });
  } catch (error: any) {
    apiLogger.error({ error, message: 'Error fetching admin tickets' });
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
