// =====================================================
// ADMIN PORTAL TYPES
// =====================================================

export type AdminRole = 'super_admin' | 'admin' | 'agent' | 'support' | 'finance';

export type AdminUserStatus = 'active' | 'inactive' | 'suspended';

export type AccountStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiating' | 'won' | 'lost' | 'unqualified' | 'dormant';

export type LeadSource = 'manual' | 'batch_upload' | 'website_form' | 'referral' | 'transfer';

export type CommissionStatus = 'pending' | 'eligible' | 'approved' | 'paid' | 'forfeited';

export type CommissionType = 'upfront' | 'recurring' | 'annual_onetime' | 'custom_onetime' | 'retention' | 'performance_bonus';

export type BillingInterval = 'month' | 'year' | 'custom';

export type PlanTier = 'individual' | 'teams' | 'addon' | 'custom';

export type PlanCategory = 'crm' | 'web' | 'gold' | 'addon';

export type CouponStatus = 'active' | 'redeemed' | 'expired' | 'revoked';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: AdminRole;
  status: AdminUserStatus;
  hire_date?: string;
  commission_rate: number;
  two_factor_enabled: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CrmAccount {
  id: string;
  business_id?: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  plan_type: string;
  plan_tier: PlanTier;
  billing_interval: BillingInterval;
  monthly_amount: number;
  user_limit: number;
  plan_version: string;
  status: AccountStatus;
  is_trial: boolean;
  trial_ends_at?: string;
  promo_type?: 'self_serve_trial' | 'free_with_web' | null;
  promo_ends_at?: string;
  web_customer_id?: string;
  coupon_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  agent_id?: string;
  lead_id?: string;
  signup_source?: 'self_serve' | 'agent' | 'referral';
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  agent?: AdminUser;
}

export interface WebCustomer {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  plan_type: string;
  billing_interval: BillingInterval;
  monthly_amount: number;
  plan_version: string;
  custom_quote_amount?: number;
  custom_quote_notes?: string;
  status: AccountStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  agent_id?: string;
  lead_id?: string;
  crm_coupon_issued: boolean;
  crm_coupon_id?: string;
  extra_locations: number;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  agent?: AdminUser;
}

export interface Lead {
  id: string;
  agent_id: string;
  assigned_at: string;
  assigned_by?: string;
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  trade_type?: string;
  employee_count?: string;
  current_website?: string;
  current_crm?: string;
  source: LeadSource;
  source_details?: string;
  status: LeadStatus;
  interested_in?: string[];
  preferred_plan?: string;
  estimated_value?: number;
  last_contact_at?: string;
  next_followup_at?: string;
  contact_count: number;
  converted_at?: string;
  crm_account_id?: string;
  web_customer_id?: string;
  notes?: string;
  batch_upload_id?: string;
  created_at: string;
  updated_at: string;
  agent?: AdminUser;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  agent_id: string;
  activity_type: string;
  description?: string;
  old_status?: string;
  new_status?: string;
  old_agent_id?: string;
  new_agent_id?: string;
  reassigned_by?: string;
  reassignment_reason?: string;
  created_at: string;
}

export interface Commission {
  id: string;
  agent_id: string;
  crm_account_id?: string;
  web_customer_id?: string;
  stripe_subscription_id?: string;
  sale_type: string;
  plan_type: string;
  plan_tier?: string;
  billing_interval: BillingInterval;
  sale_amount: number;
  commission_type: CommissionType;
  commission_rate?: number;
  commission_amount: number;
  payment_number?: number;
  retention_milestone?: string;
  status: CommissionStatus;
  eligible_at?: string;
  approved_at?: string;
  approved_by?: string;
  paid_at?: string;
  paid_via?: string;
  payment_reference?: string;
  forfeited_at?: string;
  forfeiture_reason?: string;
  scheduled_payout_date?: string;
  trigger_payment_date?: string;
  sale_date: string;
  created_at: string;
  updated_at: string;
  agent?: AdminUser;
  crm_account?: CrmAccount;
  web_customer?: WebCustomer;
}

export interface CommissionRule {
  id: string;
  plan_type: string;
  plan_tier: PlanTier;
  billing_interval: BillingInterval;
  upfront_amount?: number;
  upfront_delay_payments: number;
  recurring_rate: number;
  recurring_start_payment: number;
  recurring_end_payment: number;
  annual_rate: number;
  annual_renewal_commission: boolean;
  custom_rate: number;
  retention_enabled: boolean;
  month_3_call_bonus: number;
  month_4_bonus: number;
  month_6_bonus: number;
  month_12_bonus: number;
  is_active: boolean;
  version: string;
  effective_from: string;
  effective_until?: string;
}

export interface RetentionTracking {
  id: string;
  crm_account_id?: string;
  web_customer_id?: string;
  agent_id: string;
  month_3_call_completed: boolean;
  month_3_call_date?: string;
  month_3_call_notes?: string;
  month_3_audit_sent: boolean;
  month_3_bonus_paid: boolean;
  month_4_retained: boolean;
  month_4_payment_date?: string;
  month_4_bonus_paid: boolean;
  month_6_retained: boolean;
  month_6_payment_date?: string;
  month_6_bonus_paid: boolean;
  month_12_retained: boolean;
  month_12_payment_date?: string;
  month_12_bonus_paid: boolean;
  total_retention_bonus: number;
  created_at: string;
  updated_at: string;
}

export interface CrmCoupon {
  id: string;
  code: string;
  web_customer_id: string;
  web_plan_type: string;
  crm_plan: string;
  free_months: number;
  status: CouponStatus;
  redeemed_at?: string;
  redeemed_by_account_id?: string;
  expires_at?: string;
  created_by_agent_id?: string;
  created_at: string;
}

export interface PlanPricing {
  id: string;
  plan_type: string;
  plan_name: string;
  plan_tier: PlanTier;
  category: PlanCategory;
  monthly_price?: number;
  annual_price?: number;
  user_limit: number;
  stripe_monthly_price_id?: string;
  stripe_annual_price_id?: string;
  is_active: boolean;
}

export interface PaymentTracking {
  id: string;
  crm_account_id?: string;
  web_customer_id?: string;
  stripe_subscription_id: string;
  agent_id?: string;
  plan_type?: string;
  successful_payments: number;
  upfront_eligible: boolean;
  upfront_paid: boolean;
  recurring_eligible: boolean;
  recurring_end_payment?: number;
  first_payment_at?: string;
  second_payment_at?: string;
  third_payment_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardStats {
  mrr: number;
  mrrChange: number;
  activeCrmAccounts: number;
  activeWebCustomers: number;
  trialConversionRate: number;
  newThisMonth: number;
  churnedThisMonth: number;
  pendingCommissions: number;
  agentCount: number;
}

export interface AgentDashboardStats {
  dealsThisMonth: number;
  revenueThisMonth: number;
  commissionsEligible: number;
  commissionsPaidYtd: number;
  activeLeads: number;
  retentionRate: number;
  dealProgress: { current: number; goal: number };
}

export interface CreateAccountInput {
  business_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  plan_type: string;
  billing_interval: BillingInterval;
  extra_locations?: number;
  include_crm_bonus?: boolean;
  custom_quote_amount?: number;
  custom_quote_notes?: string;
}

export interface CreateLeadInput {
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  trade_type?: string;
  employee_count?: string;
  current_website?: string;
  current_crm?: string;
  interested_in?: string[];
  preferred_plan?: string;
  estimated_value?: number;
  notes?: string;
}

export interface ReassignLeadInput {
  to_agent_id: string;
  reason: string;
  notes?: string;
  notify_new_agent?: boolean;
  notify_old_agent?: boolean;
}

// =====================================================
// SUPPORT TICKET TYPES
// =====================================================

export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketCategory =
  | 'technical_issue'
  | 'billing_question'
  | 'feature_request'
  | 'how_to_question'
  | 'account_issue'
  | 'integration_help'
  | 'bug_report'
  | 'other';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  crm_account_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  business_name: string;

  // Ticket content
  subject: string;
  description: string;
  ai_summary: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  // Chat context
  conversation_context?: string;
  page_context?: string;

  // Assignment
  assigned_to?: string;
  assigned_at?: string;

  // Resolution
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  first_response_at?: string;

  // Relations
  assigned_agent?: AdminUser;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_id: string;
  sender_name: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  ai_summary: string;
  category: TicketCategory;
  priority?: TicketPriority;
  conversation_context?: string;
  page_context?: string;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string;
  resolution_notes?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  waiting_on_customer: number;
  resolved: number;
  closed: number;
  avg_response_time_hours: number;
  avg_resolution_time_hours: number;
}

// =====================================================
// FEATURE REQUEST TYPES
// =====================================================

export type FeatureRequestStatus = 'submitted' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';

export type FeatureRequestPriority = 'low' | 'medium' | 'high';

export type FeatureRequestCategory =
  | 'leads_customers'
  | 'jobs_scheduling'
  | 'quotes_invoices'
  | 'communication'
  | 'reporting'
  | 'integrations'
  | 'mobile_app'
  | 'admin_settings'
  | 'other';

export type FeatureRequestSource = 'client' | 'admin';

export interface FeatureRequest {
  id: string;
  request_number: string;

  // Submitter info
  source: FeatureRequestSource;
  submitter_id: string;
  submitter_name: string;
  submitter_email: string;
  business_name?: string;
  crm_account_id?: string;

  // Request content
  title: string;
  description: string;
  use_case?: string;
  category: FeatureRequestCategory;
  priority: FeatureRequestPriority;
  status: FeatureRequestStatus;

  // Voting
  upvotes: number;
  upvoted_by: string[];

  // Admin response
  admin_notes?: string;
  estimated_timeline?: string;
  assigned_to?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  completed_at?: string;
}

export interface FeatureRequestComment {
  id: string;
  feature_request_id: string;
  commenter_type: 'client' | 'admin';
  commenter_id: string;
  commenter_name: string;
  comment: string;
  is_official_response: boolean;
  created_at: string;
}

export interface CreateFeatureRequestInput {
  title: string;
  description: string;
  use_case?: string;
  category: FeatureRequestCategory;
}

export interface UpdateFeatureRequestInput {
  status?: FeatureRequestStatus;
  priority?: FeatureRequestPriority;
  category?: FeatureRequestCategory;
  admin_notes?: string;
  estimated_timeline?: string;
  assigned_to?: string;
}

export interface FeatureRequestStats {
  total: number;
  submitted: number;
  under_review: number;
  planned: number;
  in_progress: number;
  completed: number;
  declined: number;
}

// =====================================================
// LEADS CAPTAIN DASHBOARD TYPES (formerly NeverMiss)
// =====================================================

export type ConversationStatus = 'captured' | 'booked' | 'no_response' | 'in_progress';

export type LeadUrgency = 'emergency' | 'soon' | 'flexible';

export interface LeadsCaptainConversation {
  id: string;
  client_id: string;
  phone_number: string;
  caller_phone: string;
  status: ConversationStatus;
  lead_name: string | null;
  lead_service_needed: string | null;
  lead_address: string | null;
  lead_urgency: LeadUrgency | null;
  appointment_date: string | null;
  appointment_notes: string | null;
  sms_count: number;
  started_at: string;
  last_message_at: string | null;
  created_at: string;
  messages?: LeadsCaptainMessage[];
}

/** @deprecated Use LeadsCaptainConversation instead */
export type NevermissConversation = LeadsCaptainConversation;

export interface LeadsCaptainMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  message_text: string;
  sent_at: string;
}

/** @deprecated Use LeadsCaptainMessage instead */
export type NevermissMessage = LeadsCaptainMessage;

export interface ClientSmsUsage {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  sms_sent: number;
  sms_cap: number;
  leads_captured: number;
  appointments_booked: number;
  created_at: string;
  updated_at: string;
}

export interface LeadsCaptainDashboardSummary {
  total_missed_calls: number;
  total_leads_captured: number;
  total_appointments_booked: number;
  response_rate: number;
  missed_calls_change: number;
}

/** @deprecated Use LeadsCaptainDashboardSummary instead */
export type NevermissDashboardSummary = LeadsCaptainDashboardSummary;

export interface LeadsCaptainClientSummary {
  client_id: string;
  client_name: string;
  plan_type: string;
  sms_used: number;
  sms_cap: number;
  leads_captured: number;
  status: 'healthy' | 'near_cap' | 'over_cap' | 'low_usage';
  usage_percentage: number;
}

/** @deprecated Use LeadsCaptainClientSummary instead */
export type NevermissClientSummary = LeadsCaptainClientSummary;

export interface LeadsCaptainAlert {
  type: 'near_cap' | 'over_cap' | 'low_usage' | 'declining_rate';
  client_id: string;
  client_name: string;
  message: string;
  details?: string;
}

/** @deprecated Use LeadsCaptainAlert instead */
export type NevermissAlert = LeadsCaptainAlert;

export interface ClientSmsUsageSummary {
  client_id: string;
  client_name: string;
  plan_type: string;
  soft_cap: number;
  messages_used: number;
  usage_percent: number;
  overage_count: number;
  overage_cost: number;
  last_alert_sent: string | null;
  recommended_upgrade: string | null;
}

// =====================================================
// SALES PIPELINE TYPES
// =====================================================

export type PipelineStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

export type LeadActivityType = 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'task_completed';

export type LeadTaskType = 'call' | 'email' | 'demo' | 'proposal' | 'followup' | 'other';

export type PipelineLeadSource = 'website' | 'referral' | 'cold_outreach' | 'google_ads' | 'social';

export interface PipelineLead {
  id: string;
  agent_id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: PipelineLeadSource | null;
  interested_plan: string | null;
  interested_track: string | null;
  estimated_value_cents: number | null;
  notes: string | null;
  stage: PipelineStage;
  stage_changed_at: string;
  lost_reason: string | null;
  converted_client_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  days_in_stage?: number;
  next_task?: PipelineTask | null;
}

export interface PipelineActivity {
  id: string;
  lead_id: string;
  agent_id: string;
  activity_type: LeadActivityType;
  description: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  created_at: string;
}

export interface PipelineTask {
  id: string;
  lead_id: string;
  agent_id: string;
  task_type: LeadTaskType;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  lead?: PipelineLead;
}

export interface PipelineStats {
  stages: {
    stage: PipelineStage;
    count: number;
    value_cents: number;
  }[];
  total_leads: number;
  total_value_cents: number;
  win_rate: number;
}

// =====================================================
// OFFER CODE TYPES
// =====================================================

export type OfferDiscountType = 'percent_first_month' | 'free_trial' | 'percent_forever' | 'flat_waive' | 'percent_months';

export type OfferCommissionImpact = 'reduce_upfront' | 'reduce_all' | 'delay_upfront' | 'none';

export interface OfferCode {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  discount_type: OfferDiscountType;
  discount_value: number | null;
  discount_duration_months: number | null;
  applicable_plans: string[] | null;
  requires_approval: boolean;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  commission_impact_type: OfferCommissionImpact | null;
  commission_impact_value: number | null;
  is_active: boolean;
  created_at: string;
}

export interface OfferUsage {
  id: string;
  offer_code_id: string;
  client_id: string;
  agent_id: string;
  subscription_id: string | null;
  applied_at: string;
}

export interface OfferValidation {
  valid: boolean;
  offer?: OfferCode;
  error?: string;
  commission_impact?: {
    upfront_adjustment: number;
    recurring_adjustment: number;
    description: string;
  };
}

// =====================================================
// ONBOARDING TYPES
// =====================================================

export type OnboardingStatus = 'in_progress' | 'completed' | 'stalled';

export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export type OnboardingAssignee = 'auto' | 'agent' | 'client' | 'team';

export interface OnboardingTemplate {
  id: string;
  plan_track: string;
  phase_number: number;
  phase_name: string;
  created_at: string;
  tasks?: OnboardingTemplateTask[];
}

export interface OnboardingTemplateTask {
  id: string;
  template_id: string;
  task_name: string;
  task_description: string | null;
  assigned_to: OnboardingAssignee | null;
  depends_on_task_id: string | null;
  estimated_days: number | null;
  display_order: number | null;
  created_at: string;
}

export interface ClientOnboarding {
  id: string;
  client_id: string;
  status: OnboardingStatus;
  progress_percent: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  plan_type?: string;
  tasks?: ClientOnboardingTask[];
}

export interface ClientOnboardingTask {
  id: string;
  onboarding_id: string;
  template_task_id: string | null;
  task_name: string;
  phase_name: string | null;
  assigned_to: OnboardingAssignee | null;
  status: OnboardingTaskStatus;
  blocked_reason: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

// =====================================================
// DOCUMENT STORAGE TYPES
// =====================================================

export type DocumentType = 'agreement' | 'feature_sheet' | 'proposal' | 'intake_form' | 'report' | 'other';

export type DocumentCategory = 'agreements' | 'onboarding' | 'proposals' | 'reports' | 'other';

export interface Document {
  id: string;
  client_id: string | null;
  document_type: DocumentType;
  category: DocumentCategory | null;
  name: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  is_template: boolean;
  version: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentUpload {
  name: string;
  description?: string;
  document_type: DocumentType;
  category?: DocumentCategory;
  file: File;
}

// =====================================================
// MULTI-LOCATION TYPES
// =====================================================

export interface ClientLocation {
  id: string;
  client_id: string;
  is_primary: boolean;
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  leads_captain_phone: string | null;
  /** @deprecated Use leads_captain_phone instead */
  nevermiss_phone?: string | null;
  shares_leads_captain_with: string | null;
  /** @deprecated Use shares_leads_captain_with instead */
  shares_nevermiss_with?: string | null;
  gbp_listing_url: string | null;
  gbp_verified: boolean;
  is_addon: boolean;
  addon_price_cents: number | null;
  status: 'active' | 'pending' | 'inactive';
  added_at: string;
  created_at: string;
}

export interface CreateLocationInput {
  location_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  use_separate_leads_captain?: boolean;
  /** @deprecated Use use_separate_leads_captain instead */
  use_separate_nevermiss?: boolean;
}

// =====================================================
// REPORTING TYPES
// =====================================================

export interface AgentDailyStats {
  id: string;
  agent_id: string;
  stat_date: string;
  leads_created: number;
  leads_contacted: number;
  leads_qualified: number;
  proposals_sent: number;
  deals_won: number;
  deals_lost: number;
  revenue_won_cents: number;
  commission_earned_cents: number;
  calls_made: number;
  emails_sent: number;
  meetings_held: number;
  created_at: string;
}

export interface PerformanceReport {
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    deals_won: number;
    deals_won_change: number;
    revenue_monthly: number;
    revenue_change: number;
    avg_deal_size: number;
    avg_deal_change: number;
    win_rate: number;
    win_rate_change: number;
  };
  sales_by_track: {
    track: string;
    deals: number;
    revenue_monthly: number;
    percentage: number;
    avg_commission: number;
  }[];
  pipeline_health: {
    stage: PipelineStage;
    leads: number;
    value_cents: number;
    avg_days: number;
    conversion_rate: number;
  }[];
  trend_data: {
    date: string;
    deals: number;
    revenue: number;
  }[];
}

export interface LeadSourceReport {
  period: string;
  sources: {
    source: PipelineLeadSource;
    leads: number;
    won: number;
    win_rate: number;
    revenue: number;
    cost_per_lead: number;
  }[];
  insights: string[];
}

export interface RetentionReport {
  period: string;
  overview: {
    active_clients: number;
    churned_this_month: number;
    retention_rate: number;
    avg_tenure_months: number;
  };
  churn_details: {
    client_name: string;
    plan_type: string;
    tenure_months: number;
    reason: string;
    lost_revenue: number;
  }[];
  at_risk_clients: {
    client_id: string;
    client_name: string;
    plan_type: string;
    last_login_days: number;
  }[];
}

export interface TeamLeaderboard {
  period: string;
  rankings: {
    rank: number;
    agent_id: string;
    agent_name: string;
    deals: number;
    revenue: number;
    commission: number;
    vs_goal_percent: number;
  }[];
  team_totals: {
    total_deals: number;
    total_revenue: number;
    total_commission: number;
  };
}
