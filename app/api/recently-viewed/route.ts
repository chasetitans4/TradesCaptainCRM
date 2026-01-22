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
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const entityType = searchParams.get('type') as EntityType | null;

    const items = await getRecentlyViewed(
      session.user.id,
      limit,
      entityType || undefined
    );

    return NextResponse.json({ items });
  } catch (error) {
    apiLogger.error({ error, context: 'GET /api/recently-viewed' });
    return NextResponse.json(
      { error: 'Failed to fetch recently viewed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    await recordView(session.user.id, entityType, entityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'POST /api/recently-viewed' });
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearRecentlyViewed(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'DELETE /api/recently-viewed' });
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    );
  }
}
