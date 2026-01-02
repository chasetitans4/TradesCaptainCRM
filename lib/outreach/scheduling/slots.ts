// =====================================================
// OUTREACH SCHEDULING - AVAILABLE SLOTS & SCHEDULING
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  ScheduledCall,
  AvailableTimeSlot,
  CallSlotResult,
} from '@/types/outreach';
import {
  getBusinessDayWindow,
  isSlotAvailable,
  getAllAgentsAvailability,
} from '../availability';
import { getDistributionSettings, selectAgentForCall } from './distribution';

// =====================================================
// GET AVAILABLE CALL SLOTS
// =====================================================

/**
 * Get available call slots within the 3-business-day window
 */
export async function getAvailableCallSlots(
  contactTimezone?: string,
  preferredAgentId?: string
): Promise<CallSlotResult> {
  const settings = await getDistributionSettings();
  const now = new Date();

  // Add minimum notice time
  const minNoticeTime = new Date(now.getTime() + settings.min_notice_hours * 60 * 60 * 1000);

  // Get business day window
  const { dates: businessDays } = await getBusinessDayWindow(now, settings.max_advance_business_days);

  if (businessDays.length === 0) {
    return {
      available_slots: [],
      has_overflow: true,
      overflow_reason: 'no_business_days_available',
    };
  }

  // Get all agents' availability
  const startDate = businessDays[0];
  const endDate = businessDays[businessDays.length - 1];

  const agentsAvailability = await getAllAgentsAvailability(
    startDate,
    endDate,
    preferredAgentId ? [preferredAgentId] : undefined
  );

  const allSlots: AvailableTimeSlot[] = [];

  for (const agent of agentsAvailability) {
    for (const slot of agent.slots) {
      // Skip slots before minimum notice time
      if (slot.start < minNoticeTime) continue;

      allSlots.push({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
      });
    }
  }

  // Sort by time
  allSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (allSlots.length === 0) {
    return {
      available_slots: [],
      has_overflow: true,
      overflow_reason: 'no_availability_3day',
    };
  }

  return {
    available_slots: allSlots,
    has_overflow: false,
  };
}

// =====================================================
// SCHEDULE A CALL
// =====================================================

export interface ScheduleCallResult {
  success: boolean;
  call?: ScheduledCall;
  error?: string;
  overflow?: boolean;
  overflow_reason?: string;
}

/**
 * Schedule a call for a contact
 */
export async function scheduleCall(
  contactId: string,
  scheduledAt: Date,
  agentId?: string,
  options?: {
    duration_minutes?: number;
    call_type?: 'phone' | 'zoom' | 'google_meet';
    meeting_link?: string;
    is_weekend_request?: boolean;
  }
): Promise<ScheduleCallResult> {
  const supabase = await createClient();
  const settings = await getDistributionSettings();

  // Get contact info
  const { data: contact } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  // Check minimum notice time
  const now = new Date();
  const minNoticeTime = new Date(now.getTime() + settings.min_notice_hours * 60 * 60 * 1000);

  if (scheduledAt < minNoticeTime) {
    return {
      success: false,
      error: `Calls must be scheduled at least ${settings.min_notice_hours} hours in advance`,
    };
  }

  // Check if within 3-business-day window
  const { end: maxDate } = await getBusinessDayWindow(now, settings.max_advance_business_days);

  if (scheduledAt > maxDate) {
    // This is an overflow situation
    return {
      success: false,
      overflow: true,
      overflow_reason: 'beyond_3_day_window',
      error: 'Requested time is beyond the 3-business-day window',
    };
  }

  // Check for weekend request
  const isWeekend = scheduledAt.getDay() === 0 || scheduledAt.getDay() === 6;
  const isWeekendBlocked =
    (scheduledAt.getDay() === 0 && settings.blackout_sunday) ||
    (scheduledAt.getDay() === 6 && settings.blackout_saturday);

  if (isWeekend && isWeekendBlocked) {
    if (options?.is_weekend_request) {
      // Create as pending admin approval
      const { data: call, error } = await supabase
        .from('scheduled_calls')
        .insert({
          contact_id: contactId,
          agent_id: null, // Will be assigned by admin
          campaign_id: contact.campaign_id,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: options?.duration_minutes || settings.call_duration_minutes,
          lead_timezone: contact.timezone,
          call_type: options?.call_type || 'phone',
          meeting_link: options?.meeting_link,
          status: 'pending_admin_approval',
          weekend_request: true,
          overflow_reason: 'weekend_request',
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update contact status
      await supabase
        .from('outreach_contacts')
        .update({
          status: 'pending_admin',
          overflow_to_admin: true,
          overflow_reason: 'weekend_request',
          overflow_at: new Date().toISOString(),
          scheduled_call_id: call.id,
        })
        .eq('id', contactId);

      return {
        success: true,
        call,
        overflow: true,
        overflow_reason: 'weekend_request',
      };
    } else {
      return {
        success: false,
        error: 'Weekend scheduling is not available. Please select a weekday.',
      };
    }
  }

  // If no agent specified, find one
  let selectedAgentId = agentId;
  let selectionReason = 'specified';

  if (!selectedAgentId) {
    const assignResult = await selectAgentForCall(scheduledAt, settings, contact);

    if (!assignResult.agent_id) {
      if (settings.overflow_to_admin) {
        // Create as pending admin assignment
        const { data: call, error } = await supabase
          .from('scheduled_calls')
          .insert({
            contact_id: contactId,
            agent_id: null,
            campaign_id: contact.campaign_id,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: options?.duration_minutes || settings.call_duration_minutes,
            lead_timezone: contact.timezone,
            call_type: options?.call_type || 'phone',
            meeting_link: options?.meeting_link,
            status: 'pending_admin_approval',
            overflow_reason: assignResult.reason,
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        // Update contact status
        await supabase
          .from('outreach_contacts')
          .update({
            status: 'pending_admin',
            overflow_to_admin: true,
            overflow_reason: assignResult.reason,
            overflow_at: new Date().toISOString(),
            scheduled_call_id: call.id,
          })
          .eq('id', contactId);

        return {
          success: true,
          call,
          overflow: true,
          overflow_reason: assignResult.reason,
        };
      }

      return {
        success: false,
        overflow: true,
        overflow_reason: assignResult.reason,
        error: 'No agents available for the requested time',
      };
    }

    selectedAgentId = assignResult.agent_id;
    selectionReason = assignResult.reason;
  } else {
    // Verify agent is available
    const isAvailable = await isSlotAvailable(
      selectedAgentId,
      scheduledAt,
      options?.duration_minutes || settings.call_duration_minutes,
      settings.buffer_minutes
    );

    if (!isAvailable) {
      return {
        success: false,
        error: 'Agent is not available at the requested time',
      };
    }
  }

  // Get agent timezone
  const { data: agent } = await supabase
    .from('admin_users')
    .select('timezone')
    .eq('id', selectedAgentId)
    .single();

  // Create the call
  const { data: call, error } = await supabase
    .from('scheduled_calls')
    .insert({
      contact_id: contactId,
      agent_id: selectedAgentId,
      campaign_id: contact.campaign_id,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: options?.duration_minutes || settings.call_duration_minutes,
      agent_timezone: agent?.timezone || 'America/New_York',
      lead_timezone: contact.timezone,
      call_type: options?.call_type || 'phone',
      meeting_link: options?.meeting_link,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update contact status
  await supabase
    .from('outreach_contacts')
    .update({
      status: 'call_scheduled',
      scheduled_call_id: call.id,
      assigned_agent_id: selectedAgentId,
    })
    .eq('id', contactId);

  // Log the distribution
  await supabase.from('call_distribution_log').insert({
    contact_id: contactId,
    scheduled_call_id: call.id,
    selected_agent_id: selectedAgentId,
    distribution_method: settings.distribution_method,
    selection_reason: selectionReason,
  });

  // Update agent's daily call count
  // First get current value, then increment
  const { data: currentWeight } = await supabase
    .from('agent_distribution_weights')
    .select('current_daily_calls')
    .eq('agent_id', selectedAgentId)
    .single();

  await supabase
    .from('agent_distribution_weights')
    .update({
      current_daily_calls: (currentWeight?.current_daily_calls || 0) + 1,
      last_assigned_at: new Date().toISOString(),
    })
    .eq('agent_id', selectedAgentId);

  return { success: true, call };
}
