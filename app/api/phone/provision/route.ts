// =====================================================
// PROVISION PHONE NUMBER
// POST /api/phone/provision
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { provisionPhoneNumber } from '@/lib/twilio';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can provision phone numbers
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can provision phone numbers' },
        { status: 403 }
      );
    }

    // Check if business already has a phone number
    const supabase = await createServerSupabaseClient();
    const { data: business } = await supabase
      .from('businesses')
      .select('twilio_phone_number')
      .eq('id', profile.business_id)
      .single();

    if (business?.twilio_phone_number) {
      return NextResponse.json(
        { error: 'Business already has a phone number. Release it first before provisioning a new one.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { phone_number } = body;

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Provision the number
    const result = await provisionPhoneNumber(phone_number, profile.business_id);

    return NextResponse.json({
      success: true,
      phone_number: result.phoneNumber,
      phone_sid: result.phoneSid,
    });
  } catch (error) {
    console.error('Error provisioning phone number:', error);
    return NextResponse.json(
      { error: 'Failed to provision phone number. It may no longer be available.' },
      { status: 500 }
    );
  }
}
