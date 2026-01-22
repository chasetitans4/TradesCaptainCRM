// =====================================================
// APPROVE TIMESHEET API
// POST /api/timesheets/:id/approve - Approve a time entry
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import { approveTimeEntry } from '@/lib/timesheets';
import { apiLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    
    // Determine business ID
    let businessId = session.user.businessId;
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && body.businessId) {
      businessId = body.businessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    // Only admins/owners can approve
    if (session.user.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can approve time entries' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Verify entry belongs to this business
    const { data: entry } = await supabase
      .from('timesheets')
      .select('status')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (!entry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    if (entry.status === 'approved') {
      return NextResponse.json(
        { error: 'Entry is already approved' },
        { status: 400 }
      );
    }

    const updatedEntry = await approveTimeEntry(id, session.user.id);

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in POST /api/timesheets/[id]/approve' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve time entry' },
      { status: 400 }
    );
  }
}
