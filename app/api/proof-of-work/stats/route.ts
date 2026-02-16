import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/proof-of-work/stats
 * Get Proof of Work statistics for the current user's business
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with business
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get PoW stats
    const { data: pows, error: powError } = await supabase
      .from('proof_of_work')
      .select('id, view_count, share_count, delivery_sent_at')
      .eq('business_id', profile.business_id);

    if (powError) {
      logger.error({
        msg: 'Failed to get PoW stats',
        businessId: profile.business_id,
        error: powError,
      });
      return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
    }

    // Calculate stats
    const totalSent = pows?.filter((p) => p.delivery_sent_at).length || 0;
    const totalViews = pows?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
    const totalShares = pows?.reduce((sum, p) => sum + (p.share_count || 0), 0) || 0;
    const viewedPows = pows?.filter((p) => p.view_count > 0).length || 0;
    const avgViewRate = totalSent > 0 ? viewedPows / totalSent : 0;

    return NextResponse.json({
      success: true,
      stats: {
        total_sent: totalSent,
        total_views: totalViews,
        total_shares: totalShares,
        avg_view_rate: avgViewRate,
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Error getting PoW stats',
      error,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
