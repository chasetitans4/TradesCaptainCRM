// =====================================================
// BOOKING SETTINGS MANAGEMENT
// Configuration for online booking availability
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface BookingSettings {
  id: string;
  businessId: string;
  isEnabled: boolean;
  bookingUrlSlug: string | null;

  // Availability
  leadTimeHours: number;
  maxDaysAhead: number;
  bufferMinutes: number;

  // Time slots
  slotDurationMinutes: number;
  availableDays: number[]; // 0=Sunday, 1=Monday, etc.
  dayStartTime: string; // HH:MM format
  dayEndTime: string;

  // Services
  enabledServices: string[];

  // Customization
  welcomeMessage: string | null;
  confirmationMessage: string | null;
  primaryColor: string;
  logoUrl: string | null;

  // Notifications
  notifyEmail: string | null;
  autoConfirm: boolean;
  calendarIntegration: boolean;
}

/**
 * Get booking settings for a business
 */
export async function getBookingSettings(businessId: string): Promise<BookingSettings | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('booking_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    businessId: data.business_id,
    isEnabled: data.is_enabled,
    bookingUrlSlug: data.booking_url_slug,
    leadTimeHours: data.lead_time_hours,
    maxDaysAhead: data.max_days_ahead,
    bufferMinutes: data.buffer_minutes,
    slotDurationMinutes: data.slot_duration_minutes,
    availableDays: data.available_days,
    dayStartTime: data.day_start_time,
    dayEndTime: data.day_end_time,
    enabledServices: data.enabled_services || [],
    welcomeMessage: data.welcome_message,
    confirmationMessage: data.confirmation_message,
    primaryColor: data.primary_color,
    logoUrl: data.logo_url,
    notifyEmail: data.notify_email,
    autoConfirm: data.auto_confirm,
    calendarIntegration: data.calendar_integration,
  };
}

/**
 * Get booking settings by URL slug (for public booking page)
 */
export async function getBookingSettingsBySlug(slug: string): Promise<{
  settings: BookingSettings;
  businessName: string;
} | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('booking_settings')
    .select(`
      *,
      business:businesses(name)
    `)
    .eq('booking_url_slug', slug)
    .eq('is_enabled', true)
    .single();

  if (!data) return null;

  return {
    settings: {
      id: data.id,
      businessId: data.business_id,
      isEnabled: data.is_enabled,
      bookingUrlSlug: data.booking_url_slug,
      leadTimeHours: data.lead_time_hours,
      maxDaysAhead: data.max_days_ahead,
      bufferMinutes: data.buffer_minutes,
      slotDurationMinutes: data.slot_duration_minutes,
      availableDays: data.available_days,
      dayStartTime: data.day_start_time,
      dayEndTime: data.day_end_time,
      enabledServices: data.enabled_services || [],
      welcomeMessage: data.welcome_message,
      confirmationMessage: data.confirmation_message,
      primaryColor: data.primary_color,
      logoUrl: data.logo_url,
      notifyEmail: data.notify_email,
      autoConfirm: data.auto_confirm,
      calendarIntegration: data.calendar_integration,
    },
    businessName: data.business?.name || '',
  };
}

/**
 * Create or update booking settings
 */
export async function upsertBookingSettings(
  businessId: string,
  settings: Partial<Omit<BookingSettings, 'id' | 'businessId'>>
): Promise<BookingSettings> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {
    business_id: businessId,
  };

  if (settings.isEnabled !== undefined) updateData.is_enabled = settings.isEnabled;
  if (settings.bookingUrlSlug !== undefined) updateData.booking_url_slug = settings.bookingUrlSlug;
  if (settings.leadTimeHours !== undefined) updateData.lead_time_hours = settings.leadTimeHours;
  if (settings.maxDaysAhead !== undefined) updateData.max_days_ahead = settings.maxDaysAhead;
  if (settings.bufferMinutes !== undefined) updateData.buffer_minutes = settings.bufferMinutes;
  if (settings.slotDurationMinutes !== undefined) updateData.slot_duration_minutes = settings.slotDurationMinutes;
  if (settings.availableDays !== undefined) updateData.available_days = settings.availableDays;
  if (settings.dayStartTime !== undefined) updateData.day_start_time = settings.dayStartTime;
  if (settings.dayEndTime !== undefined) updateData.day_end_time = settings.dayEndTime;
  if (settings.enabledServices !== undefined) updateData.enabled_services = settings.enabledServices;
  if (settings.welcomeMessage !== undefined) updateData.welcome_message = settings.welcomeMessage;
  if (settings.confirmationMessage !== undefined) updateData.confirmation_message = settings.confirmationMessage;
  if (settings.primaryColor !== undefined) updateData.primary_color = settings.primaryColor;
  if (settings.logoUrl !== undefined) updateData.logo_url = settings.logoUrl;
  if (settings.notifyEmail !== undefined) updateData.notify_email = settings.notifyEmail;
  if (settings.autoConfirm !== undefined) updateData.auto_confirm = settings.autoConfirm;
  if (settings.calendarIntegration !== undefined) updateData.calendar_integration = settings.calendarIntegration;

  const { data, error } = await supabase
    .from('booking_settings')
    .upsert(updateData, { onConflict: 'business_id' })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    businessId: data.business_id,
    isEnabled: data.is_enabled,
    bookingUrlSlug: data.booking_url_slug,
    leadTimeHours: data.lead_time_hours,
    maxDaysAhead: data.max_days_ahead,
    bufferMinutes: data.buffer_minutes,
    slotDurationMinutes: data.slot_duration_minutes,
    availableDays: data.available_days,
    dayStartTime: data.day_start_time,
    dayEndTime: data.day_end_time,
    enabledServices: data.enabled_services || [],
    welcomeMessage: data.welcome_message,
    confirmationMessage: data.confirmation_message,
    primaryColor: data.primary_color,
    logoUrl: data.logo_url,
    notifyEmail: data.notify_email,
    autoConfirm: data.auto_confirm,
    calendarIntegration: data.calendar_integration,
  };
}

/**
 * Generate a unique booking URL slug
 */
export async function generateBookingSlug(businessName: string): Promise<string> {
  const supabase = await createClient();

  // Convert to slug format
  let baseSlug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  let slug = baseSlug;
  let counter = 0;

  // Check for uniqueness
  while (true) {
    const { data } = await supabase
      .from('booking_settings')
      .select('id')
      .eq('booking_url_slug', slug)
      .single();

    if (!data) break;

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

/**
 * Check if a booking slug is available
 */
export async function isSlugAvailable(slug: string, excludeBusinessId?: string): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase
    .from('booking_settings')
    .select('id')
    .eq('booking_url_slug', slug);

  if (excludeBusinessId) {
    query = query.neq('business_id', excludeBusinessId);
  }

  const { data } = await query.single();

  return !data;
}

/**
 * Get business services for booking configuration
 */
export async function getBusinessServices(businessId: string): Promise<string[]> {
  const supabase = await createClient();

  // Get unique job types from jobs table
  const { data } = await supabase
    .from('jobs')
    .select('type')
    .eq('business_id', businessId)
    .not('type', 'is', null);

  const uniqueTypes = [...new Set(data?.map(j => j.type).filter(Boolean) || [])];

  return uniqueTypes.sort();
}

/**
 * Get booking page URL
 */
export function getBookingPageUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/book/${slug}`;
}

/**
 * Initialize default booking settings for a business
 */
export async function initializeBookingSettings(
  businessId: string,
  businessName: string,
  notifyEmail?: string
): Promise<BookingSettings> {
  const slug = await generateBookingSlug(businessName);

  return upsertBookingSettings(businessId, {
    isEnabled: false, // Disabled by default until configured
    bookingUrlSlug: slug,
    leadTimeHours: 24,
    maxDaysAhead: 30,
    bufferMinutes: 30,
    slotDurationMinutes: 60,
    availableDays: [1, 2, 3, 4, 5], // Mon-Fri
    dayStartTime: '08:00',
    dayEndTime: '17:00',
    enabledServices: [],
    welcomeMessage: `Welcome! Book an appointment with ${businessName}.`,
    confirmationMessage: 'Thank you for booking. We will confirm your appointment shortly.',
    primaryColor: '#2563eb',
    notifyEmail: notifyEmail || null,
    autoConfirm: false,
    calendarIntegration: true,
  });
}
