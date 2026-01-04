// =====================================================
// AGREEMENT BY ID API
// GET /api/agreements/[id] - Get agreement details
// PATCH /api/agreements/[id] - Update agreement
// DELETE /api/agreements/[id] - Cancel agreement
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getAgreement, updateAgreement, cancelAgreement } from '@/lib/agreements';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const agreement = await getAgreement(id);

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    return NextResponse.json(agreement);
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching agreement' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agreement' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const agreement = await updateAgreement(id, {
      name: body.name,
      price: body.price,
      frequency: body.frequency,
      description: body.description,
      terms: body.terms,
      autoRenew: body.autoRenew,
      reminderDays: body.reminderDays,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });

    return NextResponse.json(agreement);
  } catch (error) {
    apiLogger.error({ error, context: 'Error updating agreement' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agreement' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    await cancelAgreement(id, body.reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error cancelling agreement' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel agreement' },
      { status: 500 }
    );
  }
}
