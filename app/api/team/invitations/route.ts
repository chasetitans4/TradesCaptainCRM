// =====================================================
// TEAM INVITATIONS API
// GET /api/team/invitations - List pending invitations
// POST /api/team/invitations - Create new invitation
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createInvitation, getPendingInvitations } from '@/lib/team';
import { hasPermission } from '@/lib/permissions';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!hasPermission(profile.role as any, 'manage_team')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const invitations = await getPendingInvitations(profile.business_id);

    return NextResponse.json({ invitations });
  } catch (error) {
    apiLogger.error({ error, message: 'Error fetching invitations' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (!hasPermission(profile.role as any, 'manage_team')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!role || !['admin', 'technician'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Admins can only invite technicians
    if (profile.role === 'admin' && role === 'admin') {
      return NextResponse.json(
        { error: 'Admins can only invite technicians' },
        { status: 403 }
      );
    }

    const invitation = await createInvitation({
      businessId: profile.business_id,
      email,
      role,
      invitedBy: profile.id,
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    apiLogger.error({ error, message: 'Error creating invitation' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invitation' },
      { status: 400 }
    );
  }
}
