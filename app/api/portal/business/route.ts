// =====================================================
// PORTAL BUSINESS API
// GET /api/portal/business - Get business info for portal
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('id');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for public business info
    const supabase = createAdminClient();

    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, name, phone, email, logo_url, primary_color')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(business);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/portal/business' });
    return NextResponse.json(
      { error: 'Failed to get business' },
      { status: 500 }
    );
  }
}
