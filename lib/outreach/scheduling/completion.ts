// =====================================================
// OUTREACH SCHEDULING - CALL COMPLETION & RESCHEDULING
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { scheduleCall, type ScheduleCallResult } from './slots';

// =====================================================
// RESCHEDULE A CALL
// =====================================================

export async function rescheduleCall(
  callId: string,
  newScheduledAt: Date,
  newAgentId?: string
): Promise<ScheduleCallResult> {
  const supabase = await createClient();

  // Get existing call
  const { data: existingCall } = await supabase
    .from('scheduled_calls')
    .select('*')
    .eq('id', callId)
    .single();

  if (!existingCall) {
    return { success: false, error: 'Call not found' };
  }

  // Mark old call as rescheduled
  await supabase
    .from('scheduled_calls')
    .update({ status: 'rescheduled' })
    .eq('id', callId);

  // Create new call
  const result = await scheduleCall(
    existingCall.contact_id,
    newScheduledAt,
    newAgentId,
    {
      duration_minutes: existingCall.duration_minutes,
      call_type: existingCall.call_type,
    }
  );

  if (result.success && result.call) {
    // Update with reschedule info
    await supabase
      .from('scheduled_calls')
      .update({
        rescheduled_from_id: callId,
        reschedule_count: (existingCall.reschedule_count || 0) + 1,
      })
      .eq('id', result.call.id);
  }

  return result;
}

// =====================================================
// COMPLETE A CALL
// =====================================================

export async function completeCall(
  callId: string,
  outcome: string,
  notes?: string,
  planSold?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('scheduled_calls')
    .update({
      status: 'completed',
      outcome,
      outcome_notes: notes,
      plan_sold: planSold,
      ended_at: new Date().toISOString(),
    })
    .eq('id', callId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update contact status
  const { data: call } = await supabase
    .from('scheduled_calls')
    .select('contact_id')
    .eq('id', callId)
    .single();

  if (call?.contact_id) {
    const newStatus = outcome === 'closed' ? 'converted' : 'call_completed';

    await supabase
      .from('outreach_contacts')
      .update({
        status: newStatus,
        converted_at: outcome === 'closed' ? new Date().toISOString() : null,
        converted_plan: planSold,
      })
      .eq('id', call.contact_id);
  }

  return { success: true };
}

// =====================================================
// MARK NO-SHOW
// =====================================================

export async function markNoShow(
  callId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get call and contact
  const { data: call } = await supabase
    .from('scheduled_calls')
    .select('*, contact:outreach_contacts(*)')
    .eq('id', callId)
    .single();

  if (!call) {
    return { success: false, error: 'Call not found' };
  }

  // Update call status
  await supabase
    .from('scheduled_calls')
    .update({ status: 'no_show' })
    .eq('id', callId);

  // Count previous no-shows
  const { count } = await supabase
    .from('no_show_escalations')
    .select('*', { count: 'exact', head: true })
    .eq('contact_id', call.contact_id);

  const noShowNumber = (count || 0) + 1;

  // Determine escalation action
  let escalationAction = 'retry_24h';
  let scoreAdjustment = 0;

  switch (noShowNumber) {
    case 1:
      escalationAction = 'retry_24h';
      break;
    case 2:
      escalationAction = 'flag_at_risk';
      scoreAdjustment = -15;
      break;
    case 3:
      escalationAction = 'final_warning';
      scoreAdjustment = -25;
      break;
    default:
      escalationAction = 'archive';
      scoreAdjustment = -50;
      break;
  }

  // Create escalation record
  await supabase.from('no_show_escalations').insert({
    contact_id: call.contact_id,
    scheduled_call_id: callId,
    no_show_number: noShowNumber,
    escalation_action: escalationAction,
    score_adjustment: scoreAdjustment,
  });

  // Update contact score
  if (scoreAdjustment !== 0) {
    await supabase
      .from('outreach_contacts')
      .update({
        score: Math.max(0, (call.contact?.score || 0) + scoreAdjustment),
      })
      .eq('id', call.contact_id);
  }

  return { success: true };
}
