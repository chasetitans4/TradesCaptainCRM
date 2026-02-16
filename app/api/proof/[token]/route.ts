import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ProofOfWork, ProofOfWorkTimelineEvent, VerifiedJobPhoto } from '@/types/proof-of-work';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/proof/[token]
 * Get Proof of Work data by public token (for API/mobile consumption)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const supabase = createAdminClient();

    // Get PoW with related data
    const { data: pow, error } = await supabase
      .from('proof_of_work')
      .select(`
        *,
        technician:users!technician_id (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        business:businesses!business_id (
          id,
          name,
          logo_url,
          phone
        )
      `)
      .eq('public_token', token)
      .single();

    if (error || !pow) {
      return NextResponse.json(
        { success: false, error: 'Proof of Work not found' },
        { status: 404 }
      );
    }

    // Get timeline events
    const { data: timeline } = await supabase
      .from('proof_of_work_timeline')
      .select('*')
      .eq('proof_of_work_id', pow.id)
      .order('event_time', { ascending: true });

    // Get verified photos
    const { data: photos } = await supabase
      .from('job_photos')
      .select('*')
      .eq('job_id', pow.job_id)
      .gte('verification_level', 1)
      .order('display_order', { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        proofOfWork: pow as ProofOfWork,
        timeline: (timeline || []) as ProofOfWorkTimelineEvent[],
        photos: (photos || []) as VerifiedJobPhoto[],
        technician: pow.technician,
        business: pow.business,
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Error fetching Proof of Work',
      error,
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
