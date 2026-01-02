// =====================================================
// INTEGRATION TYPES
// =====================================================

export interface SlackSettings {
  id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  access_token: string | null;
  bot_token: string | null;
  connected_by: string | null;
  connected_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_type: string | null;
  agent_id: string | null;
  notify_new_leads: boolean;
  notify_hot_leads: boolean;
  notify_qualified: boolean;
  notify_booked: boolean;
  notify_closed: boolean;
  notify_no_shows: boolean;
  notify_speed_alerts: boolean;
  notify_escalations: boolean;
  is_active: boolean;
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string | null;
  url: string;
  secret_key: string | null;
  event_new_lead: boolean;
  event_qualified: boolean;
  event_call_scheduled: boolean;
  event_call_completed: boolean;
  event_deal_closed: boolean;
  event_opt_out: boolean;
  retry_count: number;
  timeout_seconds: number;
  is_active: boolean;
  last_triggered_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  failure_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  success: boolean | null;
  error_message: string | null;
  retry_count: number;
  delivered_at: string;
}

export interface LeadImport {
  id: string;
  filename: string;
  source_label: string;
  source_campaign: string | null;
  total_rows: number | null;
  imported_count: number | null;
  skipped_duplicates: number | null;
  skipped_invalid: number | null;
  skipped_dnc: number | null;
  skipped_opted_out: number | null;
  check_dnc: boolean;
  check_opt_outs: boolean;
  skip_duplicates: boolean;
  normalize_phones: boolean;
  auto_start_campaign: boolean;
  column_mapping: Record<string, string> | null;
  error_details: Record<string, unknown> | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  assign_to_agent_id: string | null;
  assign_to_campaign_id: string | null;
  imported_by: string | null;
  created_at: string;
}

export interface SchedulingLink {
  id: string;
  agent_id: string | null;
  slug: string;
  link_type: 'agent' | 'team' | 'campaign';
  campaign_id: string | null;
  use_agent_hours: boolean;
  custom_hours: Record<string, unknown> | null;
  require_name: boolean;
  require_phone: boolean;
  require_email: boolean;
  require_trade: boolean;
  require_company: boolean;
  custom_fields: Record<string, unknown> | null;
  logo_url: string | null;
  primary_color: string;
  header_text: string;
  description_text: string | null;
  max_bookings_per_day: number | null;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
  bookings_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailPreferences {
  id: string;
  agent_id: string;
  email: string;
  new_lead_assigned: boolean;
  hot_lead_alert: boolean;
  call_reminder: boolean;
  call_reminder_minutes: number;
  daily_summary: boolean;
  daily_summary_time: string;
  weekly_performance: boolean;
  speed_alerts: boolean;
  escalation_alerts: boolean;
  overflow_alerts: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
