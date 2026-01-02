// =====================================================
// CALL SCHEDULING TYPES
// =====================================================

import type {
  ScheduledCallStatus,
  CallOutcomeType,
  DistributionMode,
  BlackoutType,
  OverflowDistributionMode,
} from './enums';
import type { OutreachContact } from './contacts';

// =====================================================
// AGENT AVAILABILITY & SCHEDULING
// =====================================================

export interface AgentAvailability {
  id: string;
  agent_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM format
  end_time: string;
  shift_number: number;
  is_active: boolean;
  created_at: string;
}

export interface AgentBreakTime {
  id: string;
  agent_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  reason: string | null;
  recurring: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AgentTimeBlock {
  id: string;
  agent_id: string;
  block_type: 'time_off' | 'meeting' | 'busy' | 'vacation';
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  created_at: string;
}

export interface GlobalBlackoutDate {
  id: string;
  blackout_date: string;
  name: string | null;
  recurring_yearly: boolean;
  created_at: string;
}

export interface AgentBlackoutDay {
  id: string;
  agent_id: string;
  blackout_type: BlackoutType;
  day_of_week: number | null;
  blackout_date: string | null;
  blackout_end_date: string | null;
  reason: string | null;
  is_active: boolean;
  created_at: string;
}

// =====================================================
// CALL DISTRIBUTION
// =====================================================

export interface CallDistributionSettings {
  id: string;
  distribution_method: DistributionMode;
  buffer_minutes: number;
  call_duration_minutes: number;
  max_advance_business_days: number;
  min_notice_hours: number;
  skip_at_capacity: boolean;
  prioritize_hot_leads: boolean;
  blackout_saturday: boolean;
  blackout_sunday: boolean;
  overflow_to_admin: boolean;
  overflow_distribution_mode: OverflowDistributionMode;
  overflow_auto_assign_time: string | null;
  overflow_auto_assign_on_availability: boolean;
  overflow_notification: 'immediate' | 'daily_digest';
  overflow_ai_message: string | null;
  weekend_request_ai_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentDistributionWeight {
  id: string;
  agent_id: string;
  weight_percent: number;
  max_daily_calls: number;
  current_daily_calls: number;
  last_assigned_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CallDistributionLog {
  id: string;
  contact_id: string | null;
  scheduled_call_id: string | null;
  selected_agent_id: string | null;
  distribution_method: string | null;
  agents_considered: string[] | null;
  selection_reason: string | null;
  created_at: string;
}

// =====================================================
// SCHEDULED CALLS
// =====================================================

export interface ScheduledCall {
  id: string;
  contact_id: string | null;
  agent_id: string | null;
  campaign_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  agent_timezone: string | null;
  lead_timezone: string | null;
  call_type: 'phone' | 'zoom' | 'google_meet';
  meeting_link: string | null;
  status: ScheduledCallStatus;
  weekend_request: boolean;
  overflow_reason: string | null;
  admin_approved: boolean | null;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
  lead_reminder_sent: boolean;
  agent_reminder_sent: boolean;
  outcome: CallOutcomeType | null;
  outcome_notes: string | null;
  plan_sold: string | null;
  rescheduled_from_id: string | null;
  reschedule_count: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledCallWithContact extends ScheduledCall {
  contact: OutreachContact | null;
  agent: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface NoShowEscalation {
  id: string;
  contact_id: string | null;
  scheduled_call_id: string | null;
  no_show_number: number;
  escalation_action: string | null;
  score_adjustment: number | null;
  created_at: string;
}

export interface ScheduledCallFilters {
  status?: ScheduledCallStatus[];
  agent_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  pending_admin?: boolean;
  weekend_request?: boolean;
}

export interface ScheduleCallInput {
  contact_id: string;
  scheduled_at: string;
  agent_id?: string;
  duration_minutes?: number;
  call_type?: 'phone' | 'zoom' | 'google_meet';
  meeting_link?: string;
}

export interface UpdateAgentAvailabilityInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  shift_number?: number;
  is_active?: boolean;
}

export interface AvailableTimeSlot {
  start: string;
  end: string;
  agent_id: string;
  agent_name: string;
}

export interface CallSlotResult {
  available_slots: AvailableTimeSlot[];
  has_overflow: boolean;
  overflow_reason?: string;
}
