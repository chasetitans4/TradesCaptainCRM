// =====================================================
// INPUT VALIDATION & SANITIZATION
// Centralized validation utilities
// =====================================================

import { z } from 'zod';

/**
 * Sanitize string input - removes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize for SQL (basic escaping for display purposes - use parameterized queries for actual SQL)
 */
export function sanitizeForDisplay(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/['";\\]/g, '');
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  const schema = z.string().email();
  const result = schema.safeParse(email.toLowerCase().trim());
  return result.success ? result.data : null;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string | null {
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Basic validation - at least 10 digits
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return null;
  }

  return cleaned;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize URL - only allow http/https protocols
 */
export function sanitizeURL(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Common validation schemas
 */
export const schemas = {
  // User schemas
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[\d\s()-]{10,20}$/, 'Invalid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // Business schemas
  businessName: z.string().min(2).max(100),

  // Address schemas
  address: z.object({
    street: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    state: z.string().min(2).max(50),
    postalCode: z.string().min(3).max(20),
    country: z.string().default('US'),
  }),

  // Money schemas
  currency: z.number().min(0).max(999999999.99),
  percentage: z.number().min(0).max(100),

  // Date schemas
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).refine((data) => new Date(data.start) <= new Date(data.end), {
    message: 'End date must be after start date',
  }),

  // Pagination schemas
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // UUID
  uuid: z.string().uuid('Invalid ID format'),

  // Search
  searchQuery: z.string().min(1).max(200).transform(sanitizeString),
};

/**
 * Validate request body against schema
 */
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Create a typed validator function
 */
export function createValidator<T extends z.ZodSchema>(schema: T) {
  return (data: unknown) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(result.error.issues.map(i => i.message).join(', '));
    }
    return result.data as z.infer<T>;
  };
}

export default {
  sanitizeString,
  sanitizeForDisplay,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  sanitizeFilename,
  isValidUUID,
  schemas,
  validateRequest,
  formatZodErrors,
  createValidator,
};
