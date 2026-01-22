// =====================================================
// PORTAL INPUT VALIDATION
// Validation and sanitization for portal inputs
// =====================================================

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Record<string, any>;
}

/**
 * Sanitize a string by trimming and removing potentially dangerous characters
 */
export function sanitizeString(input: unknown, maxLength: number = 255): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .slice(0, maxLength)
    // Remove control characters except newlines/tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Encode HTML entities to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize string but preserve original characters (for storage, not display)
 * Only removes control characters and trims
 */
export function sanitizeForStorage(input: unknown, maxLength: number = 255): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .slice(0, maxLength)
    // Remove control characters except newlines/tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format (US format, flexible)
 */
export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;
  if (phone.length === 0) return true; // Optional field

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // Allow formats: 10 digits, or 11 digits starting with 1, or with + prefix
  const phoneRegex = /^(\+?1)?[2-9]\d{9}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate US zip code
 */
export function isValidZip(zip: unknown): boolean {
  if (typeof zip !== 'string') return false;
  if (zip.length === 0) return true; // Optional field

  // 5 digits or 5+4 format
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

/**
 * Validate US state code
 */
export function isValidState(state: unknown): boolean {
  if (typeof state !== 'string') return false;
  if (state.length === 0) return true; // Optional field

  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP' // Territories
  ];

  return validStates.includes(state.toUpperCase());
}

/**
 * Validate and sanitize customer profile updates
 */
export function validateProfileUpdate(profile: unknown): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Invalid profile data'] };
  }

  const p = profile as Record<string, unknown>;

  // Name validation
  if (p.name !== undefined) {
    if (typeof p.name !== 'string' || p.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (p.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    } else {
      sanitized.name = sanitizeForStorage(p.name, 100);
    }
  }

  // Email validation
  if (p.email !== undefined) {
    if (!isValidEmail(p.email)) {
      errors.push('Invalid email format');
    } else {
      sanitized.email = (p.email as string).toLowerCase().trim();
    }
  }

  // Phone validation
  if (p.phone !== undefined) {
    if (!isValidPhone(p.phone)) {
      errors.push('Invalid phone number format');
    } else {
      sanitized.phone = sanitizeForStorage(p.phone, 20);
    }
  }

  // Address validation
  if (p.address !== undefined) {
    if (typeof p.address === 'string' && p.address.length > 200) {
      errors.push('Address must be 200 characters or less');
    } else {
      sanitized.address = sanitizeForStorage(p.address, 200);
    }
  }

  // City validation
  if (p.city !== undefined) {
    if (typeof p.city === 'string' && p.city.length > 100) {
      errors.push('City must be 100 characters or less');
    } else {
      sanitized.city = sanitizeForStorage(p.city, 100);
    }
  }

  // State validation
  if (p.state !== undefined) {
    if (!isValidState(p.state)) {
      errors.push('Invalid state code');
    } else {
      sanitized.state = (p.state as string).toUpperCase().trim();
    }
  }

  // Zip validation
  if (p.zip !== undefined) {
    if (!isValidZip(p.zip)) {
      errors.push('Invalid zip code format');
    } else {
      sanitized.zip = sanitizeForStorage(p.zip, 10);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Validate notification preferences
 */
export function validateNotificationPreferences(prefs: unknown): ValidationResult {
  if (!prefs || typeof prefs !== 'object') {
    return { valid: false, errors: ['Invalid notification preferences'] };
  }

  const p = prefs as Record<string, unknown>;
  const sanitized: Record<string, boolean> = {};

  if (p.email !== undefined) {
    sanitized.email = Boolean(p.email);
  }

  if (p.sms !== undefined) {
    sanitized.sms = Boolean(p.sms);
  }

  return { valid: true, errors: [], sanitized };
}

/**
 * Validate AI preferences
 */
export function validateAIPreferences(prefs: unknown): ValidationResult {
  if (!prefs || typeof prefs !== 'object') {
    return { valid: false, errors: ['Invalid AI preferences'] };
  }

  const p = prefs as Record<string, unknown>;
  const sanitized: Record<string, boolean> = {};

  if (p.allowAIResponses !== undefined) {
    sanitized.allowAIResponses = Boolean(p.allowAIResponses);
  }

  if (p.preferHuman !== undefined) {
    sanitized.preferHuman = Boolean(p.preferHuman);
  }

  return { valid: true, errors: [], sanitized };
}
