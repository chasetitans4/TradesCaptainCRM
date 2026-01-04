// =====================================================
// TEAM MEMBERS API
// GET /api/team/members - List team members
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getTeamMembers } from '@/lib/team';
import { apiLogger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // All roles can view team members
    const members = await getTeamMembers(profile.business_id);

    return NextResponse.json({ members });
  } catch (error) {
    apiLogger.error({ error, message: 'Error fetching team members' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
