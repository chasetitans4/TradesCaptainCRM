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

    // Validate UUID format to prevent enumeration/injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for public business info
    const supabase = createAdminClient();

    const [businessResult, platformResult] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, phone, email, logo_url, primary_color')
        .eq('id', businessId)
        .single(),
      supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'platform_branding')
        .single()
    ]);

    const business = businessResult.data;
    const error = businessResult.error;

    if (error || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const platformSettings = platformResult.data?.value || null;

    return NextResponse.json({
      ...business,
      platform_settings: platformSettings
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/portal/business' });
    return NextResponse.json(
      { error: 'Failed to get business' },
      { status: 500 }
    );
  }
}
