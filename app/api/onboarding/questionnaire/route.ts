// =====================================================
// ONBOARDING QUESTIONNAIRE API
// POST /api/onboarding/questionnaire - Save responses
// GET /api/onboarding/questionnaire - Get questions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  QUESTIONNAIRE_QUESTIONS,
  processQuestionnaireResponses,
  getRecommendedFeatures,
} from '@/lib/onboarding/questionnaire';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recommended features based on business info
    const recommendations = getRecommendedFeatures(
      'solo', // Default, will be updated after first question
      profile.trade_type || 'general'
    );

    return NextResponse.json({
      questions: QUESTIONNAIRE_QUESTIONS,
      recommendations,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching questionnaire', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch questionnaire' },
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

    const { responses } = await request.json();

    if (!responses) {
      return NextResponse.json(
        { error: 'Responses are required' },
        { status: 400 }
      );
    }

    // Process and save questionnaire responses
    await processQuestionnaireResponses(profile.business_id, responses);

    return NextResponse.json({
      success: true,
      message: 'Questionnaire completed successfully',
    });
  } catch (error) {
    apiLogger.error({ message: 'Error saving questionnaire', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save questionnaire' },
      { status: 500 }
    );
  }
}
