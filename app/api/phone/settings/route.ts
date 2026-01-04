// =====================================================
// PHONE SETTINGS (Call Forwarding)
// GET/PUT /api/phone/settings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

// GET - Fetch phone settings
export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: business, error } = await supabase
      .from('businesses')
      .select(`
        twilio_phone_number,
        twilio_phone_sid,
        phone_number_strategy,
        call_forwarding_mode,
        call_forward_numbers,
        call_ring_timeout,
        call_business_hours_only,
        call_after_hours_mode,
        voicemail_greeting_url
      `)
      .eq('id', profile.business_id)
      .single();

    if (error) {
      apiLogger.error({ error, context: 'Error fetching phone settings' });
      return NextResponse.json(
        { error: 'Failed to fetch phone settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      phone_number: business.twilio_phone_number,
      phone_sid: business.twilio_phone_sid,
      strategy: business.phone_number_strategy || 'single',
      call_forwarding: {
        mode: business.call_forwarding_mode || 'voicemail',
        forward_numbers: business.call_forward_numbers || [],
        ring_timeout: business.call_ring_timeout || 20,
        business_hours_only: business.call_business_hours_only || false,
        after_hours_mode: business.call_after_hours_mode || 'voicemail',
        voicemail_greeting_url: business.voicemail_greeting_url,
      },
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching phone settings' });
    return NextResponse.json(
      { error: 'Failed to fetch phone settings' },
      { status: 500 }
    );
  }
}

// PUT - Update phone settings
export async function PUT(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can update phone settings
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can update phone settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { call_forwarding } = body;

    const supabase = await createServerSupabaseClient();

    const updates: Record<string, any> = {};

    if (call_forwarding) {
      if (call_forwarding.mode) {
        updates.call_forwarding_mode = call_forwarding.mode;
      }
      if (call_forwarding.forward_numbers !== undefined) {
        updates.call_forward_numbers = call_forwarding.forward_numbers;
      }
      if (call_forwarding.ring_timeout !== undefined) {
        updates.call_ring_timeout = call_forwarding.ring_timeout;
      }
      if (call_forwarding.business_hours_only !== undefined) {
        updates.call_business_hours_only = call_forwarding.business_hours_only;
      }
      if (call_forwarding.after_hours_mode) {
        updates.call_after_hours_mode = call_forwarding.after_hours_mode;
      }
      if (call_forwarding.voicemail_greeting_url !== undefined) {
        updates.voicemail_greeting_url = call_forwarding.voicemail_greeting_url;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', profile.business_id);

    if (error) {
      apiLogger.error({ error, context: 'Error updating phone settings' });
      return NextResponse.json(
        { error: 'Failed to update phone settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error updating phone settings' });
    return NextResponse.json(
      { error: 'Failed to update phone settings' },
      { status: 500 }
    );
  }
}
