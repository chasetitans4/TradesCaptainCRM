// =====================================================
// PROOF OF WORK (TM) TYPES
//
// Homeowner-facing trust verification system
// GPS-verified timestamps, verified photos, system-generated timelines
//
// EXPLICIT LOCKS (Non-Negotiable):
//   1. Finalization delay MUST read from business.pow_finalization_delay_minutes
//      (never hard-coded in service code)
//   2. PDF export is NOT in v1 scope (Phase 2+ only)
// =====================================================

// =====================================================
// ENUMS AND LITERAL TYPES
// =====================================================

/** Proof of Work status lifecycle */
export type ProofOfWorkStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FINALIZED';

/** Job outcome type */
export type JobOutcome = 'COMPLETED' | 'DIAGNOSED' | 'PARTIAL' | 'DEFERRED';

/** Delivery channel options */
export type DeliveryChannel = 'SMS' | 'EMAIL' | 'BOTH';

/** Timeline event types */
export type TimelineEventType =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'WORK_STARTED'
  | 'PHOTOS_ADDED'
  | 'COMPLETED'
  | 'SENT';

/** Audit event types (Note: PDF_DOWNLOADED intentionally excluded - Phase 2+ only) */
export type AuditEventType =
  | 'CREATED'
  | 'FINALIZED'
  | 'VIEWED'
  | 'SHARED'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'QR_SCANNED';

/** Actor types for audit log */
export type AuditActorType = 'SYSTEM' | 'BUSINESS' | 'HOMEOWNER' | 'ANONYMOUS';

/** Photo upload source */
export type PhotoUploadSource = 'MOBILE_APP' | 'DESKTOP' | 'API' | 'UNKNOWN';

/** Short URL target types */
export type ShortUrlTargetType = 'proof_of_work' | 'invoice' | 'quote';

/** Photo verification level (0-3) */
export type PhotoVerificationLevel = 0 | 1 | 2 | 3;

// =====================================================
// CORE INTERFACES
// =====================================================

/** Main Proof of Work record */
export interface ProofOfWork {
  id: string;
  job_id: string;
  business_id: string;
  technician_id: string;
  customer_id?: string;

  // Identifiers
  public_token: string;
  short_code: string;
  reference_number: string;

  // Status
  status: ProofOfWorkStatus;

  // Service Details
  service_type: string;
  service_category?: string;
  job_outcome: JobOutcome;
  service_date: string; // DATE as ISO string

  // Privacy-safe location (no street address)
  location_city: string;
  location_state: string;
  location_zip?: string;

  // Time Tracking (immutable after capture)
  arrival_time?: string;
  departure_time?: string;
  duration_minutes?: number;

  // GPS Verification
  arrival_latitude?: number;
  arrival_longitude?: number;
  arrival_distance_meters?: number;
  location_verified: boolean;

  // Content
  summary_template_id?: string;
  summary_text: string;

  // Verification Badges
  badge_verified_business: boolean;
  badge_verified_technician: boolean;
  badge_location_verified: boolean;
  badge_photo_evidence: boolean;
  badge_timestamped: boolean;

  // Delivery
  delivery_enabled: boolean;
  delivery_channel: DeliveryChannel;
  delivery_delay_minutes: number;
  delivery_scheduled_at?: string;
  delivery_sent_at?: string;

  // QR Code Assets
  qr_code_png_url?: string;
  qr_code_svg_url?: string;

  // Analytics
  view_count: number;
  share_count: number;
  first_viewed_at?: string;

  // Metadata
  created_at: string;
  finalized_at?: string;
}

/** Timeline event for Proof of Work */
export interface ProofOfWorkTimelineEvent {
  id: string;
  proof_of_work_id: string;

  event_type: TimelineEventType;
  event_time: string;
  event_icon: string;
  event_label: string;
  verification_badge?: string;
  metadata?: Record<string, unknown>;

  created_at: string;
}

/** Audit log entry for Proof of Work */
export interface ProofOfWorkAuditEntry {
  id: string;
  proof_of_work_id: string;

  event_type: AuditEventType;
  actor_type: AuditActorType;
  actor_id?: string;

  // Request metadata (privacy-safe)
  ip_hash?: string;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;

  metadata?: Record<string, unknown>;
  created_at: string;
}

/** Summary template for work descriptions */
export interface SummaryTemplate {
  id: string;
  trade?: string;
  category?: string;
  outcome: JobOutcome;
  template_text: string;
  is_active: boolean;
  created_at: string;
}

/** Short URL redirect record */
export interface ShortUrlRedirect {
  id: string;
  short_code: string;
  target_type: ShortUrlTargetType;
  target_id: string;
  click_count: number;
  last_clicked_at?: string;
  created_at: string;
}

// =====================================================
// PHOTO VERIFICATION TYPES
// =====================================================

/** Extended job photo with verification fields */
export interface VerifiedJobPhoto {
  id: string;
  job_id?: string;
  business_id?: string;
  uploaded_by?: string;

  photo_url: string;
  storage_path?: string;
  thumbnail_url?: string;
  photo_type: string;
  caption?: string;
  notes?: string;
  taken_at: string;
  latitude?: number;
  longitude?: number;
  display_order: number;

  // Verification fields
  verification_level: PhotoVerificationLevel;
  source_verified: boolean;
  time_verified: boolean;
  location_verified: boolean;
  direct_capture: boolean;
  distance_meters?: number;
  capture_time?: string;
  locked_at?: string;
  perceptual_hash?: string;
  upload_source: PhotoUploadSource;

  created_at: string;
}

/** Photo verification result */
export interface PhotoVerificationResult {
  verification_level: PhotoVerificationLevel;
  source_verified: boolean;
  time_verified: boolean;
  location_verified: boolean;
  distance_meters?: number;
  flags: string[];
}

// =====================================================
// BUSINESS SETTINGS
// =====================================================

/** Proof of Work settings for a business */
export interface BusinessPowSettings {
  pow_enabled: boolean;
  pow_auto_delivery: boolean;
  pow_delivery_channel: DeliveryChannel;
  pow_delivery_delay_minutes: number;
  pow_show_zip: boolean;
  pow_require_photos: boolean;
  /**
   * CONFIGURABLE: Minutes after job completion before PoW is finalized.
   * Services MUST read this value from the database, never hard-code.
   */
  pow_finalization_delay_minutes: number;
}

// =====================================================
// INPUT TYPES FOR CRUD OPERATIONS
// =====================================================

/** Input for creating a new Proof of Work */
export interface CreateProofOfWorkInput {
  job_id: string;
  business_id: string;
  technician_id: string;
  customer_id?: string;

  service_type: string;
  service_category?: string;
  job_outcome?: JobOutcome;
  service_date: string;

  location_city: string;
  location_state: string;
  location_zip?: string;

  arrival_time?: string;
  departure_time?: string;

  arrival_latitude?: number;
  arrival_longitude?: number;
  arrival_distance_meters?: number;

  summary_template_id?: string;
  summary_text: string;

  delivery_enabled?: boolean;
  delivery_channel?: DeliveryChannel;
  delivery_delay_minutes?: number;
}

/** Input for updating a Proof of Work (before finalization) */
export interface UpdateProofOfWorkInput {
  status?: ProofOfWorkStatus;
  job_outcome?: JobOutcome;

  departure_time?: string;
  duration_minutes?: number;

  summary_text?: string;

  delivery_enabled?: boolean;
  delivery_channel?: DeliveryChannel;
  delivery_delay_minutes?: number;

  qr_code_png_url?: string;
  qr_code_svg_url?: string;

  // Badges (set by system during verification)
  badge_verified_business?: boolean;
  badge_verified_technician?: boolean;
  badge_location_verified?: boolean;
  badge_photo_evidence?: boolean;
  badge_timestamped?: boolean;
}

/** Input for creating a timeline event */
export interface CreateTimelineEventInput {
  proof_of_work_id: string;
  event_type: TimelineEventType;
  event_time: string;
  event_icon: string;
  event_label: string;
  verification_badge?: string;
  metadata?: Record<string, unknown>;
}

/** Input for creating an audit entry */
export interface CreateAuditEntryInput {
  proof_of_work_id: string;
  event_type: AuditEventType;
  actor_type: AuditActorType;
  actor_id?: string;
  ip_hash?: string;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  metadata?: Record<string, unknown>;
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/** Full Proof of Work with related data for public page */
export interface ProofOfWorkWithDetails {
  proofOfWork: ProofOfWork;
  timeline: ProofOfWorkTimelineEvent[];
  photos: VerifiedJobPhoto[];
  technician: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  business: {
    id: string;
    name: string;
    logo_url?: string;
    phone: string;
  };
}

/** API response for Proof of Work operations */
export interface ProofOfWorkResponse {
  success: boolean;
  data?: ProofOfWork;
  error?: string;
}

/** API response for public page data */
export interface PublicProofOfWorkResponse {
  success: boolean;
  data?: ProofOfWorkWithDetails;
  error?: string;
}

// =====================================================
// VERIFICATION CONSTANTS
// =====================================================

/** Maximum distance (meters) for location to be considered verified */
export const LOCATION_VERIFICATION_RADIUS_METERS = 500;

/** Photo verification level descriptions */
export const VERIFICATION_LEVEL_DESCRIPTIONS: Record<PhotoVerificationLevel, string> = {
  0: 'Unverified',
  1: 'Time verified',
  2: 'Time & location verified',
  3: 'Fully verified (time, location, source)',
};

/** Timeline event icons */
export const TIMELINE_EVENT_ICONS: Record<TimelineEventType, string> = {
  SCHEDULED: '📅',
  ASSIGNED: '👤',
  EN_ROUTE: '🚗',
  ARRIVED: '📍',
  WORK_STARTED: '🔧',
  PHOTOS_ADDED: '📸',
  COMPLETED: '✅',
  SENT: '📤',
};

/** Default timeline event labels */
export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  SCHEDULED: 'Job scheduled',
  ASSIGNED: 'Technician assigned',
  EN_ROUTE: 'Technician en route',
  ARRIVED: 'Arrived at location',
  WORK_STARTED: 'Work started',
  PHOTOS_ADDED: 'Photos documented',
  COMPLETED: 'Work completed',
  SENT: 'Proof of Work sent',
};

// =====================================================
// HELPER TYPES
// =====================================================

/** Badge configuration for display */
export interface VerificationBadge {
  key: keyof Pick<
    ProofOfWork,
    | 'badge_verified_business'
    | 'badge_verified_technician'
    | 'badge_location_verified'
    | 'badge_photo_evidence'
    | 'badge_timestamped'
  >;
  label: string;
  icon: string;
  description: string;
}

/** All verification badges */
export const VERIFICATION_BADGES: VerificationBadge[] = [
  {
    key: 'badge_verified_business',
    label: 'Verified Business',
    icon: '🏢',
    description: 'Business identity verified',
  },
  {
    key: 'badge_verified_technician',
    label: 'Verified Technician',
    icon: '👤',
    description: 'Technician identity verified',
  },
  {
    key: 'badge_location_verified',
    label: 'GPS Verified',
    icon: '📍',
    description: 'Location confirmed via GPS',
  },
  {
    key: 'badge_photo_evidence',
    label: 'Photo Evidence',
    icon: '📸',
    description: 'Work documented with photos',
  },
  {
    key: 'badge_timestamped',
    label: 'Time Verified',
    icon: '⏰',
    description: 'Arrival and completion times verified',
  },
];

/** QR code generation options */
export interface QrCodeOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

/** Default QR code options */
export const DEFAULT_QR_OPTIONS: QrCodeOptions = {
  width: 256,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};
