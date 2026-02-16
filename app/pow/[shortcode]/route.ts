import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ shortcode: string }>;
}

/**
 * GET /pow/[shortcode]
 * Short URL redirect for Proof of Work
 * Redirects pow.tc/{code} or /pow/{code} to /proof/{token}
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { shortcode } = await context.params;
    const supabase = createAdminClient();

    // Look up the short code
    const { data: redirect, error } = await supabase
      .from('short_url_redirects')
      .select('target_type, target_id')
      .eq('short_code', shortcode.toUpperCase())
      .single();

    if (error || !redirect) {
      logger.warn({
        msg: 'Short URL not found',
        shortcode,
      });
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Increment click count
    await supabase
      .from('short_url_redirects')
      .update({
        click_count: supabase.rpc('increment', { row_id: redirect.target_id }),
        last_clicked_at: new Date().toISOString(),
      })
      .eq('short_code', shortcode.toUpperCase());

    // Handle different target types
    if (redirect.target_type === 'proof_of_work') {
      // Get the public token for the PoW
      const { data: pow } = await supabase
        .from('proof_of_work')
        .select('public_token')
        .eq('id', redirect.target_id)
        .single();

      if (pow?.public_token) {
        // Record QR scan in audit
        await supabase.from('proof_of_work_audit').insert({
          proof_of_work_id: redirect.target_id,
          event_type: 'QR_SCANNED',
          actor_type: 'ANONYMOUS',
          user_agent: request.headers.get('user-agent'),
        });

        return NextResponse.redirect(
          new URL(`/proof/${pow.public_token}`, request.url)
        );
      }
    }

    // Fallback for unknown target types or missing data
    logger.error({
      msg: 'Unable to resolve short URL target',
      shortcode,
      targetType: redirect.target_type,
      targetId: redirect.target_id,
    });

    return NextResponse.redirect(new URL('/404', request.url));
  } catch (error) {
    logger.error({
      msg: 'Error handling short URL redirect',
      error,
    });

    return NextResponse.redirect(new URL('/404', request.url));
  }
}
