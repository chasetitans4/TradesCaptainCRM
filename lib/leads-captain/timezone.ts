// =====================================================
// Leads Captain Timezone Resolution Service
// Spec v1.1 Compliant - Timezone Priority & Quiet Hours
// =====================================================

import {
  TimezonePriority,
  TimezoneResolution,
  QUIET_HOURS,
} from '@/types/leads-captain';

/**
 * US Area Code to Timezone mapping
 *
 * IMPORTANT: Area code is a WEAK SIGNAL only.
 * Per spec Section 17, when location matters, AI must ask for confirmation.
 *
 * This is a simplified mapping - in production, consider using a proper
 * geocoding service for more accurate timezone resolution.
 */
const AREA_CODE_TIMEZONES: Record<string, string> = {
  // Eastern Time
  '201': 'America/New_York', '202': 'America/New_York', '203': 'America/New_York',
  '207': 'America/New_York', '212': 'America/New_York', '215': 'America/New_York',
  '216': 'America/New_York', '217': 'America/Chicago', '219': 'America/Chicago',
  '224': 'America/Chicago', '225': 'America/Chicago', '227': 'America/New_York',
  '228': 'America/Chicago', '229': 'America/New_York', '231': 'America/New_York',
  '234': 'America/New_York', '239': 'America/New_York', '240': 'America/New_York',
  '248': 'America/New_York', '251': 'America/Chicago', '252': 'America/New_York',
  '253': 'America/Los_Angeles', '254': 'America/Chicago', '256': 'America/Chicago',
  '260': 'America/New_York', '262': 'America/Chicago', '267': 'America/New_York',
  '269': 'America/New_York', '270': 'America/Chicago', '272': 'America/New_York',
  '276': 'America/New_York', '281': 'America/Chicago', '283': 'America/New_York',
  '301': 'America/New_York', '302': 'America/New_York', '303': 'America/Denver',
  '304': 'America/New_York', '305': 'America/New_York', '307': 'America/Denver',
  '308': 'America/Chicago', '309': 'America/Chicago', '310': 'America/Los_Angeles',
  '312': 'America/Chicago', '313': 'America/New_York', '314': 'America/Chicago',
  '315': 'America/New_York', '316': 'America/Chicago', '317': 'America/New_York',
  '318': 'America/Chicago', '319': 'America/Chicago', '320': 'America/Chicago',
  '321': 'America/New_York', '323': 'America/Los_Angeles', '330': 'America/New_York',
  '331': 'America/Chicago', '334': 'America/Chicago', '336': 'America/New_York',
  '337': 'America/Chicago', '339': 'America/New_York', '346': 'America/Chicago',
  '347': 'America/New_York', '351': 'America/New_York', '352': 'America/New_York',
  '360': 'America/Los_Angeles', '361': 'America/Chicago', '364': 'America/New_York',
  '380': 'America/New_York', '385': 'America/Denver', '386': 'America/New_York',
  '401': 'America/New_York', '402': 'America/Chicago', '404': 'America/New_York',
  '405': 'America/Chicago', '406': 'America/Denver', '407': 'America/New_York',
  '408': 'America/Los_Angeles', '409': 'America/Chicago', '410': 'America/New_York',
  '412': 'America/New_York', '413': 'America/New_York', '414': 'America/Chicago',
  '415': 'America/Los_Angeles', '417': 'America/Chicago', '419': 'America/New_York',
  '423': 'America/New_York', '424': 'America/Los_Angeles', '425': 'America/Los_Angeles',
  '430': 'America/Chicago', '432': 'America/Chicago', '434': 'America/New_York',
  '435': 'America/Denver', '440': 'America/New_York', '442': 'America/Los_Angeles',
  '443': 'America/New_York', '458': 'America/Los_Angeles', '463': 'America/New_York',
  '469': 'America/Chicago', '470': 'America/New_York', '475': 'America/New_York',
  '478': 'America/New_York', '479': 'America/Chicago', '480': 'America/Phoenix',
  '484': 'America/New_York', '501': 'America/Chicago', '502': 'America/New_York',
  '503': 'America/Los_Angeles', '504': 'America/Chicago', '505': 'America/Denver',
  '507': 'America/Chicago', '508': 'America/New_York', '509': 'America/Los_Angeles',
  '510': 'America/Los_Angeles', '512': 'America/Chicago', '513': 'America/New_York',
  '515': 'America/Chicago', '516': 'America/New_York', '517': 'America/New_York',
  '518': 'America/New_York', '520': 'America/Phoenix', '530': 'America/Los_Angeles',
  '531': 'America/Chicago', '534': 'America/Chicago', '539': 'America/Chicago',
  '540': 'America/New_York', '541': 'America/Los_Angeles', '551': 'America/New_York',
  '559': 'America/Los_Angeles', '561': 'America/New_York', '562': 'America/Los_Angeles',
  '563': 'America/Chicago', '567': 'America/New_York', '570': 'America/New_York',
  '571': 'America/New_York', '573': 'America/Chicago', '574': 'America/New_York',
  '575': 'America/Denver', '580': 'America/Chicago', '585': 'America/New_York',
  '586': 'America/New_York', '601': 'America/Chicago', '602': 'America/Phoenix',
  '603': 'America/New_York', '605': 'America/Chicago', '606': 'America/New_York',
  '607': 'America/New_York', '608': 'America/Chicago', '609': 'America/New_York',
  '610': 'America/New_York', '612': 'America/Chicago', '614': 'America/New_York',
  '615': 'America/Chicago', '616': 'America/New_York', '617': 'America/New_York',
  '618': 'America/Chicago', '619': 'America/Los_Angeles', '620': 'America/Chicago',
  '623': 'America/Phoenix', '626': 'America/Los_Angeles', '628': 'America/Los_Angeles',
  '629': 'America/Chicago', '630': 'America/Chicago', '631': 'America/New_York',
  '636': 'America/Chicago', '640': 'America/New_York', '641': 'America/Chicago',
  '646': 'America/New_York', '650': 'America/Los_Angeles', '651': 'America/Chicago',
  '657': 'America/Los_Angeles', '659': 'America/Chicago', '660': 'America/Chicago',
  '661': 'America/Los_Angeles', '662': 'America/Chicago', '667': 'America/New_York',
  '669': 'America/Los_Angeles', '678': 'America/New_York', '681': 'America/New_York',
  '682': 'America/Chicago', '689': 'America/New_York', '701': 'America/Chicago',
  '702': 'America/Los_Angeles', '703': 'America/New_York', '704': 'America/New_York',
  '706': 'America/New_York', '707': 'America/Los_Angeles', '708': 'America/Chicago',
  '712': 'America/Chicago', '713': 'America/Chicago', '714': 'America/Los_Angeles',
  '715': 'America/Chicago', '716': 'America/New_York', '717': 'America/New_York',
  '718': 'America/New_York', '719': 'America/Denver', '720': 'America/Denver',
  '724': 'America/New_York', '725': 'America/Los_Angeles', '727': 'America/New_York',
  '731': 'America/Chicago', '732': 'America/New_York', '734': 'America/New_York',
  '737': 'America/Chicago', '740': 'America/New_York', '743': 'America/New_York',
  '747': 'America/Los_Angeles', '754': 'America/New_York', '757': 'America/New_York',
  '760': 'America/Los_Angeles', '762': 'America/New_York', '763': 'America/Chicago',
  '765': 'America/New_York', '769': 'America/Chicago', '770': 'America/New_York',
  '772': 'America/New_York', '773': 'America/Chicago', '774': 'America/New_York',
  '775': 'America/Los_Angeles', '779': 'America/Chicago', '781': 'America/New_York',
  '785': 'America/Chicago', '786': 'America/New_York', '801': 'America/Denver',
  '802': 'America/New_York', '803': 'America/New_York', '804': 'America/New_York',
  '805': 'America/Los_Angeles', '806': 'America/Chicago', '808': 'Pacific/Honolulu',
  '810': 'America/New_York', '812': 'America/New_York', '813': 'America/New_York',
  '814': 'America/New_York', '815': 'America/Chicago', '816': 'America/Chicago',
  '817': 'America/Chicago', '818': 'America/Los_Angeles', '828': 'America/New_York',
  '830': 'America/Chicago', '831': 'America/Los_Angeles', '832': 'America/Chicago',
  '843': 'America/New_York', '845': 'America/New_York', '847': 'America/Chicago',
  '848': 'America/New_York', '850': 'America/Chicago', '854': 'America/New_York',
  '856': 'America/New_York', '857': 'America/New_York', '858': 'America/Los_Angeles',
  '859': 'America/New_York', '860': 'America/New_York', '862': 'America/New_York',
  '863': 'America/New_York', '864': 'America/New_York', '865': 'America/New_York',
  '870': 'America/Chicago', '872': 'America/Chicago', '878': 'America/New_York',
  '901': 'America/Chicago', '903': 'America/Chicago', '904': 'America/New_York',
  '906': 'America/New_York', '907': 'America/Anchorage', '908': 'America/New_York',
  '909': 'America/Los_Angeles', '910': 'America/New_York', '912': 'America/New_York',
  '913': 'America/Chicago', '914': 'America/New_York', '915': 'America/Denver',
  '916': 'America/Los_Angeles', '917': 'America/New_York', '918': 'America/Chicago',
  '919': 'America/New_York', '920': 'America/Chicago', '925': 'America/Los_Angeles',
  '928': 'America/Phoenix', '929': 'America/New_York', '930': 'America/New_York',
  '931': 'America/Chicago', '934': 'America/New_York', '936': 'America/Chicago',
  '937': 'America/New_York', '938': 'America/Chicago', '940': 'America/Chicago',
  '941': 'America/New_York', '947': 'America/New_York', '949': 'America/Los_Angeles',
  '951': 'America/Los_Angeles', '952': 'America/Chicago', '954': 'America/New_York',
  '956': 'America/Chicago', '959': 'America/New_York', '970': 'America/Denver',
  '971': 'America/Los_Angeles', '972': 'America/Chicago', '973': 'America/New_York',
  '978': 'America/New_York', '979': 'America/Chicago', '980': 'America/New_York',
  '984': 'America/New_York', '985': 'America/Chicago', '989': 'America/New_York',
};

/**
 * Resolve timezone for a customer using priority order.
 *
 * Priority per spec Section 4.5:
 * 1. Customer's known timezone (from profile)
 * 2. Service address timezone (if provided)
 * 3. Customer's phone area code → timezone mapping (WEAK SIGNAL)
 * 4. Business's default timezone (fallback)
 *
 * @param options Resolution options
 * @returns TimezoneResolution with timezone, source, and confidence
 */
export function resolveTimezone(options: {
  customerProfileTimezone?: string | null;
  serviceAddressTimezone?: string | null;
  phoneNumber?: string | null;
  businessDefaultTimezone: string;
}): TimezoneResolution {
  // Priority 1: Customer profile timezone (highest confidence)
  if (options.customerProfileTimezone && isValidTimezone(options.customerProfileTimezone)) {
    return {
      timezone: options.customerProfileTimezone,
      source: 'customer_profile',
      confidence: 'high',
    };
  }

  // Priority 2: Service address timezone
  if (options.serviceAddressTimezone && isValidTimezone(options.serviceAddressTimezone)) {
    return {
      timezone: options.serviceAddressTimezone,
      source: 'service_address',
      confidence: 'high',
    };
  }

  // Priority 3: Area code mapping (WEAK SIGNAL)
  if (options.phoneNumber) {
    const areaCodeTimezone = getTimezoneFromPhoneNumber(options.phoneNumber);
    if (areaCodeTimezone) {
      return {
        timezone: areaCodeTimezone,
        source: 'area_code',
        confidence: 'low', // Always low - area code is WEAK SIGNAL
      };
    }
  }

  // Priority 4: Business default (fallback)
  return {
    timezone: options.businessDefaultTimezone,
    source: 'business_default',
    confidence: 'medium',
  };
}

/**
 * Extract area code from phone number and get timezone
 *
 * @param phoneNumber Phone number (various formats supported)
 * @returns Timezone string or null
 */
export function getTimezoneFromPhoneNumber(phoneNumber: string): string | null {
  // Extract digits only
  const digits = phoneNumber.replace(/\D/g, '');

  // Handle various formats: +1XXXXXXXXXX, 1XXXXXXXXXX, XXXXXXXXXX
  let areaCode: string;

  if (digits.length === 11 && digits.startsWith('1')) {
    // +1 or 1 prefix
    areaCode = digits.substring(1, 4);
  } else if (digits.length === 10) {
    // No prefix
    areaCode = digits.substring(0, 3);
  } else {
    return null;
  }

  return AREA_CODE_TIMEZONES[areaCode] || null;
}

/**
 * Check if current time is within quiet hours for a timezone.
 *
 * Default quiet hours per spec: 9 PM - 8 AM local time
 *
 * @param timezone IANA timezone string
 * @param customQuietHours Optional custom quiet hours
 * @returns True if within quiet hours
 */
export function isQuietHours(
  timezone: string,
  customQuietHours?: { start: number; end: number }
): boolean {
  const quietStart = customQuietHours?.start ?? QUIET_HOURS.start;
  const quietEnd = customQuietHours?.end ?? QUIET_HOURS.end;

  // Get current hour in the specified timezone
  const now = new Date();
  const localHour = getHourInTimezone(now, timezone);

  // Quiet hours span midnight (e.g., 21-8)
  if (quietStart > quietEnd) {
    // Is current hour >= start OR < end?
    return localHour >= quietStart || localHour < quietEnd;
  }

  // Quiet hours don't span midnight (e.g., 0-8)
  return localHour >= quietStart && localHour < quietEnd;
}

/**
 * Get the current hour in a specific timezone
 */
export function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(date), 10);
  } catch {
    // Invalid timezone, fall back to UTC
    return date.getUTCHours();
  }
}

/**
 * Get next available time (end of quiet hours) in a timezone
 *
 * @param timezone IANA timezone string
 * @returns Date when quiet hours end
 */
export function getNextAvailableTime(
  timezone: string,
  customQuietHours?: { start: number; end: number }
): Date {
  const quietEnd = customQuietHours?.end ?? QUIET_HOURS.end;
  const now = new Date();
  const localHour = getHourInTimezone(now, timezone);

  // Calculate how many hours until quiet hours end
  let hoursUntilEnd: number;

  if (localHour < quietEnd) {
    // Still before end time today
    hoursUntilEnd = quietEnd - localHour;
  } else {
    // After end time, so next day
    hoursUntilEnd = 24 - localHour + quietEnd;
  }

  return new Date(now.getTime() + hoursUntilEnd * 60 * 60 * 1000);
}

/**
 * Validate that a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format time for display in a timezone
 */
export function formatTimeInTimezone(
  date: Date,
  timezone: string,
  format: 'short' | 'long' = 'short'
): string {
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(format === 'long' ? { timeZoneName: 'short' } : {}),
    });
  } catch {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}

/**
 * Get timezone abbreviation (e.g., "EST", "PST")
 */
export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Generate quiet hours message
 */
export function generateQuietHoursMessage(
  businessName: string,
  timezone: string,
  customQuietHours?: { start: number; end: number }
): string {
  const quietStart = customQuietHours?.start ?? QUIET_HOURS.start;
  const quietEnd = customQuietHours?.end ?? QUIET_HOURS.end;

  const startTime = formatHour(quietEnd); // When we START responding
  const endTime = formatHour(quietStart); // When we STOP responding
  const tzAbbrev = getTimezoneAbbreviation(timezone);

  return `Thanks for your message! We've received it and will respond during business hours (${startTime}-${endTime} ${tzAbbrev}). If this is an emergency, please call 911.`;
}

/**
 * Format hour for display (e.g., "8 AM", "9 PM")
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Check if we need to ask customer to confirm location based on area code
 *
 * Per spec Section 17: Area code is a WEAK SIGNAL.
 * When location matters for service, AI should confirm.
 *
 * @param timezoneResolution Result from resolveTimezone
 * @returns True if location confirmation is recommended
 */
export function shouldConfirmLocation(
  timezoneResolution: TimezoneResolution
): boolean {
  return timezoneResolution.source === 'area_code';
}

/**
 * Get common US timezones for UI selection
 */
export function getCommonUSTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Phoenix', label: 'Arizona (MST, no DST)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  ];
}
