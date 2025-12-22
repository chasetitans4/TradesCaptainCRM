// =====================================================
// ADMIN LEAD REASSIGNMENT API
// POST /api/admin/leads/:leadId/reassign
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLead, reassignLead } from '@/lib/admin/leads';
import { verifyAdminAuth } from '@/lib/admin/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.valid || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reassign leads
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leadId } = await params;
    const lead = await getLead(leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const body = await request.json();
    const { to_agent_id, reason, notes, notify_new_agent, notify_old_agent } = body;

    if (!to_agent_id || !reason) {
      return NextResponse.json(
        { error: 'to_agent_id and reason are required' },
        { status: 400 }
      );
    }

    const updatedLead = await reassignLead(leadId, {
      to_agent_id,
      reason,
      notes,
      notify_new_agent,
      notify_old_agent,
    }, auth.user.id);

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error('Reassign lead error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reassign lead' },
      { status: 500 }
    );
  }
}
