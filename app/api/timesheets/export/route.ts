// =====================================================
// EXPORT TIMESHEETS API
// GET /api/timesheets/export - Export time entries as CSV
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startOfWeek, endOfWeek, parseISO, format } from 'date-fns';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins/owners can export
    if (session.user.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can export timesheets' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let businessId = session.user.businessId;

    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
        return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Parse query params
    const exportFormat = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const weekOf = searchParams.get('week_of');
    const userId = searchParams.get('user_id');

    // Calculate date range
    let rangeStart: Date;
    let rangeEnd: Date;

    if (weekOf) {
      const weekDate = parseISO(weekOf);
      rangeStart = startOfWeek(weekDate, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
    } else if (startDate && endDate) {
      rangeStart = parseISO(startDate);
      rangeEnd = parseISO(endDate);
    } else {
      // Default to current week
      rangeStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      rangeEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    // Build query
    let query = supabase
      .from('timesheets')
      .select(`
        *,
        user:users!timesheets_user_id_fkey(id, first_name, last_name, email),
        job:jobs(id, service_type, customer:customers(name))
      `)
      .eq('business_id', businessId)
      .gte('clock_in_time', format(rangeStart, 'yyyy-MM-dd'))
      .lte('clock_in_time', format(rangeEnd, 'yyyy-MM-dd'))
      .order('clock_in_time', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    if (exportFormat === 'json') {
      return NextResponse.json({
        dateRange: {
          start: format(rangeStart, 'yyyy-MM-dd'),
          end: format(rangeEnd, 'yyyy-MM-dd'),
        },
        entries,
      });
    }

    // Generate CSV
    const csvHeaders = [
      'Date',
      'Employee',
      'Email',
      'Clock In',
      'Clock Out',
      'Break (min)',
      'Total Hours',
      'Status',
      'Job',
      'Customer',
      'Notes',
    ];

    const csvRows = (entries || []).map((entry: any) => {
      const clockIn = entry.clock_in_time
        ? format(new Date(entry.clock_in_time), 'HH:mm')
        : '';
      const clockOut = entry.clock_out_time
        ? format(new Date(entry.clock_out_time), 'HH:mm')
        : '';
      const date = entry.clock_in_time
        ? format(new Date(entry.clock_in_time), 'yyyy-MM-dd')
        : '';
      const employeeName = entry.user
        ? `${entry.user.first_name || ''} ${entry.user.last_name || ''}`.trim()
        : '';
      const jobInfo = entry.job?.service_type || '';
      const customerName = entry.job?.customer?.name || '';

      return [
        date,
        employeeName,
        entry.user?.email || '',
        clockIn,
        clockOut,
        entry.break_minutes || 0,
        entry.total_hours || 0,
        entry.status || 'active',
        jobInfo,
        customerName,
        (entry.notes || '').replace(/"/g, '""'),
      ]
        .map((val) => `"${val}"`)
        .join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="timesheets-${format(rangeStart, 'yyyy-MM-dd')}-to-${format(rangeEnd, 'yyyy-MM-dd')}.csv"`,
      },
    });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in GET /api/timesheets/export' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export timesheets' },
      { status: 500 }
    );
  }
}
