import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReputationSettings, DEFAULT_REPUTATION_SETTINGS } from '@/lib/reputation';

/**
 * GET /api/reputation/settings
 * Get reputation settings for the current business
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const settings = await getReputationSettings(userData.business_id);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[Reputation Settings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/reputation/settings
 * Update reputation settings for the current business
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Only owners and admins can update settings
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate thresholds
    if (body.positive_threshold !== undefined) {
      if (body.positive_threshold < 1 || body.positive_threshold > 5) {
        return NextResponse.json(
          { error: 'positive_threshold must be between 1 and 5' },
          { status: 400 }
        );
      }
    }

    if (body.negative_threshold !== undefined) {
      if (body.negative_threshold < 1 || body.negative_threshold > 5) {
        return NextResponse.json(
          { error: 'negative_threshold must be between 1 and 5' },
          { status: 400 }
        );
      }
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('reputation_settings')
      .upsert({
        business_id: userData.business_id,
        is_enabled: body.is_enabled ?? DEFAULT_REPUTATION_SETTINGS.is_enabled,
        send_delay_minutes: body.send_delay_minutes ?? DEFAULT_REPUTATION_SETTINGS.send_delay_minutes,
        request_expiry_days: body.request_expiry_days ?? DEFAULT_REPUTATION_SETTINGS.request_expiry_days,
        reminder_delay_hours: body.reminder_delay_hours ?? DEFAULT_REPUTATION_SETTINGS.reminder_delay_hours,
        max_reminders: body.max_reminders ?? DEFAULT_REPUTATION_SETTINGS.max_reminders,
        positive_threshold: body.positive_threshold ?? DEFAULT_REPUTATION_SETTINGS.positive_threshold,
        negative_threshold: body.negative_threshold ?? DEFAULT_REPUTATION_SETTINGS.negative_threshold,
        default_channel: body.default_channel ?? DEFAULT_REPUTATION_SETTINGS.default_channel,
        max_requests_per_day: body.max_requests_per_day ?? DEFAULT_REPUTATION_SETTINGS.max_requests_per_day,
        review_platforms: body.review_platforms,
        initial_message_template: body.initial_message_template,
        initial_message_with_pow_template: body.initial_message_with_pow_template,
        positive_followup_template: body.positive_followup_template,
        negative_followup_template: body.negative_followup_template,
        reminder_template: body.reminder_template,
        auto_assign_recovery: body.auto_assign_recovery ?? DEFAULT_REPUTATION_SETTINGS.auto_assign_recovery,
        recovery_default_assignee: body.recovery_default_assignee,
        recovery_sla_hours: body.recovery_sla_hours ?? DEFAULT_REPUTATION_SETTINGS.recovery_sla_hours,
        recovery_escalation_hours: body.recovery_escalation_hours ?? DEFAULT_REPUTATION_SETTINGS.recovery_escalation_hours,
        attach_pow_link: body.attach_pow_link ?? DEFAULT_REPUTATION_SETTINGS.attach_pow_link,
        pow_link_position: body.pow_link_position ?? DEFAULT_REPUTATION_SETTINGS.pow_link_position,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[Reputation Settings] Update error:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Reputation Settings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
