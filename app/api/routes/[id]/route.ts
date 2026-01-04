// =====================================================
// SINGLE ROUTE API
// PUT /api/routes/[id] - Update route status or reorder
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createClient } from '@/lib/supabase/server';
import { updateRouteStatus, reorderStops } from '@/lib/routes';
import { isFeatureEnabled } from '@/lib/features';
import { apiLogger } from '@/lib/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if route optimization is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'route_optimization_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Route optimization feature is not enabled' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    // Verify route belongs to business
    const { data: route } = await supabase
      .from('daily_routes')
      .select('business_id, technician_id')
      .eq('id', id)
      .single();

    if (!route || route.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Technicians can only modify their own routes
    if (profile.role === 'technician' && route.technician_id !== profile.id) {
      return NextResponse.json(
        { error: 'You can only modify your own routes' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Handle status update
    if (body.status) {
      await updateRouteStatus(id, body.status);
      return NextResponse.json({
        success: true,
        message: `Route status updated to ${body.status}`,
      });
    }

    // Handle reorder
    if (body.newOrder && Array.isArray(body.newOrder)) {
      const reorderedStops = await reorderStops(id, body.newOrder);
      return NextResponse.json({
        success: true,
        stops: reorderedStops,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide status or newOrder' },
      { status: 400 }
    );
  } catch (error) {
    apiLogger.error({ error, context: 'updating route' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update route' },
      { status: 500 }
    );
  }
}
