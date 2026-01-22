// =====================================================
// CSV PARSER UTILITY FOR BATCH LEAD UPLOADS
// =====================================================

import { RawLeadInput, BatchUploadValidationError, FormattedLeadData } from './types';

/**
 * Parse CSV text into raw lead objects
 */
export function parseCSV(csvText: string): RawLeadInput[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => normalizeHeader(h));

  // Parse data rows
  const leads: RawLeadInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    const lead: RawLeadInput = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (value) {
        lead[header] = value;
      }
    });

    leads.push(lead);
  }

  return leads;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Normalize header names to standard field names
 */
function normalizeHeader(header: string): string {
  const h = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

  // Map common variations to standard names
  const headerMappings: Record<string, string> = {
    'company': 'company_name',
    'business': 'business_name',
    'business_name': 'business_name',
    'contact': 'contact_name',
    'name': 'name',
    'first_name': 'name',
    'full_name': 'contact_name',
    'email_address': 'email',
    'e_mail': 'email',
    'phone_number': 'phone',
    'telephone': 'phone',
    'tel': 'phone',
    'mobile': 'phone',
    'street': 'address',
    'street_address': 'address',
    'address_1': 'address',
    'addr': 'address',
    'province': 'state',
    'region': 'state',
    'zip_code': 'zip',
    'postal_code': 'zip',
    'postal': 'zip',
    'postcode': 'zip',
    'trade': 'trade_type',
    'industry': 'trade_type',
    'sector': 'trade_type',
    'employees': 'employee_count',
    'num_employees': 'employee_count',
    'size': 'employee_count',
    'website': 'current_website',
    'site': 'current_website',
    'url': 'current_website',
    'crm': 'current_crm',
    'current_software': 'current_crm',
    'software': 'current_crm',
    'comments': 'notes',
    'note': 'notes',
    'description': 'notes',
  };

  return headerMappings[h] || h;
}

/**
 * Parse JSON lead data
 */
export function parseJSON(jsonText: string): RawLeadInput[] {
  try {
    const data = JSON.parse(jsonText);

    // Handle both array and object with leads array
    const leads = Array.isArray(data) ? data : (data.leads || data.data || []);

    if (!Array.isArray(leads)) {
      throw new Error('JSON must contain an array of leads');
    }

    return leads.map((lead: Record<string, unknown>) => {
      const normalized: RawLeadInput = {};
      for (const [key, value] of Object.entries(lead)) {
        if (typeof value === 'string' || value === undefined) {
          const normalizedKey = normalizeHeader(key);
          normalized[normalizedKey] = value as string | undefined;
        } else if (value !== null) {
          // Convert numbers and other types to string
          const normalizedKey = normalizeHeader(key);
          normalized[normalizedKey] = String(value);
        }
      }
      return normalized;
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw err;
  }
}

/**
 * Normalize raw lead input to standardized field names
 */
export function normalizeRawLead(raw: RawLeadInput): FormattedLeadData {
  return {
    company_name: raw.company_name || raw.company || raw.business_name || '',
    contact_name: raw.contact_name || raw.contact || raw.name || '',
    email: raw.email || raw.email_address,
    phone: raw.phone || raw.phone_number || raw.telephone,
    address: raw.address || raw.street_address,
    city: raw.city,
    state: raw.state || raw.province,
    zip: raw.zip || raw.zip_code || raw.postal_code,
    trade_type: raw.trade_type || raw.trade || raw.industry,
    employee_count: raw.employee_count || raw.employees,
    current_website: raw.current_website || raw.website,
    current_crm: raw.current_crm || raw.crm,
    notes: raw.notes || raw.comments,
  };
}

/**
 * Validate a lead and return any errors
 */
export function validateLead(lead: FormattedLeadData, rowNumber: number): BatchUploadValidationError[] {
  const errors: BatchUploadValidationError[] = [];

  // Required fields
  if (!lead.company_name?.trim()) {
    errors.push({
      row: rowNumber,
      field: 'company_name',
      message: 'Company name is required'
    });
  }

  if (!lead.contact_name?.trim()) {
    errors.push({
      row: rowNumber,
      field: 'contact_name',
      message: 'Contact name is required'
    });
  }

  // Email format validation (if provided)
  if (lead.email && !isValidEmail(lead.email)) {
    errors.push({
      row: rowNumber,
      field: 'email',
      message: 'Invalid email format'
    });
  }

  // Phone format validation (if provided)
  if (lead.phone && !isValidPhone(lead.phone)) {
    errors.push({
      row: rowNumber,
      field: 'phone',
      message: 'Invalid phone number format'
    });
  }

  // State validation (if provided)
  if (lead.state && !isValidState(lead.state)) {
    errors.push({
      row: rowNumber,
      field: 'state',
      message: 'Invalid state code (use 2-letter abbreviation)'
    });
  }

  // Zip code validation (if provided)
  if (lead.zip && !isValidZip(lead.zip)) {
    errors.push({
      row: rowNumber,
      field: 'zip',
      message: 'Invalid ZIP code format'
    });
  }

  return errors;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number (flexible US format)
 */
function isValidPhone(phone: string): boolean {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  // US phone: 10 digits, or 11 starting with 1
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}

/**
 * Validate state code (US/Canada 2-letter)
 */
function isValidState(state: string): boolean {
  const validStates = [
    // US States
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
    // Canadian Provinces
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ];
  return validStates.includes(state.toUpperCase().trim());
}

/**
 * Validate ZIP code (US or Canadian format)
 */
function isValidZip(zip: string): boolean {
  const usZip = /^\d{5}(-\d{4})?$/;
  const caZip = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
  return usZip.test(zip.trim()) || caZip.test(zip.trim());
}

/**
 * Detect file type from content
 */
export function detectFileType(content: string): 'csv' | 'json' | 'unknown' {
  const trimmed = content.trim();

  // Check for JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }

  // Check for CSV (has commas and multiple lines)
  if (trimmed.includes(',') && trimmed.includes('\n')) {
    return 'csv';
  }

  return 'unknown';
}

/**
 * Parse file content (auto-detect format)
 */
export function parseLeadFile(content: string): RawLeadInput[] {
  const fileType = detectFileType(content);

  switch (fileType) {
    case 'csv':
      return parseCSV(content);
    case 'json':
      return parseJSON(content);
    default:
      throw new Error('Unable to detect file format. Please use CSV or JSON format.');
  }
}
