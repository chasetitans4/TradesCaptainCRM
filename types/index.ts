// =====================================================
// TRADES CAPTAIN MICRO CRM - TYPE DEFINITIONS
// =====================================================

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export type PlanTier = 'starter' | 'growth' | 'pro';
export type UserRole = 'owner' | 'admin' | 'technician';
export type UserStatus = 'pending' | 'active' | 'deactivated';

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'scheduled' | 'won' | 'lost';
export type LeadUrgency = 'low' | 'normal' | 'high' | 'emergency';
export type LeadSource = 'website_chat' | 'phone' | 'ai_sms' | 'manual' | 'missed_call' | 'referral';

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PhotoLabel = 'before' | 'after' | 'issue' | 'other';

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'stripe' | 'cash' | 'check' | 'venmo' | 'zelle' | 'other';

export type SMSDirection = 'inbound' | 'outbound';
export type SMSSender = 'customer' | 'ai' | 'staff';
export type SMSStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type ConversationStatus = 'active' | 'closed' | 'opted_out';

export type ReminderRetention = '30_days' | 'forever';
export type ReminderType = 'day_before' | 'hour_before';
export type AutomationType = 'review_request' | 'review_followup' | 'lead_followup' | 'quote_followup';
export type EventStatus = 'pending' | 'sent' | 'skipped' | 'failed';

export type CallDirection = 'inbound' | 'outbound';
export type CallOutcome = 'answered' | 'voicemail' | 'no_answer' | 'scheduled' | 'not_interested' | 'callback_requested';

export type TradeType = 'plumbing' | 'hvac' | 'electrical' | 'roofing' | 'general' | 'other';

// =====================================================
// BASE TYPES
// =====================================================

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  [day: string]: {
    start: string;
    end: string;
  } | null;
}

export interface NotificationSettings {
  customer_reminders: {
    enabled: boolean;
    day_before: boolean;
    hour_before: boolean;
  };
  push_notifications: {
    new_leads: boolean;
    customer_confirms: boolean;
    customer_reschedules: boolean;
    reminders_sent_summary: boolean;
    personal_reminders: boolean;
    lead_limit_warnings: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  muted_until: string | null;
}

export interface UserNotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  push_events: {
    assigned_jobs: boolean;
    schedule_changes: boolean;
    new_leads: boolean;
    customer_confirms: boolean;
    customer_reschedules: boolean;
    reminders: boolean;
  };
  email_events: {
    assigned_jobs: boolean;
    schedule_changes: boolean;
    new_leads: boolean;
    daily_summary: boolean;
  };
}

// =====================================================
// BUSINESS
// =====================================================

export interface Business extends Timestamps {
  id: string;
  
  // Account
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  owner_phone: string | null;
  
  // Plan
  plan_tier: PlanTier;
  leads_limit: number | null;
  leads_used: number;
  leads_reset_date: string | null;
  
  // Settings
  timezone: string;
  trade_type: TradeType | null;
  service_area: string[] | null;
  business_hours: BusinessHours | null;
  tax_rate: number;
  
  // Branding
  logo_url: string | null;
  primary_color: string;
  
  // Review Links
  review_link_google: string | null;
  review_link_yelp: string | null;
  review_link_facebook: string | null;
  review_link_primary: 'google' | 'yelp' | 'facebook';
  
  // AI SMS Settings
  ai_sms_enabled: boolean;
  ai_sms_disabled_until: string | null;
  ai_late_night_acknowledgment: boolean;
  
  // Notification Settings
  settings_notifications: NotificationSettings;
  
  // Onboarding
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  walkthrough_completed: boolean;
  walkthrough_completed_at: string | null;
  tips_seen: string[];
  guides_completed: string[];
}

// =====================================================
// USER
// =====================================================

export interface User extends Timestamps {
  id: string;
  
  // Auth
  email: string;
  auth_user_id: string | null;
  
  // Profile
  name: string;
  phone: string | null;
  avatar_url: string | null;
  
  // Business relationship
  business_id: string;
  role: UserRole;
  
  // Invitation
  invited_by: string | null;
  invited_at: string | null;
  invite_token: string | null;
  accepted_at: string | null;
  status: UserStatus;
  
  // Notification preferences
  notification_settings: UserNotificationSettings;
}

export interface UserWithBusiness extends User {
  business: Business;
}

// =====================================================
// EMAIL RECIPIENT
// =====================================================

export interface EmailRecipient extends Timestamps {
  id: string;
  business_id: string;
  
  email: string;
  name: string | null;
  role_label: string | null;
  
  notify_new_leads: boolean;
  notify_customer_confirms: boolean;
  notify_customer_reschedules: boolean;
  notify_lead_limit: boolean;
  notify_daily_summary: boolean;
  notify_weekly_summary: boolean;
  
  is_verified: boolean;
  verified_at: string | null;
  verification_token: string | null;
}

// =====================================================
// CUSTOMER
// =====================================================

export interface Customer extends Timestamps {
  id: string;
  business_id: string;
  
  name: string;
  phone: string;
  email: string | null;
  
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  
  timezone: string | null;
  notes: string | null;
  tags: string[];
  source: LeadSource | null;
  
  total_jobs: number;
  total_revenue: number;
  last_job_date: string | null;
}

export interface CustomerWithHistory extends Customer {
  jobs: Job[];
  leads: Lead[];
  conversations: SMSConversation[];
  call_logs: CallLog[];
}

// =====================================================
// LEAD
// =====================================================

export interface Lead extends Timestamps {
  id: string;
  business_id: string;
  customer_id: string | null;
  
  name: string;
  phone: string;
  email: string | null;
  
  service_needed: string | null;
  description: string | null;
  urgency: LeadUrgency | null;
  
  status: LeadStatus;
  lost_reason: string | null;
  source: LeadSource;
  
  assigned_to: string | null;
  estimated_value: number | null;
}

export interface LeadWithRelations extends Lead {
  customer: Customer | null;
  assigned_user: User | null;
  jobs: Job[];
  quotes: Quote[];
}

// =====================================================
// JOB
// =====================================================

export interface Job extends Timestamps {
  id: string;
  business_id: string;
  customer_id: string | null;
  lead_id: string | null;
  
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  
  service_type: string;
  description: string | null;
  status: JobStatus;
  
  tech_notes: string | null;
  
  job_address_line1: string | null;
  job_address_city: string | null;
  job_address_state: string | null;
  job_address_zip: string | null;
  
  assigned_to: string | null;
  
  completed_at: string | null;
  completion_notes: string | null;
  
  customer_reminders_enabled: boolean;
  customer_confirmed: boolean;
  customer_confirmed_at: string | null;
  
  google_calendar_event_id: string | null;
}

export interface JobWithRelations extends Job {
  customer: Customer | null;
  lead: Lead | null;
  assigned_user: User | null;
  notes: JobNote[];
  photos: JobPhoto[];
  reminders: Reminder[];
  quotes: Quote[];
  invoices: Invoice[];
}

// =====================================================
// JOB NOTE
// =====================================================

export interface JobNote {
  id: string;
  job_id: string;
  user_id: string | null;
  created_at: string;
  content: string;
}

export interface JobNoteWithUser extends JobNote {
  user: User | null;
}

// =====================================================
// JOB PHOTO
// =====================================================

export interface JobPhoto {
  id: string;
  job_id: string;
  user_id: string | null;
  created_at: string;
  
  url: string;
  label: PhotoLabel | null;
  notes: string | null;
  sort_order: number;
}

export interface JobPhotoWithUser extends JobPhoto {
  user: User | null;
}

// =====================================================
// QUOTE
// =====================================================

export interface Quote extends Timestamps {
  id: string;
  business_id: string;
  customer_id: string | null;
  lead_id: string | null;
  job_id: string | null;
  
  quote_number: string;
  status: QuoteStatus;
  
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  
  converted_to_invoice: boolean;
  converted_at: string | null;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface QuoteWithItems extends Quote {
  items: QuoteItem[];
  customer: Customer | null;
}

// =====================================================
// INVOICE
// =====================================================

export interface Invoice extends Timestamps {
  id: string;
  business_id: string;
  customer_id: string | null;
  quote_id: string | null;
  job_id: string | null;
  
  invoice_number: string;
  status: InvoiceStatus;
  
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  
  due_date: string | null;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  stripe_payment_link: string | null;
  stripe_payment_id: string | null;
  
  notes: string | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  customer: Customer | null;
}

// =====================================================
// SAVED SERVICE
// =====================================================

export interface SavedService {
  id: string;
  business_id: string;
  
  name: string;
  description: string | null;
  default_price: number;
  category: 'labor' | 'parts' | 'flat_rate' | null;
}

// =====================================================
// REMINDER
// =====================================================

export interface Reminder {
  id: string;
  business_id: string;
  user_id: string | null;
  created_at: string;
  
  title: string;
  notes: string | null;
  
  remind_at: string;
  
  job_id: string | null;
  customer_id: string | null;
  lead_id: string | null;
  
  completed: boolean;
  completed_at: string | null;
  snoozed_until: string | null;
  
  retention: ReminderRetention;
}

export interface ReminderWithRelations extends Reminder {
  job: Job | null;
  customer: Customer | null;
  lead: Lead | null;
  user: User | null;
}

// =====================================================
// SMS
// =====================================================

export interface SMSConversation extends Timestamps {
  id: string;
  business_id: string;
  customer_id: string | null;
  lead_id: string | null;
  
  phone: string;
  status: ConversationStatus;
  
  last_customer_message_at: string | null;
  is_customer_initiated: boolean;
}

export interface SMSMessage {
  id: string;
  conversation_id: string;
  created_at: string;
  
  direction: SMSDirection;
  sender: SMSSender;
  sender_user_id: string | null;
  body: string;
  
  status: SMSStatus;
  
  forwarded_to: string | null;
  forwarded_at: string | null;
  
  metadata: Record<string, unknown> | null;
}

export interface SMSConversationWithMessages extends SMSConversation {
  messages: SMSMessage[];
  customer: Customer | null;
}

// =====================================================
// CUSTOMER REMINDER EVENTS
// =====================================================

export interface CustomerReminderEvent {
  id: string;
  job_id: string;
  customer_id: string | null;
  business_id: string;
  
  type: ReminderType;
  scheduled_for: string;
  sent_at: string | null;
  
  status: EventStatus;
  skip_reason: string | null;
  
  customer_response: 'confirmed' | 'reschedule' | 'no_response' | null;
  customer_response_at: string | null;
}

// =====================================================
// AUTOMATION EVENT
// =====================================================

export interface AutomationEvent {
  id: string;
  business_id: string;
  
  job_id: string | null;
  customer_id: string | null;
  lead_id: string | null;
  quote_id: string | null;
  
  type: AutomationType;
  
  scheduled_for: string;
  executed_at: string | null;
  
  status: EventStatus;
  skip_reason: string | null;
}

// =====================================================
// CALL LOG
// =====================================================

export interface CallLog {
  id: string;
  business_id: string;
  customer_id: string | null;
  lead_id: string | null;
  user_id: string | null;
  created_at: string;
  
  phone: string;
  direction: CallDirection;
  duration_seconds: number | null;
  
  outcome: CallOutcome | null;
  notes: string | null;
}

export interface CallLogWithUser extends CallLog {
  user: User | null;
}

// =====================================================
// EMAIL LOG
// =====================================================

export interface EmailLog {
  id: string;
  business_id: string;
  created_at: string;
  
  recipient_email: string;
  recipient_name: string | null;
  recipient_id: string | null;
  
  email_type: string;
  subject: string;
  
  lead_id: string | null;
  job_id: string | null;
  
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  error_message: string | null;
}

// =====================================================
// KNOWLEDGE BASE
// =====================================================

export interface KBArticle extends Timestamps {
  id: string;
  
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  read_time_minutes: number;
  
  category: string;
  sort_order: number;
  
  related_articles: string[];
  
  is_published: boolean;
  is_featured: boolean;
  
  search_keywords: string[];
  show_on_screens: string[];
}

export interface KBArticleFeedback {
  id: string;
  article_id: string;
  user_id: string | null;
  created_at: string;
  
  helpful: boolean;
  comment: string | null;
}

// =====================================================
// DASHBOARD TYPES
// =====================================================

export interface DashboardStats {
  todayJobs: number;
  newLeads: number;
  needsFollowUp: number;
  weekRevenue: number;
  weekJobs: number;
  weekLeads: number;
  leadsUsed: number;
  leadsLimit: number | null;
  leadsResetDate: string | null;
}

export interface TodayReminder extends Reminder {
  job?: {
    service_type: string;
    customer?: {
      name: string;
    };
  };
}

export interface TodayJob extends Job {
  customer: Customer | null;
  reminders_count: number;
}

// =====================================================
// FORM TYPES
// =====================================================

export interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  service_needed?: string;
  description?: string;
  urgency?: LeadUrgency;
  source?: LeadSource;
  estimated_value?: number;
}

export interface CreateJobInput {
  customer_id?: string;
  lead_id?: string;
  scheduled_date: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  service_type: string;
  description?: string;
  job_address_line1?: string;
  job_address_city?: string;
  job_address_state?: string;
  job_address_zip?: string;
  assigned_to?: string;
  customer_reminders_enabled?: boolean;
}

export interface CreateQuoteInput {
  customer_id?: string;
  lead_id?: string;
  job_id?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
  }[];
  valid_until?: string;
  notes?: string;
  terms?: string;
}

export interface CreateReminderInput {
  title: string;
  notes?: string;
  remind_at: string;
  job_id?: string;
  customer_id?: string;
  lead_id?: string;
  retention?: ReminderRetention;
}

export interface InviteTeamMemberInput {
  email: string;
  name: string;
  role: 'admin' | 'technician';
  notification_settings?: Partial<UserNotificationSettings>;
}

export interface AddEmailRecipientInput {
  email: string;
  name?: string;
  role_label?: string;
  notify_new_leads?: boolean;
  notify_customer_confirms?: boolean;
  notify_customer_reschedules?: boolean;
  notify_lead_limit?: boolean;
  notify_daily_summary?: boolean;
  notify_weekly_summary?: boolean;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =====================================================
// FILTER/SORT TYPES
// =====================================================

export interface LeadFilters {
  status?: LeadStatus[];
  source?: LeadSource[];
  urgency?: LeadUrgency[];
  assigned_to?: string;
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface JobFilters {
  status?: JobStatus[];
  assigned_to?: string;
  customer_id?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: string;
  direction: SortDirection;
}

// =====================================================
// CALENDAR TYPES (Nylas Integration)
// =====================================================

export type CalendarProvider = 'google' | 'icloud' | 'microsoft';

export interface CalendarConnection {
  id: string;
  user_id: string;
  nylas_grant_id: string;
  provider: CalendarProvider;
  email: string;
  calendar_id: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  id: string;
  business_id: string;
  user_id: string | null;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  is_working_day: boolean;
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  created_at: string;
}

export interface ScheduleBlock {
  id: string;
  business_id: string;
  user_id: string | null;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  label: string;
  is_recurring: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  busy: boolean;
  source?: 'job' | 'personal' | 'break';
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface DriveTimeSettings {
  enabled: boolean;
  default_minutes: number;
}

// Calendar event display type for UI
export interface CalendarDisplayEvent {
  id: string;
  type: 'job' | 'personal' | 'break';
  title: string;
  start: string;
  end: string;
  color: string;
  editable: boolean;
  job_id?: string;
  customer?: {
    name: string;
    phone?: string;
  };
  source?: 'external';
}

// Input types for calendar operations
export interface CreateScheduleBlockInput {
  day_of_week?: number;
  specific_date?: string;
  start_time: string;
  end_time: string;
  label: string;
  is_recurring?: boolean;
}

export interface UpdateWorkingHoursInput {
  day_of_week: number;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  suggested?: TimeSlot;
}

export interface AvailabilitySlotsResult {
  slots: TimeSlot[];
}

// =====================================================
// TWILIO SMS & PHONE TYPES
// =====================================================

export type SMSTemplateCategory = 'appointment' | 'follow_up' | 'quote' | 'invoice' | 'general';
export type ScheduledMessageStatus = 'pending' | 'sent' | 'cancelled' | 'failed';
export type CallForwardingMode = 'voicemail' | 'forward_owner' | 'forward_custom' | 'forward_sequential' | 'forward_simultaneous';
export type AISMSTone = 'professional' | 'friendly' | 'casual';

export interface SMSTemplate {
  id: string;
  business_id: string;
  name: string;
  content: string;
  category: SMSTemplateCategory | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMessage {
  id: string;
  business_id: string;
  customer_id: string | null;
  job_id: string | null;
  phone_number: string;
  content: string;
  scheduled_for: string;
  status: ScheduledMessageStatus;
  sent_at: string | null;
  twilio_sid: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CallForwardingSettings {
  mode: CallForwardingMode;
  forward_numbers: string[];
  ring_timeout: number;
  business_hours_only: boolean;
  after_hours_mode: CallForwardingMode;
  voicemail_greeting_url?: string;
}

export interface AISMSSettings {
  enabled: boolean;
  quiet_start: string; // HH:MM
  quiet_end: string;   // HH:MM
  knowledge_base: string | null;
  tone: AISMSTone;
}

export interface PhoneNumberSettings {
  phone_number: string | null;
  phone_sid: string | null;
  strategy: 'single' | 'per_location';
}

// Extended SMS Conversation with handoff tracking
export interface SMSConversationExtended extends SMSConversation {
  ai_response_count: number;
  needs_human_attention: boolean;
  human_attention_reason: string | null;
  human_attention_at: string | null;
}

// SMS Message with Twilio fields
export interface SMSMessageExtended extends SMSMessage {
  twilio_sid: string | null;
  is_ai_response: boolean;
  error_message: string | null;
}

// Input types for SMS operations
export interface SendSMSInput {
  to: string;
  message: string;
  customer_id?: string;
  job_id?: string;
}

export interface CreateSMSTemplateInput {
  name: string;
  content: string;
  category?: SMSTemplateCategory;
  is_default?: boolean;
}

export interface ScheduleMessageInput {
  customer_id?: string;
  job_id?: string;
  phone_number: string;
  content: string;
  scheduled_for: string;
}

// Phone number search result from Twilio
export interface AvailablePhoneNumber {
  phone_number: string;
  friendly_name: string;
  locality: string | null;
  region: string | null;
  capabilities: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
}
