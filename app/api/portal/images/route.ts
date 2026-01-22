// =====================================================
// PORTAL IMAGES API
// GET /api/portal/images - Get customer's images (for portal)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const entityId = searchParams.get('entityId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('customer_images')
      .select('id, thumbnail_url, preview_url, compressed_url, width, height, category, created_at', { count: 'exact' })
      .eq('customer_id', session.customerId)
      .eq('business_id', session.businessId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data: images, count, error } = await query
      .range(offset, offset + Math.min(limit, 100) - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      images: images || [],
      total: count || 0,
      limit,
      offset,
      hasMore: offset + (images?.length || 0) < (count || 0),
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal images GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
