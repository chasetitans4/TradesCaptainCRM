import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  getActiveSessionCount,
} from '@/lib/auth/sessions';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

// GET - Get user's active sessions
export async function GET() {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await getUserSessions(session.user.id);
    const count = await getActiveSessionCount(session.user.id);

    return NextResponse.json({
      sessions,
      totalCount: count,
    });
  } catch (error) {
    apiLogger.error({ msg: 'Get sessions error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE - Revoke session(s)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, all } = await request.json();

    if (all) {
      // Revoke all sessions except current
      // In production, get the session token from cookies
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session_token')?.value;

      if (!sessionToken) {
        // If no custom session token, just revoke all sessions by ID
        // Get current session somehow (e.g., from Supabase session)
        return NextResponse.json(
          {
            error:
              'Session token not found. Cannot determine current session.',
          },
          { status: 400 }
        );
      }

      const count = await revokeAllOtherSessions(session.user.id, sessionToken);
      return NextResponse.json({
        success: true,
        revokedCount: count,
      });
    } else if (sessionId) {
      await revokeSession(session.user.id, sessionId);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Missing sessionId or all flag' },
        { status: 400 }
      );
    }
  } catch (error) {
    apiLogger.error({ msg: 'Revoke session error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
