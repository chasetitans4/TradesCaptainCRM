// =====================================================
// CAMPAIGN TYPES
// =====================================================

import type { CampaignType, CampaignStatus, ABTestType, ABTestStatus } from './enums';

export interface OutreachCampaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  initial_message_template: string;
  ai_system_prompt: string | null;
  ai_goal: 'qualify_and_book' | 'qualify_only' | 'book_only' | null;
  max_ai_messages: number;
  trigger_type: 'immediate' | 'delayed' | 'scheduled' | null;
  trigger_delay_minutes: number;
  sending_window_start: string | null;
  sending_window_end: string | null;
  sending_days: number[];
  daily_send_limit: number | null;
  trigger_source: string | null;
  trigger_conditions: Record<string, unknown> | null;
  contacts_total: number;
  contacts_messaged: number;
  contacts_replied: number;
  contacts_qualified: number;
  demos_booked: number;
  deals_closed: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  initial_message_template: string;
  ai_system_prompt?: string;
  ai_goal?: 'qualify_and_book' | 'qualify_only' | 'book_only';
  trigger_type?: 'immediate' | 'delayed' | 'scheduled';
  trigger_delay_minutes?: number;
  sending_window_start?: string;
  sending_window_end?: string;
  sending_days?: number[];
  daily_send_limit?: number;
}

// =====================================================
// A/B TESTING
// =====================================================

export interface ABTest {
  id: string;
  name: string;
  description: string | null;
  test_type: ABTestType;
  campaign_id: string | null;
  status: ABTestStatus;
  sample_size_target: number | null;
  confidence_threshold: number;
  start_date: string | null;
  end_date: string | null;
  winner_variant_id: string | null;
  winning_metric: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ABTestVariant {
  id: string;
  test_id: string;
  variant_name: string;
  is_control: boolean;
  traffic_percent: number;
  content: string;
  content_type: string | null;
  impressions: number;
  replies: number;
  qualified: number;
  booked: number;
  converted: number;
  reply_rate: number | null;
  qualification_rate: number | null;
  booking_rate: number | null;
  conversion_rate: number | null;
  created_at: string;
}

export interface ABTestWithVariants extends ABTest {
  variants: ABTestVariant[];
}
