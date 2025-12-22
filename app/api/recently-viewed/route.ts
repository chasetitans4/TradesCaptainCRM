// =====================================================
// RECENTLY VIEWED API
// GET /api/recently-viewed - Get recently viewed items
// POST /api/recently-viewed - Record a view
// DELETE /api/recently-viewed - Clear history
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getRecentlyViewed,
  recordView,
  clearRecentlyViewed,
  type EntityType,
} from '@/lib/favorites';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const entityType = searchParams.get('type') as EntityType | null;

    const items = await getRecentlyViewed(
      profile.id,
      limit,
      entityType || undefined
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error in GET /api/recently-viewed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recently viewed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    await recordView(profile.id, entityType, entityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/recently-viewed:', error);
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await clearRecentlyViewed(profile.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/recently-viewed:', error);
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    );
  }
}
