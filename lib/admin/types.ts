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
