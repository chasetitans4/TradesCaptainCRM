// =====================================================
// ROUTES API
// GET /api/routes - Get optimized route for a date
// POST /api/routes - Create/optimize route
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createClient } from '@/lib/supabase/server';
import { createOptimizedRoute, getDailyRoute } from '@/lib/routes';
import { isFeatureEnabled } from '@/lib/features';
import { startOfDay } from 'date-fns';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId');
    const dateStr = searchParams.get('date');

    const targetTechnicianId =
      profile.role === 'technician' ? profile.id : technicianId || profile.id;

    const date = dateStr ? new Date(dateStr) : startOfDay(new Date());

    // Get saved route
    const route = await getDailyRoute(targetTechnicianId, date);

    if (!route) {
      return NextResponse.json({
        route: null,
        message: 'No route found. Use POST to optimize.',
      });
    }

    return NextResponse.json({ route });
  } catch (error) {
    apiLogger.error({ error, context: 'fetching route' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch route' },
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

    // Check if route optimization is enabled
    const enabled = await isFeatureEnabled(profile.business_id, 'route_optimization_enabled');
    if (!enabled) {
      return NextResponse.json(
        { error: 'Route optimization feature is not enabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { technicianId, date, startLatitude, startLongitude } = body;

    // Only admins can optimize routes for other technicians
    const targetTechnicianId =
      profile.role === 'technician' ? profile.id : technicianId || profile.id;

    const targetDate = date ? new Date(date) : startOfDay(new Date());

    // Get technician's home location if not provided
    let startLocation: { latitude: number; longitude: number } | undefined;

    if (startLatitude && startLongitude) {
      startLocation = {
        latitude: parseFloat(startLatitude),
        longitude: parseFloat(startLongitude),
      };
    } else {
      // Try to get technician's saved home location
      const supabase = await createClient();
      const { data: tech } = await supabase
        .from('users')
        .select('home_latitude, home_longitude')
        .eq('id', targetTechnicianId)
        .single();

      if (tech?.home_latitude && tech?.home_longitude) {
        startLocation = {
          latitude: tech.home_latitude,
          longitude: tech.home_longitude,
        };
      }
    }

    const optimizedRoute = await createOptimizedRoute(
      profile.business_id,
      targetTechnicianId,
      targetDate,
      startLocation
    );

    if (!optimizedRoute) {
      return NextResponse.json({
        route: null,
        message: 'No jobs found for this date',
      });
    }

    return NextResponse.json({
      route: optimizedRoute,
      message: `Optimized ${optimizedRoute.stops.length} stops`,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'optimizing route' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize route' },
      { status: 500 }
    );
  }
}
