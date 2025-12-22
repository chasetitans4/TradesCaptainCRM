// =====================================================
// SINGLE RECEIPT API
// GET /api/receipts/[id] - Get receipt
// PUT /api/receipts/[id] - Update receipt
// DELETE /api/receipts/[id] - Delete receipt
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getReceipt, updateReceipt, deleteReceipt, reviewReceipt } from '@/lib/receipts';
import { isFeatureEnabled } from '@/lib/features';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if receipts feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'receipts_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Receipts feature is not enabled' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const receipt = await getReceipt(id);

    if (!receipt || receipt.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // Technicians can only see their own receipts
    if (profile.role === 'technician' && receipt.user_id !== profile.id) {
      return NextResponse.json(
        { error: 'You can only view your own receipts' },
        { status: 403 }
      );
    }

    return NextResponse.json({ receipt });
  } catch (error: any) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if receipts feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'receipts_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Receipts feature is not enabled' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const receipt = await getReceipt(id);

    if (!receipt || receipt.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const body = await request.json();

    // Handle approval/rejection
    if (body.action === 'approve' || body.action === 'reject') {
      // Only admins/owners can approve/reject
      if (profile.role === 'technician') {
        return NextResponse.json(
          { error: 'Only administrators can approve or reject receipts' },
          { status: 403 }
        );
      }

      const status = body.action === 'approve' ? 'approved' : 'rejected';
      const updatedReceipt = await reviewReceipt(id, status, profile.id);
      return NextResponse.json({ receipt: updatedReceipt });
    }

    // Regular update - technicians can only edit their own pending receipts
    if (profile.role === 'technician') {
      if (receipt.user_id !== profile.id) {
        return NextResponse.json(
          { error: 'You can only edit your own receipts' },
          { status: 403 }
        );
      }
      if (receipt.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot edit a receipt that has been reviewed' },
          { status: 403 }
        );
      }
    }

    const { amount, vendor, category, description, jobId, receiptDate } = body;

    const updatedReceipt = await updateReceipt(id, {
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      vendor,
      category,
      description,
      jobId,
      receiptDate: receiptDate ? new Date(receiptDate) : undefined,
    });

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error: any) {
    console.error('Error updating receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update receipt' },
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

    // Check if receipts feature is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'receipts_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Receipts feature is not enabled' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const receipt = await getReceipt(id);

    if (!receipt || receipt.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // Technicians can only delete their own pending receipts
    if (profile.role === 'technician') {
      if (receipt.user_id !== profile.id) {
        return NextResponse.json(
          { error: 'You can only delete your own receipts' },
          { status: 403 }
        );
      }
      if (receipt.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot delete a receipt that has been reviewed' },
          { status: 403 }
        );
      }
    }

    await deleteReceipt(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}
