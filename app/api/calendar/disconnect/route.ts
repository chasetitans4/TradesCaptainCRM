// =====================================================
// CALENDAR DISCONNECT
// POST /api/calendar/disconnect
// =====================================================

import { NextResponse } from 'next/server';
import { revokeGrant } from '@/lib/nylas';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function POST() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get existing connection
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('nylas_grant_id')
      .eq('user_id', profile.id)
      .single();

    if (connection?.nylas_grant_id) {
      // Revoke the Nylas grant
      await revokeGrant(connection.nylas_grant_id);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', profile.id);

    if (deleteError) {
      apiLogger.error({ error: deleteError, context: 'Error deleting calendar connection' });
      return NextResponse.json(
        { error: 'Failed to disconnect calendar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error disconnecting calendar' });
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}
