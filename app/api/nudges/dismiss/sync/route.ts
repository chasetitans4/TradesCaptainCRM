// =====================================================
// NUDGE DISMISSAL SYNC API
// POST /api/nudges/dismiss/sync - Sync dismissals from localStorage
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';

interface DismissalSync {
  nudgeType: string;
  entityType?: string;
  entityId?: string;
  contextKey?: string;
  dismissedAt: string;
  expiresAt?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dismissals } = body as { dismissals: DismissalSync[] };

    if (!Array.isArray(dismissals)) {
      return NextResponse.json(
        { error: 'dismissals must be an array' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Prepare records for upsert
    const records = dismissals.map((d) => ({
      user_id: profile.id,
      nudge_type: d.nudgeType,
      entity_type: d.entityType || null,
      entity_id: d.entityId || null,
      context_key: d.contextKey || null,
      dismissed_at: d.dismissedAt,
      expires_at: d.expiresAt || null,
    }));

    // Batch upsert
    const { error } = await supabase.from('nudge_dismissals').upsert(records, {
      onConflict: 'user_id,nudge_type,entity_type,entity_id,context_key',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error('Error syncing dismissals:', error);
      return NextResponse.json(
        { error: 'Failed to sync dismissals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: records.length,
    });
  } catch (error) {
    console.error('Error in POST /api/nudges/dismiss/sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
