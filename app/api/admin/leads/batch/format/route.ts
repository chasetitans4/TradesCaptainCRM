// =====================================================
// AI LEAD FORMATTING API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/permissions/check-permission';
import { parseLeadFile, normalizeRawLead } from '@/lib/admin/csv-parser';
import { formatLeadsWithAI } from '@/lib/admin/lead-formatter';
import { RawLeadInput, AIFormatRequest } from '@/lib/admin/types';

const MAX_LEADS_FOR_AI = 100; // Limit for AI processing to control costs

/**
 * POST /api/admin/leads/batch/format
 * Format leads using AI
 */
export async function POST(request: NextRequest) {
  try {
    await checkPermission('manage_admin_leads');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    let rawLeads: RawLeadInput[];

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload for formatting
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const fileContent = await file.text();
      rawLeads = parseLeadFile(fileContent);
    } else {
      // Handle JSON body
      const body = await request.json() as AIFormatRequest;

      if (!body.raw_leads || !Array.isArray(body.raw_leads)) {
        return NextResponse.json(
          { error: 'Invalid request: raw_leads array required' },
          { status: 400 }
        );
      }

      rawLeads = body.raw_leads;
    }

    if (rawLeads.length === 0) {
      return NextResponse.json({ error: 'No leads to format' }, { status: 400 });
    }

    if (rawLeads.length > MAX_LEADS_FOR_AI) {
      return NextResponse.json(
        { error: `Too many leads for AI formatting. Maximum ${MAX_LEADS_FOR_AI} per request` },
        { status: 400 }
      );
    }

    // Format leads using AI
    const result = await formatLeadsWithAI(rawLeads);

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI formatting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to format leads' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/leads/batch/format
 * Preview basic formatting without AI (for quick preview)
 */
export async function GET(request: NextRequest) {
  try {
    await checkPermission('manage_admin_leads');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const sampleData = searchParams.get('sample');

  if (!sampleData) {
    return NextResponse.json({
      message: 'AI formatting endpoint ready',
      max_leads: MAX_LEADS_FOR_AI,
      supported_formats: ['csv', 'json'],
      usage: 'POST with file (multipart/form-data) or JSON body with raw_leads array',
    });
  }

  try {
    // Parse sample data for preview
    const rawLeads = parseLeadFile(sampleData);
    const normalizedLeads = rawLeads.map(normalizeRawLead);

    return NextResponse.json({
      preview: normalizedLeads.slice(0, 5),
      total_detected: rawLeads.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse sample' },
      { status: 400 }
    );
  }
}
