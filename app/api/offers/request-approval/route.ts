// =====================================================
// REQUEST OFFER APPROVAL API
// POST /api/offers/request-approval
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { requestOfferApproval } from '@/lib/admin/offers';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAgentOrHigher();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { code, client_id, justification } = body;

    if (!code || !client_id || !justification) {
      return NextResponse.json(
        { error: 'code, client_id, and justification are required' },
        { status: 400 }
      );
    }

    const result = await requestOfferApproval(
      code,
      auth.id,
      client_id,
      justification
    );

    return NextResponse.json({
      success: true,
      request_id: result.id,
      status: result.status,
      message: 'Approval request submitted. You will be notified when reviewed.',
    });
  } catch (error: any) {
    console.error('Request approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit approval request' },
      { status: 500 }
    );
  }
}
