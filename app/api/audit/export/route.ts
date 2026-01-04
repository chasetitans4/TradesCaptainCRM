// =====================================================
// AUDIT LOG EXPORT API
// GET /api/audit/export - Export audit log for compliance (Section 6.2)
// Supports CSV and JSON formats
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

interface AuditLogEntry {
  id: string;
  created_at: string;
  conversation_id: string | null;
  contact_id: string | null;
  contact_phone?: string | null;
  contact_name?: string | null;
  direction: string;
  message_text: string;
  trigger_event: string | null;
  actor_id: string | null;
  actor_name?: string | null;
  rule_id: string | null;
  consent_state_at_send: string | null;
  sender_type: string | null;
  delivery_status: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json or csv
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const contactId = searchParams.get('contact_id');
    const triggerType = searchParams.get('trigger_type');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createAdminClient();

    // Build query using the audit view
    let query = supabase
      .from('outreach_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    if (triggerType) {
      query = query.eq('trigger_event', triggerType);
    }

    const { data, error, count } = await query;

    if (error) {
      // If the view doesn't exist, fall back to direct query
      apiLogger.error({ error, context: 'Audit view query failed, trying direct query' });

      let fallbackQuery = supabase
        .from('outreach_messages')
        .select(`
          id,
          created_at,
          conversation_id,
          contact_id,
          direction,
          message_text,
          trigger_event,
          actor_id,
          rule_id,
          consent_state_at_send,
          sender_type,
          delivery_status
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (startDate) {
        fallbackQuery = fallbackQuery.gte('created_at', startDate);
      }
      if (endDate) {
        fallbackQuery = fallbackQuery.lte('created_at', endDate);
      }
      if (contactId) {
        fallbackQuery = fallbackQuery.eq('contact_id', contactId);
      }
      if (triggerType) {
        fallbackQuery = fallbackQuery.eq('trigger_event', triggerType);
      }

      const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;

      if (fallbackError) {
        apiLogger.error({ error: fallbackError, context: 'Fallback query also failed' });
        return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
      }

      return formatResponse(fallbackData || [], format, fallbackCount || 0, offset, limit);
    }

    return formatResponse(data || [], format, count || 0, offset, limit);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in audit export' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export audit log' },
      { status: 500 }
    );
  }
}

function formatResponse(
  data: AuditLogEntry[],
  format: string,
  total: number,
  offset: number,
  limit: number
): NextResponse {
  if (format === 'csv') {
    const csv = convertToCSV(data);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // JSON format (default)
  return NextResponse.json({
    entries: data,
    pagination: {
      total,
      offset,
      limit,
      has_more: offset + limit < total,
    },
    exported_at: new Date().toISOString(),
    // Section 6.1 compliance - every entry answers 4 questions
    schema: {
      trigger_event: 'Who/what triggered this message?',
      actor_id: 'Which user approved/sent it?',
      rule_id: 'What automation rule was involved?',
      consent_state_at_send: 'What was the consent state?',
    },
  });
}

function convertToCSV(data: AuditLogEntry[]): string {
  if (data.length === 0) {
    return 'No data to export';
  }

  // Define columns per Section 6.1 requirements
  const columns = [
    'id',
    'created_at',
    'contact_phone',
    'contact_name',
    'direction',
    'message_text',
    'trigger_event',
    'actor_name',
    'rule_id',
    'consent_state_at_send',
    'delivery_status',
  ];

  const header = columns.join(',');

  const rows = data.map((entry) => {
    return columns
      .map((col) => {
        const value = entry[col as keyof AuditLogEntry];
        if (value === null || value === undefined) return '';
        // Escape commas and quotes in CSV
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}
