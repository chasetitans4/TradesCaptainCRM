// =====================================================
// RESEND INVITATION API
// POST /api/team/invitations/[id]/resend
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { resendInvitation } from '@/lib/team';
import { hasPermission } from '@/lib/permissions';
import { apiLogger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!hasPermission(profile.role as any, 'manage_team')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;
    await resendInvitation(id, profile.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, message: 'Error resending invitation' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend invitation' },
      { status: 400 }
    );
  }
}
