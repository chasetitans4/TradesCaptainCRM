// =====================================================
// TEAM MEMBER API
// GET /api/team/members/[id] - Get member details
// PUT /api/team/members/[id] - Update member (role)
// DELETE /api/team/members/[id] - Deactivate member
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getTeamMember, updateMemberRole, deactivateMember } from '@/lib/team';
import { hasPermission } from '@/lib/permissions';

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
    const member = await getTeamMember(id, profile.id);

    return NextResponse.json({ member });
  } catch (error: any) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch member' },
      { status: 400 }
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

    // Check permission
    if (!hasPermission(profile.role as any, 'manage_team')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'technician'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await updateMemberRole(id, role, profile.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member' },
      { status: 400 }
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

    // Check permission
    if (!hasPermission(profile.role as any, 'manage_team')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { id } = await params;

    // Cannot deactivate yourself
    if (id === profile.id) {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    await deactivateMember(id, profile.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deactivating member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate member' },
      { status: 400 }
    );
  }
}
