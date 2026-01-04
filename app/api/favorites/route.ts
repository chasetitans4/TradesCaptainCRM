// =====================================================
// FAVORITES API
// GET /api/favorites - Get user's favorites
// POST /api/favorites - Toggle favorite
// DELETE /api/favorites - Remove favorite
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getFavorites,
  toggleFavorite,
  removeFavorite,
  type EntityType,
} from '@/lib/favorites';
import { apiLogger } from '@/lib/logger';

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
    const entityType = searchParams.get('type') as EntityType | null;

    const favorites = await getFavorites(
      profile.id,
      entityType || undefined
    );

    return NextResponse.json({ favorites });
  } catch (error) {
    apiLogger.error({ message: 'Error in GET /api/favorites', error });
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
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

    const result = await toggleFavorite(profile.id, entityType, entityId);

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/favorites', error });
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
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

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('type') as EntityType;
    const entityId = searchParams.get('id');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'type and id are required' },
        { status: 400 }
      );
    }

    await removeFavorite(profile.id, entityType, entityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ message: 'Error in DELETE /api/favorites', error });
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
