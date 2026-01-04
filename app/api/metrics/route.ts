// =====================================================
// TECHNICIAN METRICS API
// GET /api/metrics - Get performance metrics
// POST /api/metrics - Record metrics / rate job
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  getTechnicianPerformance,
  getTeamPerformance,
  getTechnicianRankings,
  getTechnicianTrend,
  getBusinessPerformanceSummary,
  rateJobPerformance,
} from '@/lib/metrics/technician';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId');
    const team = searchParams.get('team') === 'true';
    const rankings = searchParams.get('rankings') === 'true';
    const trend = searchParams.get('trend') === 'true';
    const summary = searchParams.get('summary') === 'true';
    const range = (searchParams.get('range') || 'month') as any;
    const metric = (searchParams.get('metric') || 'revenue') as any;
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Business summary
    if (summary) {
      const businessSummary = await getBusinessPerformanceSummary(profile.business_id, range);
      return NextResponse.json(businessSummary);
    }

    // Team performance
    if (team) {
      const teamPerf = await getTeamPerformance(profile.business_id, range);
      return NextResponse.json(teamPerf);
    }

    // Rankings
    if (rankings) {
      const rankingData = await getTechnicianRankings(profile.business_id, metric, range, limit);
      return NextResponse.json(rankingData);
    }

    // Individual technician metrics
    if (!technicianId) {
      // If no technicianId and user is a technician, show their own metrics
      if (profile.role === 'technician') {
        const ownPerf = await getTechnicianPerformance(profile.id, profile.business_id, range);
        return NextResponse.json(ownPerf);
      }
      return NextResponse.json(
        { error: 'technicianId is required' },
        { status: 400 }
      );
    }

    // Trend data
    if (trend) {
      const trendData = await getTechnicianTrend(technicianId, profile.business_id, days);
      return NextResponse.json(trendData);
    }

    // Performance data
    const performance = await getTechnicianPerformance(technicianId, profile.business_id, range);
    return NextResponse.json(performance);
  } catch (error) {
    apiLogger.error({ message: 'Error fetching metrics', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
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
    const { jobId, technicianId, quality, timeliness, professionalism, feedback } = body;

    if (!jobId || !technicianId || quality === undefined || timeliness === undefined || professionalism === undefined) {
      return NextResponse.json(
        { error: 'jobId, technicianId, quality, timeliness, and professionalism are required' },
        { status: 400 }
      );
    }

    const rating = await rateJobPerformance(
      jobId,
      technicianId,
      profile.business_id,
      { quality, timeliness, professionalism, feedback },
      profile.id
    );

    return NextResponse.json(rating);
  } catch (error) {
    apiLogger.error({ message: 'Error rating job', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rate job' },
      { status: 500 }
    );
  }
}
