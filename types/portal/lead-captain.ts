// =====================================================
// Portal Lead Captain Types
// Subset of config fields exposed to client portal users
// =====================================================

import {
  ToneOption,
  CreativityLevel,
  PricingMode,
  BusinessHours,
  RecipientRole,
  NotificationTriggers,
} from '@/types/leads-captain';

// =====================================================
// PORTAL CONFIG (subset of LeadsCaptainConfig)
// =====================================================

export interface PortalLeadCaptainConfig {
  // Response Style
  tone: ToneOption;
  use_emojis: boolean;

  // AI Settings
  ai_enabled: boolean;
  ai_confidence_threshold: number; // 0-100
  ai_creativity_level: CreativityLevel;
  ai_max_messages: number;
  ai_pricing_mode: PricingMode;

  // Business Hours
  business_hours: BusinessHours;
  timezone: string;
  emergency_service: boolean;

  // Read-only (from config)
  business_name: string;
}

// Fields that can be updated via portal
export type PortalConfigUpdates = Omit<PortalLeadCaptainConfig, 'business_name'>;

// =====================================================
// PORTAL PRICE LIST ITEM
// =====================================================

export interface PortalPriceItem {
  id: string;
  service_name: string;
  price_min: number | null;
  price_max: number | null;
  price_note: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CreatePortalPriceItemRequest {
  service_name: string;
  price_min?: number | null;
  price_max?: number | null;
  price_note?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdatePortalPriceItemRequest {
  service_name?: string;
  price_min?: number | null;
  price_max?: number | null;
  price_note?: string | null;
  display_order?: number;
  is_active?: boolean;
}

// =====================================================
// PORTAL NOTIFICATION RECIPIENT
// =====================================================

export interface PortalNotificationRecipient {
  id: string;
  recipient_name: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  recipient_role: RecipientRole;

  // Methods
  notify_sms: boolean;
  notify_push: boolean;
  notify_email: boolean;

  // Triggers
  triggers: NotificationTriggers;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_except_emergency: boolean;

  is_active: boolean;
  created_at: string;
}

export interface CreatePortalNotificationRequest {
  recipient_name: string;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  recipient_role?: RecipientRole;
  notify_sms?: boolean;
  notify_push?: boolean;
  notify_email?: boolean;
  triggers?: Partial<NotificationTriggers>;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_except_emergency?: boolean;
  is_active?: boolean;
}

export interface UpdatePortalNotificationRequest extends Partial<CreatePortalNotificationRequest> {}

// =====================================================
// API RESPONSES
// =====================================================

export interface PortalConfigResponse {
  config: PortalLeadCaptainConfig | null;
  needs_setup?: boolean;
}

export interface PortalPriceListResponse {
  items: PortalPriceItem[];
  total: number;
}

export interface PortalNotificationsResponse {
  recipients: PortalNotificationRecipient[];
  total: number;
}
