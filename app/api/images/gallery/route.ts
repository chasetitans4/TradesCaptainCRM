// =====================================================
// IMAGE GALLERY API
// GET /api/images/gallery - Get customer's image gallery
// Returns paginated list with thumbnails for efficient loading
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getCustomerImages } from '@/lib/images';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const category = searchParams.get('category');
    const entityId = searchParams.get('entityId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Verify customer belongs to this business
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', userData.business_id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get images
    const result = await getCustomerImages(customerId, userData.business_id, {
      category: category || undefined,
      entityId: entityId || undefined,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    });

    return NextResponse.json({
      images: result.images,
      total: result.total,
      limit,
      offset,
      hasMore: offset + result.images.length < result.total,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Image gallery GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get images' }, { status: 500 });
  }
}
