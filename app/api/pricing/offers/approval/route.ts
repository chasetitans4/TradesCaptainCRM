// =====================================================
// OFFER APPROVAL API
// POST /api/pricing/offers/approval - Create approval request
// GET /api/pricing/offers/approval - Get pending approvals
// PATCH /api/pricing/offers/approval - Approve/Deny request
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  createApprovalRequest,
  getPendingApprovalRequests,
  getApprovalRequest,
  approveRequest,
  denyRequest,
  getOfferByCode,
} from '@/lib/pricing/offers';
import { getPlanById } from '@/lib/pricing/plans';
import { apiLogger } from '@/lib/logger';

// POST - Create approval request (for VIP20 etc)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      offer_code,
      agent_id,
      agent_name,
      customer_name,
      customer_email,
      plan_id,
      reason,
    } = body;

    // Validate offer exists and requires approval
    const offer = getOfferByCode(offer_code);
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (!offer.requires_approval) {
      return NextResponse.json(
        { error: 'This offer does not require approval' },
        { status: 400 }
      );
    }

    // Validate plan
    const plan = getPlanById(plan_id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Calculate discount
    const original_price = plan.monthly_price;
    const discount_percent = offer.discount_value;
    const discounted_price = original_price * (1 - discount_percent / 100);
    const discount_amount = original_price - discounted_price;

    const approvalRequest = await createApprovalRequest({
      offer_id: offer.id,
      offer_code: offer.code,
      agent_id,
      agent_name,
      customer_name,
      customer_email,
      plan_id,
      plan_name: plan.name,
      original_price,
      discounted_price: Math.round(discounted_price * 100) / 100,
      discount_amount: Math.round(discount_amount * 100) / 100,
      reason,
    });

    return NextResponse.json({ approval_request: approvalRequest }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, context: 'Error creating approval request' });
    return NextResponse.json(
      { error: 'Failed to create approval request' },
      { status: 500 }
    );
  }
}

// GET - Get pending approvals (for managers)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');

    if (requestId) {
      const approvalRequest = await getApprovalRequest(requestId);
      if (!approvalRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }
      return NextResponse.json({ approval_request: approvalRequest });
    }

    const pendingRequests = await getPendingApprovalRequests();
    return NextResponse.json({ pending_requests: pendingRequests });
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching approval requests' });
    return NextResponse.json(
      { error: 'Failed to fetch approval requests' },
      { status: 500 }
    );
  }
}

// PATCH - Approve or deny request
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { request_id, action, reviewed_by, notes } = body;

    if (!request_id || !action || !reviewed_by) {
      return NextResponse.json(
        { error: 'request_id, action, and reviewed_by are required' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json(
        { error: 'Action must be "approve" or "deny"' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'approve') {
      result = await approveRequest(request_id, reviewed_by, notes);
    } else {
      result = await denyRequest(request_id, reviewed_by, notes);
    }

    if (!result) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ approval_request: result });
  } catch (error) {
    apiLogger.error({ error, context: 'Error updating approval request' });
    return NextResponse.json(
      { error: 'Failed to update approval request' },
      { status: 500 }
    );
  }
}
