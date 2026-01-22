// =====================================================
// PORTAL TRADES FEATURES - TYPE DEFINITIONS
// =====================================================

// Equipment Registry
export interface CustomerEquipment {
  id: string;
  business_id: string;
  customer_id: string;
  equipment_type: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  location_in_property?: string;
  install_date?: string;
  manufacture_date?: string;
  last_service_date?: string;
  next_service_due?: string;
  warranty_expires?: string;
  status: 'active' | 'needs_repair' | 'replaced' | 'removed';
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  photo_urls?: string[];
  notes?: string;
  portal_visible: boolean;
  maintenance_interval_months?: number;
  maintenance_reminder_days?: number;
  last_maintenance_notes?: string;
  efficiency_rating?: string;
  filter_size?: string;
  refrigerant_type?: string;
  tonnage?: number;
  fuel_type?: string;
  created_at: string;
  updated_at: string;
}

// Maintenance Reminders
export type MaintenanceReminderType = 'filter_change' | 'annual_tuneup' | 'seasonal_checkup' | 'warranty_expiring' | 'custom';
export type ReminderStatus = 'pending' | 'sent' | 'scheduled' | 'completed' | 'dismissed';
export type ReminderRecurrence = 'once' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

export interface MaintenanceReminder {
  id: string;
  business_id: string;
  customer_id: string;
  equipment_id?: string;
  reminder_type: MaintenanceReminderType;
  title: string;
  description?: string;
  due_date: string;
  status: ReminderStatus;
  sent_at?: string;
  scheduled_job_id?: string;
  completed_at?: string;
  notification_method: 'email' | 'sms' | 'both' | 'portal_only';
  recurrence?: ReminderRecurrence;
  next_reminder_date?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  equipment?: CustomerEquipment;
}

// Service History (Job with portal fields)
export interface ServiceHistoryItem {
  id: string;
  scheduled_date: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  service_type?: string;
  job_type: string;
  status: string;
  description?: string;
  customer_summary?: string;
  total_amount?: number;
  technician_name?: string;
  customer_rating?: number;
  customer_feedback?: string;
  photos?: Array<{
    id: string;
    photo_url: string;
    photo_type: string;
    caption?: string;
  }>;
  equipment?: CustomerEquipment[];
  invoice_id?: string;
  invoice_status?: string;
}

// Warranty Tracking
export type WarrantyType = 'equipment' | 'parts' | 'labor';
export type WarrantyStatus = 'active' | 'expired' | 'claimed' | 'voided';

export interface Warranty {
  id: string;
  business_id: string;
  customer_id: string;
  warranty_type: WarrantyType;
  equipment_id?: string;
  job_id?: string;
  name: string;
  description?: string;
  coverage_details?: string;
  exclusions?: string;
  provider_name?: string;
  provider_phone?: string;
  start_date: string;
  end_date: string;
  status: WarrantyStatus;
  reminder_days?: number;
  portal_visible: boolean;
  manufacturer_contact?: string;
  manufacturer_website?: string;
  registration_number?: string;
  claim_instructions?: string;
  transferable: boolean;
  deductible?: number;
  created_at: string;
  // Joined data
  equipment?: CustomerEquipment;
  claims?: WarrantyClaim[];
}

export interface WarrantyClaim {
  id: string;
  warranty_id: string;
  claim_date: string;
  claim_reason: string;
  claim_description?: string;
  status: 'submitted' | 'approved' | 'denied' | 'completed';
  resolution?: string;
  resolution_date?: string;
  repair_job_id?: string;
}

// Emergency Requests
export type EmergencyRequestType = 'emergency' | 'urgent' | 'after_hours';
export type EmergencyStatus = 'pending' | 'acknowledged' | 'dispatched' | 'resolved' | 'cancelled';

export interface EmergencyRequest {
  id: string;
  business_id: string;
  customer_id: string;
  equipment_id?: string;
  request_type: EmergencyRequestType;
  issue_description: string;
  issue_category?: string;
  photos: string[];
  contact_phone: string;
  contact_method: 'phone' | 'text' | 'either';
  is_gas_leak: boolean;
  is_flooding: boolean;
  is_no_heat: boolean;
  is_no_cooling: boolean;
  acknowledged_after_hours_rate: boolean;
  after_hours_rate_amount?: number;
  status: EmergencyStatus;
  acknowledged_at?: string;
  acknowledged_by?: string;
  dispatched_job_id?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

// Documents
export type DocumentCategory = 'contract' | 'permit' | 'license' | 'insurance' | 'manual' | 'other';
export type DocumentType = 'permit' | 'inspection_report' | 'manual' | 'warranty_card' | 'certificate' | 'contract' | 'receipt' | 'photo' | 'other';

export interface CustomerDocument {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  file_url: string;
  storage_path?: string;
  file_type?: string;
  file_size?: number;
  category: DocumentCategory;
  document_type?: DocumentType;
  tags?: string[];
  customer_id?: string;
  job_id?: string;
  equipment_id?: string;
  expires_at?: string;
  issued_date?: string;
  portal_visible: boolean;
  uploaded_by?: string;
  created_at: string;
}

// Membership / Service Agreements
export type AgreementStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type AgreementFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

export interface MembershipBenefit {
  type: string;
  description: string;
  value?: number;
}

export interface ServiceAgreement {
  id: string;
  business_id: string;
  customer_id: string;
  name: string;
  description?: string;
  frequency: AgreementFrequency;
  start_date: string;
  end_date?: string;
  next_service_date?: string;
  price_per_service?: number;
  annual_price?: number;
  status: AgreementStatus;
  portal_visible: boolean;
  membership_tier?: string;
  benefits: MembershipBenefit[];
  discount_percentage: number;
  priority_scheduling: boolean;
  free_diagnostic: boolean;
  renewal_reminder_days: number;
  auto_renew: boolean;
  services_remaining?: number;
  services_per_year?: number;
  last_service_date?: string;
  created_at: string;
  // Joined data
  equipment?: CustomerEquipment[];
  benefits_used?: MembershipBenefitUsed[];
}

export interface MembershipBenefitUsed {
  id: string;
  service_agreement_id: string;
  benefit_type: string;
  job_id?: string;
  amount_saved?: number;
  used_at: string;
  notes?: string;
}

// Estimate Approval
export type QuoteApprovalStatus = 'pending' | 'approved' | 'declined' | 'changes_requested';

export interface Quote {
  id: string;
  business_id: string;
  customer_id: string;
  job_id?: string;
  lead_id?: string;
  quote_number: string;
  status: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  valid_until?: string;
  requires_approval: boolean;
  approval_status: QuoteApprovalStatus;
  approved_at?: string;
  approved_by_name?: string;
  approved_by_email?: string;
  approval_signature_url?: string;
  decline_reason?: string;
  change_request_notes?: string;
  financing_available: boolean;
  financing_terms?: string;
  created_at: string;
  // Joined data
  items?: QuoteItem[];
  comments?: QuoteComment[];
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

export interface QuoteComment {
  id: string;
  quote_id: string;
  author_type: 'customer' | 'business';
  author_name?: string;
  author_user_id?: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// Issue Reports (Photo/Video Upload)
export type IssueType = 'not_working' | 'strange_noise' | 'leak' | 'performance' | 'other';
export type IssueUrgency = 'low' | 'medium' | 'high' | 'emergency';
export type IssueStatus = 'submitted' | 'reviewing' | 'scheduled' | 'in_progress' | 'resolved' | 'cancelled';

export interface IssueMedia {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  thumbnail?: string;
  uploadedAt: string;
}

export interface CustomerIssueReport {
  id: string;
  business_id: string;
  customer_id: string;
  equipment_id?: string;
  title: string;
  description?: string;
  issue_type?: IssueType;
  urgency: IssueUrgency;
  location_notes?: string;
  media_urls: IssueMedia[];
  preferred_contact_method: 'phone' | 'email' | 'text';
  preferred_times: string[];
  status: IssueStatus;
  reviewed_at?: string;
  reviewed_by?: string;
  scheduled_job_id?: string;
  response_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  equipment?: CustomerEquipment;
  linkedJob?: {
    id: string;
    title: string;
    status: string;
    scheduled_start?: string;
  };
}

// Referral Program
export type RewardType = 'cash' | 'credit' | 'discount_percent' | 'discount_fixed' | 'gift_card' | 'free_service';
export type ReferralStatus = 'pending' | 'contacted' | 'quoted' | 'completed' | 'reward_issued' | 'expired' | 'invalid';
export type RewardStatus = 'pending' | 'eligible' | 'issued' | 'redeemed' | 'expired';

export interface ReferralProgram {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  referrer_reward_type: RewardType;
  referrer_reward_amount: number;
  referee_reward_type?: RewardType;
  referee_reward_amount?: number;
  minimum_job_value?: number;
  valid_services: string[];
  terms_and_conditions?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  max_referrals_per_customer?: number;
  created_at: string;
}

export interface CustomerReferral {
  id: string;
  business_id: string;
  program_id: string;
  referrer_customer_id: string;
  referee_name: string;
  referee_phone?: string;
  referee_email?: string;
  referee_address?: string;
  referee_customer_id?: string;
  referral_code?: string;
  status: ReferralStatus;
  contacted_at?: string;
  quoted_at?: string;
  completed_job_id?: string;
  completed_at?: string;
  job_value?: number;
  referrer_reward_status: RewardStatus;
  referrer_reward_issued_at?: string;
  referrer_reward_redeemed_at?: string;
  referrer_reward_notes?: string;
  referee_reward_status?: RewardStatus;
  referee_reward_issued_at?: string;
  notes?: string;
  created_at: string;
  // Joined data
  program?: ReferralProgram;
}

// Portal Dashboard Summary
export interface PortalDashboardSummary {
  equipment_count: number;
  upcoming_maintenance: MaintenanceReminder[];
  recent_services: ServiceHistoryItem[];
  active_warranties: number;
  expiring_warranties: Warranty[];
  pending_estimates: Quote[];
  membership?: ServiceAgreement;
  referral_rewards_available: number;
  open_issues: CustomerIssueReport[];
}

// Portal Feature Flags
export interface PortalFeatures {
  equipment_registry: boolean;
  maintenance_reminders: boolean;
  service_history: boolean;
  warranty_tracking: boolean;
  emergency_requests: boolean;
  document_storage: boolean;
  membership_status: boolean;
  estimate_approval: boolean;
  photo_upload: boolean;
  referral_program: boolean;
}
