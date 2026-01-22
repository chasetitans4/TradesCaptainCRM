// =====================================================
// EXPORT EXPENSES API
// GET /api/expenses/export - Export expenses as CSV
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getExpenseExportData } from '@/lib/expenses';
import { parseISO, startOfMonth, endOfMonth, format } from 'date-fns';

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
        { error: 'Only administrators can export expenses' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const exportFormat = searchParams.get('format') || 'csv';
    const userId = searchParams.get('user_id');
    const categoryId = searchParams.get('category_id');
    const status = searchParams.get('status');

    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
        return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Default to current month
    const start = startDate ? parseISO(startDate) : startOfMonth(new Date());
    const end = endDate ? parseISO(endDate) : endOfMonth(new Date());

    const filters: Record<string, any> = {};
    if (userId) filters.userId = userId;
    if (categoryId) filters.categoryId = categoryId;
    if (status) filters.status = status;

    const expenses = await getExpenseExportData(
      businessId,
      start,
      end,
      filters
    );

    if (exportFormat === 'json') {
      return NextResponse.json({
        dateRange: {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
        },
        expenses,
      });
    }

    // Generate CSV
    const csvHeaders = [
      'Date',
      'Employee',
      'Category',
      'Vendor',
      'Description',
      'Amount',
      'Tax',
      'Total',
      'Payment Method',
      'Job',
      'Customer',
      'Status',
      'Reimbursable',
      'Reimbursed',
      'Billable',
      'Billed',
      'Notes',
    ];

    const csvRows = expenses.map((expense: any) => {
      const employeeName = expense.user
        ? `${expense.user.first_name || ''} ${expense.user.last_name || ''}`.trim()
        : '';
      const categoryName = expense.category?.name || '';
      const jobInfo = expense.job?.service_type || '';
      const customerName = expense.job?.customer?.name || '';

      return [
        expense.date,
        employeeName,
        categoryName,
        expense.vendor || '',
        expense.description || '',
        expense.amount || 0,
        expense.tax_amount || 0,
        expense.total_amount || 0,
        expense.payment_method || '',
        jobInfo,
        customerName,
        expense.status || '',
        expense.is_reimbursable ? 'Yes' : 'No',
        expense.is_reimbursed ? 'Yes' : 'No',
        expense.is_billable ? 'Yes' : 'No',
        expense.is_billed ? 'Yes' : 'No',
        (expense.notes || '').replace(/"/g, '""'),
      ]
        .map((val) => `"${val}"`)
        .join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="expenses-${format(start, 'yyyy-MM-dd')}-to-${format(end, 'yyyy-MM-dd')}.csv"`,
      },
    });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/expenses/export' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export expenses' },
      { status: 500 }
    );
  }
}
