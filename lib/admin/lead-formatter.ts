// =====================================================
// AI LEAD FORMATTER USING CLAUDE API
// =====================================================

import { getAnthropic, withRetry, withTimeout, parseJSONResponse } from '@/lib/leads-captain/prompts/base-prompt';
import {
  RawLeadInput,
  FormattedLeadData,
  AIFormattedLead,
  AIFormatResponse,
} from './types';
import { normalizeRawLead } from './csv-parser';

const LEAD_FORMAT_PROMPT = `You are a data cleaning specialist for sales leads in the trades industry (HVAC, Plumbing, Electrical, etc.).

For each lead, perform these transformations:
1. Company name: Fix capitalization, standardize suffixes (Inc., LLC, Corp., Co.)
2. Contact name: Fix capitalization (John Smith not john smith or JOHN SMITH)
3. Phone: Format as (XXX) XXX-XXXX for US numbers
4. Email: Lowercase only
5. Address: Standardize common abbreviations (St. -> Street, Ave. -> Avenue) but keep it concise
6. Trade type: If missing or unclear, suggest based on company name keywords (HVAC, Plumbing, Electrical, Roofing, General Contractor, etc.)
7. State: Convert to 2-letter uppercase code (California -> CA)
8. ZIP: Format consistently (12345 or 12345-6789)

Return a JSON object with this exact structure for each lead:
{
  "formatted_lead": {
    "company_name": "string",
    "contact_name": "string",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "city": "string or null",
    "state": "string or null",
    "zip": "string or null",
    "trade_type": "string or null",
    "employee_count": "string or null",
    "current_website": "string or null",
    "current_crm": "string or null",
    "notes": "string or null"
  },
  "changes": [
    { "field": "field_name", "original": "original_value", "formatted": "new_value", "reason": "why changed" }
  ],
  "confidence": 85,
  "warnings": ["any issues or missing required fields"]
}

Important:
- confidence should be 0-100 based on data quality
- Flag any leads missing company_name or contact_name as warnings
- Keep original data if it looks correct
- Only include actual changes in the changes array`;

/**
 * Format leads using Claude AI
 */
export async function formatLeadsWithAI(rawLeads: RawLeadInput[]): Promise<AIFormatResponse> {
  // First normalize the raw leads to standard field names
  const normalizedLeads = rawLeads.map(normalizeRawLead);

  // Process in batches to avoid token limits
  const BATCH_SIZE = 25;
  const allFormattedLeads: AIFormattedLead[] = [];
  let totalWarnings = 0;

  for (let i = 0; i < normalizedLeads.length; i += BATCH_SIZE) {
    const batch = normalizedLeads.slice(i, i + BATCH_SIZE);
    const batchResults = await formatBatch(batch, i);
    allFormattedLeads.push(...batchResults);
    totalWarnings += batchResults.reduce((sum, lead) => sum + lead.warnings.length, 0);
  }

  return {
    formatted_leads: allFormattedLeads,
    total_processed: allFormattedLeads.length,
    total_warnings: totalWarnings,
  };
}

/**
 * Format a batch of leads
 */
async function formatBatch(leads: FormattedLeadData[], startIndex: number): Promise<AIFormattedLead[]> {
  try {
    const anthropic = getAnthropic();

    const leadsJson = JSON.stringify(leads, null, 2);

    const result = await withRetry(async () => {
      return withTimeout(
        anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          temperature: 0.1,
          system: LEAD_FORMAT_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Please format and clean these ${leads.length} leads. Return a JSON array of formatted lead objects.\n\nLeads:\n${leadsJson}`,
            },
          ],
        }),
        30000, // 30 second timeout
        'AI formatting timed out'
      );
    });

    // Extract text from response
    const responseText = result.content[0];
    if (responseText.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the response
    const parsedResults = parseJSONResponse<AIFormattedLead[]>(responseText.text, []);

    if (!parsedResults || parsedResults.length === 0) {
      // Fall back to basic formatting if AI fails
      return leads.map((lead, idx) => createFallbackResult(lead, startIndex + idx));
    }

    // Ensure we have results for all leads
    return leads.map((lead, idx) => {
      const aiResult = parsedResults[idx];
      if (aiResult && aiResult.formatted_lead) {
        return aiResult;
      }
      return createFallbackResult(lead, startIndex + idx);
    });
  } catch (error) {
    console.error('AI formatting error:', error);
    // Return fallback results on error
    return leads.map((lead, idx) => createFallbackResult(lead, startIndex + idx));
  }
}

/**
 * Create a fallback result when AI formatting fails
 */
function createFallbackResult(lead: FormattedLeadData, rowIndex: number): AIFormattedLead {
  const warnings: string[] = [];

  // Basic formatting without AI
  const formatted: FormattedLeadData = {
    company_name: formatCompanyName(lead.company_name),
    contact_name: formatContactName(lead.contact_name),
    email: lead.email?.toLowerCase().trim(),
    phone: formatPhoneNumber(lead.phone),
    address: lead.address?.trim(),
    city: lead.city?.trim(),
    state: formatState(lead.state),
    zip: lead.zip?.trim(),
    trade_type: lead.trade_type?.trim(),
    employee_count: lead.employee_count?.trim(),
    current_website: lead.current_website?.trim(),
    current_crm: lead.current_crm?.trim(),
    notes: lead.notes?.trim(),
  };

  // Check for missing required fields
  if (!formatted.company_name) {
    warnings.push('Missing company name');
  }
  if (!formatted.contact_name) {
    warnings.push('Missing contact name');
  }

  const changes: AIFormattedLead['changes'] = [];

  // Track changes
  if (formatted.company_name !== lead.company_name) {
    changes.push({
      field: 'company_name',
      original: lead.company_name,
      formatted: formatted.company_name,
      reason: 'Standardized capitalization',
    });
  }

  if (formatted.contact_name !== lead.contact_name) {
    changes.push({
      field: 'contact_name',
      original: lead.contact_name,
      formatted: formatted.contact_name,
      reason: 'Standardized capitalization',
    });
  }

  if (formatted.phone !== lead.phone) {
    changes.push({
      field: 'phone',
      original: lead.phone || null,
      formatted: formatted.phone || null,
      reason: 'Standardized phone format',
    });
  }

  return {
    formatted_lead: formatted,
    changes,
    confidence: warnings.length > 0 ? 60 : 80,
    warnings,
  };
}

/**
 * Format company name with proper capitalization
 */
function formatCompanyName(name: string | undefined): string {
  if (!name) return '';

  // Title case with handling for common suffixes
  let formatted = name.trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Fix common suffixes
  formatted = formatted
    .replace(/\bLlc\b/gi, 'LLC')
    .replace(/\bInc\b/gi, 'Inc.')
    .replace(/\bCorp\b/gi, 'Corp.')
    .replace(/\bCo\b/gi, 'Co.')
    .replace(/\bHvac\b/gi, 'HVAC')
    .replace(/\bAc\b/gi, 'AC');

  return formatted;
}

/**
 * Format contact name with proper capitalization
 */
function formatContactName(name: string | undefined): string {
  if (!name) return '';

  return name.trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Mc|Mac)(\w)/gi, (_, prefix, letter) => prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + letter.toUpperCase())
    .replace(/\b(O')(\w)/gi, (_, prefix, letter) => prefix + letter.toUpperCase());
}

/**
 * Format phone number to (XXX) XXX-XXXX
 */
function formatPhoneNumber(phone: string | undefined): string | undefined {
  if (!phone) return undefined;

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Handle 10-digit US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle 11-digit US numbers (with leading 1)
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if format not recognized
  return phone.trim();
}

/**
 * Format state to 2-letter uppercase code
 */
function formatState(state: string | undefined): string | undefined {
  if (!state) return undefined;

  const trimmed = state.trim().toUpperCase();

  // If already 2 letters, return as-is
  if (trimmed.length === 2) {
    return trimmed;
  }

  // Map common state names to codes
  const stateMap: Record<string, string> = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC',
    // Canadian Provinces
    'ALBERTA': 'AB', 'BRITISH COLUMBIA': 'BC', 'MANITOBA': 'MB', 'NEW BRUNSWICK': 'NB',
    'NEWFOUNDLAND': 'NL', 'NOVA SCOTIA': 'NS', 'ONTARIO': 'ON', 'PRINCE EDWARD ISLAND': 'PE',
    'QUEBEC': 'QC', 'SASKATCHEWAN': 'SK',
  };

  return stateMap[trimmed] || trimmed;
}

/**
 * Format a single lead without AI (for quick preview)
 */
export function formatLeadBasic(lead: FormattedLeadData): AIFormattedLead {
  return createFallbackResult(lead, 0);
}
