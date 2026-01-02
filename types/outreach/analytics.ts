// =====================================================
// ANALYTICS & METRICS TYPES
// =====================================================

import type { CompetitorMentionType } from './enums';

export interface SpeedMetrics {
  id: string;
  contact_id: string;
  form_submitted_at: string | null;
  first_text_sent_at: string | null;
  first_reply_at: string | null;
  qualified_at: string | null;
  call_booked_at: string | null;
  call_completed_at: string | null;
  closed_at: string | null;
  form_to_first_text_seconds: number | null;
  first_text_to_reply_seconds: number | null;
  reply_to_qualified_seconds: number | null;
  qualified_to_booked_seconds: number | null;
  reply_to_booked_seconds: number | null;
  met_60_second_target: boolean | null;
  met_5_minute_reply_target: boolean | null;
  met_30_minute_booking_target: boolean | null;
  created_at: string;
}

export interface LeadReassignment {
  id: string;
  from_agent_id: string;
  to_agent_id: string | null;
  reason: 'leaving' | 'vacation' | 'load_balance' | 'performance' | 'request';
  leads_count: number;
  lead_ids: string[] | null;
  distribution_method: string | null;
  notify_new_agent: boolean;
  notify_leads: boolean;
  performed_by: string | null;
  performed_at: string;
}

export interface LeadEnrichment {
  id: string;
  contact_id: string;
  website_url: string | null;
  company_size: string | null;
  estimated_revenue: string | null;
  years_in_business: number | null;
  founded_year: number | null;
  google_review_count: number | null;
  google_review_avg: number | null;
  google_place_id: string | null;
  website_platform: string | null;
  website_age_years: number | null;
  has_ssl: boolean | null;
  mobile_friendly: boolean | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  ai_insights: Record<string, unknown> | null;
  enrichment_provider: string | null;
  enriched_at: string;
}

export interface CompetitorMention {
  id: string;
  contact_id: string;
  competitor_name: string | null;
  mention_type: CompetitorMentionType | null;
  contract_end_date: string | null;
  likes: string | null;
  dislikes: string | null;
  switching_reason: string | null;
  message_id: string | null;
  detected_at: string;
}

export interface RevenueForecast {
  id: string;
  forecast_month: string;
  predicted_mrr: number | null;
  predicted_mrr_low: number | null;
  predicted_mrr_high: number | null;
  confidence_pct: number | null;
  actual_mrr: number | null;
  variance_pct: number | null;
  pipeline_snapshot: Record<string, unknown> | null;
  generated_at: string;
}

export interface AttributionTouchpoint {
  id: string;
  contact_id: string;
  touchpoint_type: string;
  touchpoint_at: string;
  touchpoint_details: Record<string, unknown> | null;
  converted: boolean;
  conversion_value_cents: number | null;
  first_touch_credit: number | null;
  last_touch_credit: number | null;
  linear_credit: number | null;
  time_decay_credit: number | null;
  position_credit: number | null;
  created_at: string;
}

// =====================================================
// DASHBOARD & ANALYTICS TYPES
// =====================================================

export interface OutreachDashboardStats {
  today: {
    new_leads: number;
    replies: number;
    qualified: number;
    calls_scheduled: number;
    calls_completed: number;
  };
  week: {
    new_leads: number;
    replies: number;
    qualified: number;
    calls_scheduled: number;
    calls_completed: number;
    conversions: number;
  };
  speed_metrics: {
    avg_first_text_seconds: number;
    avg_reply_to_booked_seconds: number;
    percent_under_60_seconds: number;
  };
  conversion_funnel: {
    contacted: number;
    replied: number;
    qualified: number;
    scheduled: number;
    converted: number;
  };
}

export interface AgentPerformanceStats {
  agent_id: string;
  agent_name: string;
  calls_today: number;
  calls_completed_today: number;
  calls_no_show: number;
  conversions_this_week: number;
  conversion_rate: number;
  avg_call_duration_minutes: number;
}

export interface AgentAchievement {
  id: string;
  agent_id: string;
  achievement_type: string;
  achievement_name: string | null;
  achievement_description: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  value: number | null;
  earned_at: string;
  expires_at: string | null;
  notified: boolean;
}
