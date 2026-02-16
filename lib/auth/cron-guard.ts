// =====================================================
// CRON AUTH GUARD — Strict, fail-closed
// All cron endpoints must use this guard.
// =====================================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a request is authorized to trigger a cron job.
 * Fails closed: if CRON_SECRET is not configured, ALL requests are denied.
 *
 * @returns null if authorized, or a 401/500 NextResponse to return immediately.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // Fail closed — never allow cron execution without a configured secret
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Authorized
  return null;
}
