// =====================================================
// TRANSFER OWNERSHIP API
// POST /api/team/transfer-ownership
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { transferOwnership } from '@/lib/team';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can transfer ownership
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can transfer ownership' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { new_owner_id } = body;

    if (!new_owner_id) {
      return NextResponse.json(
        { error: 'New owner ID is required' },
        { status: 400 }
      );
    }

    if (new_owner_id === profile.id) {
      return NextResponse.json(
        { error: 'Cannot transfer ownership to yourself' },
        { status: 400 }
      );
    }

    await transferOwnership(profile.id, new_owner_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, message: 'Error transferring ownership' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transfer ownership' },
      { status: 400 }
    );
  }
}
