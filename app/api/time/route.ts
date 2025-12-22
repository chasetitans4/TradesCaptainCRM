// =====================================================
// TIME API - Server Time Endpoint
// GET /api/time
// =====================================================

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    serverTime: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    iso: new Date().toISOString(),
  });
}
