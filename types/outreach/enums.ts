// =====================================================
// OUTREACH ENUMS & CONSTANTS
// =====================================================

export type OutreachContactSource =
  | 'SMS'
  | 'SMS_WIDGET'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'INBOUND_CALL'
  | 'COLD_EMAIL'
  | 'MANUAL';

export type OutreachContactStatus =
  | 'pending'
  | 'contacted'
  | 'replied'
  | 'qualifying'
  | 'qualified'
  | 'call_scheduled'
  | 'call_completed'
  | 'pending_admin'
  | 'converted'
  | 'nurture'
  | 'opted_out'
  | 'unresponsive';

export type ScheduledCallStatus =
  | 'scheduled'
  | 'pending_admin_approval'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'rescheduled';

export type CallOutcomeType =
  | 'closed'
  | 'demo_scheduled'
  | 'callback'
  | 'not_interested'
  | 'no_answer'
  | 'wrong_number';

export type DistributionMode =
  | 'round_robin'
  | 'weighted'
  | 'availability_first'
  | 'skill_based'
  | 'least_busy';

export type CampaignType =
  | 'website_instant'
  | 'referral'
  | 'reengagement'
  | 'scheduled'
  | 'sms_widget';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export type ConsentType = 'express_written' | 'express' | 'implied';

export type ConsentSource =
  | 'website_form'
  | 'referral_submit'
  | 'inbound_inquiry'
  | 'sms_widget';

export type MessageDirection = 'outbound' | 'inbound';
export type MessageSenderType = 'ai' | 'human' | 'lead' | 'system';

export type MessageDeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'received';

export type AIIntent =
  | 'interested'
  | 'question'
  | 'objection'
  | 'stop'
  | 'scheduling'
  | 'pricing'
  | 'confused'
  | 'positive'
  | 'negative'
  | 'neutral';

export type InterestLevel = 'hot' | 'warm' | 'cold';

export type NurtureTriggerType =
  | 'manual'
  | 'not_ready'
  | 'no_show'
  | 'competitor_contract'
  | 'cold_lead';

export type NurtureEnrollmentStatus =
  | 'active'
  | 'completed'
  | 'exited'
  | 'converted'
  | 'paused';

export type ReferralStatus =
  | 'submitted'
  | 'contacted'
  | 'qualified'
  | 'scheduled'
  | 'converted'
  | 'lost';

export type RewardStatus = 'pending' | 'earned' | 'paid' | 'voided';

export type ABTestType =
  | 'initial_message'
  | 'timing'
  | 'qualification'
  | 'call_time';

export type ABTestStatus = 'draft' | 'running' | 'completed' | 'stopped';

export type BlackoutType = 'recurring' | 'specific';

export type OverflowDistributionMode = 'manual' | 'auto' | 'hybrid';

export type DNCStatus =
  | 'clean'
  | 'federal_dnc'
  | 'state_dnc'
  | 'litigator'
  | 'error';

export type CompetitorMentionType =
  | 'current_user'
  | 'considering'
  | 'past_user'
  | 'contract_bound';
