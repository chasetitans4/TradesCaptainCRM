import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ReputationDashboardStats } from '@/types/reputation';

/**
 * GET /api/reputation/stats
 * Get reputation dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get request stats
    const { data: requests, error: requestsError } = await supabase
      .from('reputation_requests')
      .select('id, status, created_at')
      .eq('business_id', userData.business_id)
      .gte('created_at', startDate.toISOString());

    if (requestsError) {
      console.error('[Reputation Stats] Requests error:', requestsError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Get feedback stats
    const { data: feedbacks, error: feedbacksError } = await supabase
      .from('reputation_feedback')
      .select(`
        id,
        sentiment_score,
        sentiment_category,
        review_link_shown,
        review_link_clicked,
        recovery_needed,
        recovery_status,
        recovery_resolved_at,
        created_at
      `)
      .eq('business_id', userData.business_id)
      .gte('created_at', startDate.toISOString());

    if (feedbacksError) {
      console.error('[Reputation Stats] Feedback error:', feedbacksError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate stats
    const totalRequests = requests?.length || 0;
    const requestsSent = requests?.filter((r) =>
      ['sent', 'delivered', 'opened', 'feedback_received', 'review_requested', 'recovery_started', 'completed'].includes(r.status)
    ).length || 0;

    const totalFeedbacks = feedbacks?.length || 0;
    const responseRate = requestsSent > 0 ? Math.round((totalFeedbacks / requestsSent) * 100) : 0;

    const positiveCount = feedbacks?.filter((f) => f.sentiment_category === 'positive').length || 0;
    const neutralCount = feedbacks?.filter((f) => f.sentiment_category === 'neutral').length || 0;
    const negativeCount = feedbacks?.filter((f) => f.sentiment_category === 'negative').length || 0;

    const avgScore = totalFeedbacks > 0
      ? Math.round((feedbacks?.reduce((sum, f) => sum + f.sentiment_score, 0) || 0) / totalFeedbacks * 10) / 10
      : 0;

    const reviewsRequested = feedbacks?.filter((f) => f.review_link_shown).length || 0;
    const reviewClicks = feedbacks?.filter((f) => f.review_link_clicked).length || 0;
    const reviewConversionRate = reviewsRequested > 0
      ? Math.round((reviewClicks / reviewsRequested) * 100)
      : 0;

    const recoveryStarted = feedbacks?.filter((f) => f.recovery_needed).length || 0;
    const recoveryResolved = feedbacks?.filter((f) =>
      f.recovery_status === 'resolved' || f.recovery_status === 'closed'
    ).length || 0;
    const recoveryPending = feedbacks?.filter((f) =>
      f.recovery_needed && !['resolved', 'closed'].includes(f.recovery_status || '')
    ).length || 0;

    // Calculate average recovery time (in hours)
    const resolvedWithTime = feedbacks?.filter((f) =>
      f.recovery_resolved_at && f.created_at
    ) || [];
    const avgRecoveryTimeHours = resolvedWithTime.length > 0
      ? Math.round(
          resolvedWithTime.reduce((sum, f) => {
            const created = new Date(f.created_at).getTime();
            const resolved = new Date(f.recovery_resolved_at!).getTime();
            return sum + (resolved - created) / (1000 * 60 * 60);
          }, 0) / resolvedWithTime.length
        )
      : 0;

    const stats: ReputationDashboardStats = {
      period_days: days,
      total_requests: totalRequests,
      requests_sent: requestsSent,
      response_rate: responseRate,
      positive_count: positiveCount,
      neutral_count: neutralCount,
      negative_count: negativeCount,
      average_score: avgScore,
      reviews_requested: reviewsRequested,
      review_clicks: reviewClicks,
      review_conversion_rate: reviewConversionRate,
      recovery_started: recoveryStarted,
      recovery_resolved: recoveryResolved,
      recovery_pending: recoveryPending,
      avg_recovery_time_hours: avgRecoveryTimeHours,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Reputation Stats] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
