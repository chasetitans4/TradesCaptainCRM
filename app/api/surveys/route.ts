// =====================================================
// CUSTOMER SATISFACTION SURVEYS API
// GET /api/surveys - Get survey stats and recent surveys
// POST /api/surveys - Send survey to customer
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { sendSurvey, getSurveyStats, getRecentSurveys } from '@/lib/surveys';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stats = searchParams.get('stats') === 'true';

    // Validate and bound query parameters to prevent DoS
    const daysParam = parseInt(searchParams.get('days') || '30', 10);
    const days = Math.min(Math.max(isNaN(daysParam) ? 30 : daysParam, 1), 365);

    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 20 : limitParam, 1), 100);

    if (stats) {
      const surveyStats = await getSurveyStats(profile.business_id, days);
      return NextResponse.json(surveyStats);
    }

    const recentSurveys = await getRecentSurveys(profile.business_id, limit);
    return NextResponse.json(recentSurveys);
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch surveys' },
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
    const { customerId, jobId } = body;

    if (!customerId || !jobId) {
      return NextResponse.json(
        { error: 'customerId and jobId are required' },
        { status: 400 }
      );
    }

    await sendSurvey(profile.business_id, customerId, jobId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending survey:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send survey' },
      { status: 500 }
    );
  }
}
