import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { recordShare } from '@/lib/proof-of-work';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';

interface RouteContext {
  params: Promise<{ token: string }>;
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * POST /api/proof/[token]/share
 * Record a share action for a Proof of Work
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const supabase = createAdminClient();

    // Get PoW ID from token
    const { data: pow, error } = await supabase
      .from('proof_of_work')
      .select('id')
      .eq('public_token', token)
      .single();

    if (error || !pow) {
      return NextResponse.json(
        { success: false, error: 'Proof of Work not found' },
        { status: 404 }
      );
    }

    // Get request metadata
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Parse body for share method
    let shareMethod: string | undefined;
    try {
      const body = await request.json();
      shareMethod = body.method; // 'copy', 'native_share', 'email', etc.
    } catch {
      // No body is fine
    }

    // Record the share
    await recordShare(pow.id, {
      ipHash: hashIp(ip),
      userAgent,
      shareMethod,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      msg: 'Error recording Proof of Work share',
      error,
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
