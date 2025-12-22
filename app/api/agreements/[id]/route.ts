// =====================================================
// AGREEMENT BY ID API
// GET /api/agreements/[id] - Get agreement details
// PATCH /api/agreements/[id] - Update agreement
// DELETE /api/agreements/[id] - Cancel agreement
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getAgreement, updateAgreement, cancelAgreement } from '@/lib/agreements';

export async function GET(
  request: NextRequest,
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
  } catch (error: any) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agreement' },
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
  } catch (error: any) {
    console.error('Error updating agreement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update agreement' },
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
  } catch (error: any) {
    console.error('Error cancelling agreement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel agreement' },
      { status: 500 }
    );
  }
}
