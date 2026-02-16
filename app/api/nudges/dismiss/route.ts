// =====================================================
// NUDGE DISMISSAL API
// GET /api/nudges/dismiss - Get user's dismissals
// POST /api/nudges/dismiss - Dismiss a nudge
// DELETE /api/nudges/dismiss - Clear a dismissal
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: dismissals, error } = await supabase
      .from('nudge_dismissals')
      .select('*')
      .eq('user_id', profile.id)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (error) {
      console.error('Error fetching dismissals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dismissals' },
        { status: 500 }
      );
    }

    return NextResponse.json(dismissals || []);
  } catch (error) {
    console.error('Error in GET /api/nudges/dismiss:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nudgeType, entityType, entityId, contextKey, expiresAt } = body;

    if (!nudgeType) {
      return NextResponse.json(
        { error: 'nudgeType is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('nudge_dismissals')
      .upsert(
        {
          user_id: profile.id,
          nudge_type: nudgeType,
          entity_type: entityType || null,
          entity_id: entityId || null,
          context_key: contextKey || null,
          dismissed_at: new Date().toISOString(),
          expires_at: expiresAt || null,
        },
        {
          onConflict: 'user_id,nudge_type,entity_type,entity_id,context_key',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error creating dismissal:', error);
      return NextResponse.json(
        { error: 'Failed to dismiss nudge' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/nudges/dismiss:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nudgeType = searchParams.get('nudgeType');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!nudgeType) {
      return NextResponse.json(
        { error: 'nudgeType is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let query = supabase
      .from('nudge_dismissals')
      .delete()
      .eq('user_id', profile.id)
      .eq('nudge_type', nudgeType);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting dismissal:', error);
      return NextResponse.json(
        { error: 'Failed to clear dismissal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/nudges/dismiss:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
