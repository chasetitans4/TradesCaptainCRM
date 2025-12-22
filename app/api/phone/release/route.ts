// =====================================================
// RELEASE PHONE NUMBER
// POST /api/phone/release
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { releasePhoneNumber } from '@/lib/twilio';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can release phone numbers
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can release phone numbers' },
        { status: 403 }
      );
    }

    // Get current phone number
    const supabase = await createServerSupabaseClient();
    const { data: business } = await supabase
      .from('businesses')
      .select('twilio_phone_number, twilio_phone_sid')
      .eq('id', profile.business_id)
      .single();

    if (!business?.twilio_phone_sid) {
      return NextResponse.json(
        { error: 'Business has no phone number to release' },
        { status: 400 }
      );
    }

    // Release the number
    await releasePhoneNumber(business.twilio_phone_sid, profile.business_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error releasing phone number:', error);
    return NextResponse.json(
      { error: 'Failed to release phone number' },
      { status: 500 }
    );
  }
}
