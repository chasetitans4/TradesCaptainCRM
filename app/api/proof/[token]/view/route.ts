import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { recordView } from '@/lib/proof-of-work';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';

interface RouteContext {
  params: Promise<{ token: string }>;
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * POST /api/proof/[token]/view
 * Record a view of a Proof of Work
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
    const referrer = request.headers.get('referer') || undefined;

    // Parse body for optional UTM source
    let utmSource: string | undefined;
    try {
      const body = await request.json();
      utmSource = body.utm_source;
    } catch {
      // No body is fine
    }

    // Record the view
    await recordView(pow.id, {
      ipHash: hashIp(ip),
      userAgent,
      referrer,
      utmSource,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      msg: 'Error recording Proof of Work view',
      error,
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
