// =====================================================
// SMS CONSENT & COMPLIANCE TYPES
// =====================================================

import type { ConsentType, ConsentSource, DNCStatus } from './enums';

export interface SMSConsent {
  id: string;
  phone: string;
  consent_type: ConsentType;
  consent_source: ConsentSource;
  consent_timestamp: string;
  consent_ip: string | null;
  consent_user_agent: string | null;
  consent_form_url: string | null;
  consent_language: string | null;
  is_valid: boolean;
  revoked_at: string | null;
  revoke_method: string | null;
  created_at: string;
}

export interface SMSOptOut {
  id: string;
  phone: string;
  opted_out_at: string;
  opt_out_method: string | null;
  opt_out_keyword: string | null;
  original_campaign_id: string | null;
  created_at: string;
}

export interface SuppressionListEntry {
  id: string;
  phone: string;
  reason: string;
  source: string | null;
  added_by: string | null;
  added_at: string;
}

export interface DNCSettings {
  id: string;
  api_key: string | null;
  check_federal: boolean;
  check_state: boolean;
  check_litigator: boolean;
  check_on_create: boolean;
  recheck_after_days: number;
  cache_days: number;
  created_at: string;
  updated_at: string;
}

export interface DNCCheck {
  id: string;
  phone: string;
  contact_id: string | null;
  dnc_status: DNCStatus;
  safe_to_contact: boolean;
  response_data: Record<string, unknown> | null;
  checked_at: string;
  expires_at: string | null;
}

export interface AreaCodeTimezone {
  area_code: string;
  timezone: string;
  state: string | null;
  region: string | null;
}
