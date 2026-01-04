// =====================================================
// RECEIPTS API
// GET /api/receipts - Get receipts with filters
// POST /api/receipts - Create a new receipt
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getReceipts, createReceipt } from '@/lib/receipts';
import { isFeatureEnabled } from '@/lib/features';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jobId = searchParams.get('jobId');
    const category = searchParams.get('category');
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Technicians can only see their own receipts
    const targetUserId =
      profile.role === 'technician' ? profile.id : userId || undefined;

    const receipts = await getReceipts({
      businessId: profile.business_id,
      userId: targetUserId,
      jobId: jobId || undefined,
      category: category || undefined,
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({ receipts });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching receipts' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { imageUrl, amount, vendor, category, description, jobId, receiptDate } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const receipt = await createReceipt(profile.id, profile.business_id, {
      imageUrl,
      amount: amount ? parseFloat(amount) : undefined,
      vendor,
      category,
      description,
      jobId,
      receiptDate: receiptDate ? new Date(receiptDate) : undefined,
    });

    return NextResponse.json({ receipt });
  } catch (error) {
    apiLogger.error({ error, context: 'creating receipt' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create receipt' },
      { status: 500 }
    );
  }
}
