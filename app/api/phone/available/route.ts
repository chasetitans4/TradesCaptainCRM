// =====================================================
// SEARCH AVAILABLE PHONE NUMBERS
// GET /api/phone/available?areaCode=512
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { listAvailableNumbers } from '@/lib/twilio';
import { getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can search for phone numbers
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can provision phone numbers' },
        { status: 403 }
      );
    }

    const areaCode = request.nextUrl.searchParams.get('areaCode');

    if (!areaCode || !/^\d{3}$/.test(areaCode)) {
      return NextResponse.json(
        { error: 'Valid 3-digit area code is required' },
        { status: 400 }
      );
    }

    const numbers = await listAvailableNumbers(areaCode, 10);

    return NextResponse.json({ numbers });
  } catch (error) {
    apiLogger.error({ error, context: 'Error searching phone numbers' });
    return NextResponse.json(
      { error: 'Failed to search phone numbers' },
      { status: 500 }
    );
  }
}
