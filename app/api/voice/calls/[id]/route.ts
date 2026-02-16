/**
 * VOICE CALL DETAIL API
 * GET /api/voice/calls/[id]
 *
 * Get details of a single voice call event including escalation history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

const callsLogger = apiLogger.child({ context: 'api.voice.calls.id' });

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/voice/calls/[id] - Get single call details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Get call event with related data
    const { data: call, error } = await supabase
      .from('voice_call_events')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        voice_escalation_events (
          id,
          step,
          action_type,
          target_contact_id,
          is_emergency_escalation,
          sent_at,
          acknowledged_at,
          acknowledgment_method,
          failed_at,
          failure_reason
        )
      `)
      .eq('id', id)
      .eq('business_id', userData.business_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }
      throw error;
    }

    // Get contact details for escalations
    const escalations = call.voice_escalation_events || [];
    const contactIds = [...new Set(escalations.map((e: any) => e.target_contact_id).filter(Boolean))];

    let contacts: Record<string, any> = {};
    if (contactIds.length > 0) {
      const { data: contactData } = await supabase
        .from('admin_users')
        .select('id, first_name, last_name, email, phone')
        .in('id', contactIds);

      if (contactData) {
        contacts = Object.fromEntries(contactData.map((c) => [c.id, c]));
      }
    }

    // Enrich escalations with contact info
    const enrichedEscalations = escalations.map((e: any) => ({
      ...e,
      contact: e.target_contact_id ? contacts[e.target_contact_id] : null,
    }));

    return NextResponse.json({
      call: {
        ...call,
        escalations: enrichedEscalations,
      },
    });
  } catch (error) {
    callsLogger.error({
      msg: 'Error fetching voice call',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch voice call' },
      { status: 500 }
    );
  }
}
