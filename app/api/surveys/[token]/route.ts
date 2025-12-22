// =====================================================
// SURVEY RESPONSE API (PUBLIC)
// GET /api/surveys/[token] - Get survey by token
// POST /api/surveys/[token] - Submit survey response
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSurveyByToken, submitSurvey, markGoogleReviewClicked } from '@/lib/surveys';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const survey = await getSurveyByToken(token);

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Don't expose sensitive fields
    return NextResponse.json({
      id: survey.id,
      status: survey.status,
      customerName: survey.customer?.name,
      businessName: survey.business?.name,
      jobTitle: survey.job?.title,
    });
  } catch (error: any) {
    console.error('Error fetching survey:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Check if this is a Google review click tracking
    if (body.action === 'googleReviewClicked') {
      await markGoogleReviewClicked(token);
      return NextResponse.json({ success: true });
    }

    // Submit survey response
    const {
      overallRating,
      serviceQuality,
      technicianRating,
      communicationRating,
      valueRating,
      whatWentWell,
      whatCouldImprove,
      additionalComments,
      npsScore,
    } = body;

    if (!overallRating) {
      return NextResponse.json(
        { error: 'overallRating is required' },
        { status: 400 }
      );
    }

    const result = await submitSurvey(token, {
      overallRating,
      serviceQuality,
      technicianRating,
      communicationRating,
      valueRating,
      whatWentWell,
      whatCouldImprove,
      additionalComments,
      npsScore,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error submitting survey:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit survey' },
      { status: 500 }
    );
  }
}
