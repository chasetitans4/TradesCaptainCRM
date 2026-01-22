// =====================================================
// WEEKLY TIMESHEET REPORT API
// GET /api/timesheets/report/weekly - Get weekly summary
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startOfWeek, endOfWeek, parseISO, format, eachDayOfInterval } from 'date-fns';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const weekOf = searchParams.get('week_of') || new Date().toISOString();
    const userId = searchParams.get('user_id');

    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
        if (session.user.role === 'admin' || session.user.role === 'super_admin') {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }
        return NextResponse.json({ error: 'User business not found' }, { status: 404 });
    }

    const weekDate = parseISO(weekOf);
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

    // Build query
    let query = supabase
      .from('timesheets')
      .select(`
        *,
        user:users!timesheets_user_id_fkey(id, name)
      `)
      .eq('business_id', businessId)
      .gte('clock_in_time', format(weekStart, 'yyyy-MM-dd'))
      .lte('clock_in_time', format(weekEnd, 'yyyy-MM-dd'))
      .order('clock_in_time', { ascending: true });

    // Filter by user - technicians only see their own
    if (session.user.role === 'technician') {
      query = query.eq('user_id', session.user.id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    // Group entries by user and day
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const userSummaries: Record<string, any> = {};

    (entries || []).forEach((entry: any) => {
      const userId = entry.user_id;
      const dayKey = format(new Date(entry.clock_in_time), 'yyyy-MM-dd');

      if (!userSummaries[userId]) {
        userSummaries[userId] = {
          user: entry.user,
          days: {},
          totalHours: 0,
          totalBreakMinutes: 0,
          regularHours: 0,
          overtimeHours: 0,
        };
        days.forEach((day) => {
          userSummaries[userId].days[format(day, 'yyyy-MM-dd')] = {
            hours: 0,
            entries: [],
          };
        });
      }

      const hours = entry.total_hours || 0;
      userSummaries[userId].days[dayKey].hours += hours;
      userSummaries[userId].days[dayKey].entries.push(entry);
      userSummaries[userId].totalHours += hours;
      userSummaries[userId].totalBreakMinutes += entry.break_minutes || 0;
    });

    // Calculate overtime (over 40 hours/week)
    Object.values(userSummaries).forEach((summary: any) => {
      if (summary.totalHours > 40) {
        summary.regularHours = 40;
        summary.overtimeHours = summary.totalHours - 40;
      } else {
        summary.regularHours = summary.totalHours;
        summary.overtimeHours = 0;
      }
    });

    return NextResponse.json({
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      summaries: Object.values(userSummaries),
    });
  } catch (error) {
    apiLogger.error({ error, message: 'Error in GET /api/timesheets/report/weekly' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get weekly report' },
      { status: 500 }
    );
  }
}
