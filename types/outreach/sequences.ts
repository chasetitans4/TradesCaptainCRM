// =====================================================
// NURTURE SEQUENCE TYPES
// =====================================================

import type {
  NurtureTriggerType,
  NurtureEnrollmentStatus,
  ReferralStatus,
  RewardStatus,
} from './enums';

export interface NurtureSequence {
  id: string;
  name: string;
  description: string | null;
  trigger_type: NurtureTriggerType;
  trigger_conditions: Record<string, unknown> | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NurtureSequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  message_template: string;
  exit_on_reply: boolean;
  require_business_hours: boolean;
  send_time: string | null;
  created_at: string;
}

export interface NurtureSequenceWithSteps extends NurtureSequence {
  steps: NurtureSequenceStep[];
}

export interface NurtureEnrollment {
  id: string;
  contact_id: string;
  sequence_id: string;
  current_step: number;
  status: NurtureEnrollmentStatus;
  enrolled_at: string;
  enrolled_by: string | null;
  enrolled_reason: string | null;
  next_message_at: string | null;
  exited_at: string | null;
  exit_reason: string | null;
  created_at: string;
}

export interface CreateNurtureSequenceInput {
  name: string;
  description?: string;
  trigger_type: NurtureTriggerType;
  trigger_conditions?: Record<string, unknown>;
  steps: {
    step_number: number;
    delay_days: number;
    message_template: string;
    exit_on_reply?: boolean;
  }[];
}

// =====================================================
// REFERRALS
// =====================================================

export interface ReferralSubmission {
  id: string;
  referrer_client_id: string;
  referrer_agent_id: string | null;
  referral_name: string;
  referral_phone: string;
  referral_company: string | null;
  referral_trade: string | null;
  referral_email: string | null;
  referral_notes: string | null;
  outreach_contact_id: string | null;
  status: ReferralStatus;
  reward_amount_cents: number;
  reward_status: RewardStatus;
  reward_earned_at: string | null;
  reward_paid_at: string | null;
  reward_notes: string | null;
  referrer_notified_on_contact: boolean;
  referrer_notified_on_conversion: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReferralInput {
  referrer_client_id: string;
  referral_name: string;
  referral_phone: string;
  referral_company?: string;
  referral_trade?: string;
  referral_email?: string;
  referral_notes?: string;
}
