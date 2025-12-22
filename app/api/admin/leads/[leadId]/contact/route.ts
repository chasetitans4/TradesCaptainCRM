// =====================================================
// ADMIN LEAD CONTACT LOG API
// POST /api/admin/leads/:leadId/contact
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLead, logLeadContact } from '@/lib/admin/leads';
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

    const { leadId } = await params;
    const lead = await getLead(leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Agents can only log contact for their own leads
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      if (lead.agent_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { contact_type, notes, next_followup_at } = body;

    if (!contact_type) {
      return NextResponse.json(
        { error: 'contact_type is required' },
        { status: 400 }
      );
    }

    await logLeadContact(leadId, auth.user.id, contact_type, notes, next_followup_at);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Log lead contact error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log contact' },
      { status: 500 }
    );
  }
}
