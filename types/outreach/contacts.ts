// =====================================================
// CONTACT TYPES
// =====================================================

import type {
  OutreachContactSource,
  OutreachContactStatus,
  InterestLevel,
} from './enums';
import type { OutreachCampaign } from './campaigns';
import type { OutreachConversation } from './conversations';
import type { ScheduledCall } from './calls';

export interface OutreachContact {
  id: string;
  campaign_id: string | null;
  phone: string;
  name: string | null;
  company_name: string | null;
  email: string | null;
  trade: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  timezone_source: 'area_code' | 'user_provided' | 'city_state' | 'default' | null;
  source: OutreachContactSource;
  source_campaign: string | null;
  source_details: Record<string, unknown> | null;
  referrer_client_id: string | null;
  consent_id: string | null;
  status: OutreachContactStatus;
  overflow_to_admin: boolean;
  overflow_reason: string | null;
  overflow_at: string | null;
  admin_notified: boolean;
  admin_assigned_by: string | null;
  admin_assigned_at: string | null;
  score: number;
  score_breakdown: Record<string, number> | null;
  interest_level: InterestLevel | null;
  pain_points: string[] | null;
  current_solution: string | null;
  timeline: string | null;
  budget_signal: string | null;
  recommended_plan: string | null;
  qualification_summary: string | null;
  decision_maker: boolean | null;
  decision_maker_name: string | null;
  scheduled_call_id: string | null;
  assigned_agent_id: string | null;
  converted_at: string | null;
  converted_client_id: string | null;
  converted_plan: string | null;
  messages_sent: number;
  messages_received: number;
  first_message_at: string | null;
  last_message_at: string | null;
  first_reply_at: string | null;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachContactWithRelations extends OutreachContact {
  campaign: OutreachCampaign | null;
  conversation: OutreachConversation | null;
  scheduled_call: ScheduledCall | null;
  assigned_agent: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface OutreachContactFilters {
  status?: OutreachContactStatus[];
  source?: OutreachContactSource[];
  interest_level?: InterestLevel[];
  assigned_agent_id?: string;
  campaign_id?: string;
  overflow_to_admin?: boolean;
  search?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface CreateOutreachContactInput {
  phone: string;
  name?: string;
  company_name?: string;
  email?: string;
  trade?: string;
  city?: string;
  state?: string;
  source: OutreachContactSource;
  source_campaign?: string;
  source_details?: Record<string, unknown>;
  referrer_client_id?: string;
  campaign_id?: string;
}
