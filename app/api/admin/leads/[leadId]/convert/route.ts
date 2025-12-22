// =====================================================
// ADMIN LEAD CONVERSION API
// POST /api/admin/leads/:leadId/convert
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLead, convertLead } from '@/lib/admin/leads';
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

    // Agents can only convert their own leads
    if (!['super_admin', 'admin'].includes(auth.user.role)) {
      if (lead.agent_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { account_type, account_id } = body;

    if (!account_type || !account_id) {
      return NextResponse.json(
        { error: 'account_type and account_id are required' },
        { status: 400 }
      );
    }

    if (!['crm', 'web'].includes(account_type)) {
      return NextResponse.json(
        { error: 'account_type must be crm or web' },
        { status: 400 }
      );
    }

    const updatedLead = await convertLead(leadId, account_type, account_id);

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error('Convert lead error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert lead' },
      { status: 500 }
    );
  }
}
