// =====================================================
// CALENDAR CONNECTION STATUS
// GET /api/calendar/connection
// =====================================================

import { NextResponse } from 'next/server';
import { getCalendarConnection } from '@/lib/nylas';
import { getServerUserProfile } from '@/lib/supabase/server';
import { CALENDAR_PROVIDERS } from '@/lib/nylas';

export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getCalendarConnection(profile.id);

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
      });
    }

    // Add provider display name
    const providerInfo =
      CALENDAR_PROVIDERS[connection.provider as keyof typeof CALENDAR_PROVIDERS];

    return NextResponse.json({
      connected: true,
      connection: {
        ...connection,
        provider_name: providerInfo?.name || connection.provider,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar connection' },
      { status: 500 }
    );
  }
}
