// =====================================================
// TEAM INVITATION API
// DELETE /api/team/invitations/[id] - Cancel invitation
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { cancelInvitation } from '@/lib/team';
import { hasPermission } from '@/lib/permissions';

export async function DELETE(
  request: NextRequest,
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
    await cancelInvitation(id, profile.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel invitation' },
      { status: 400 }
    );
  }
}
