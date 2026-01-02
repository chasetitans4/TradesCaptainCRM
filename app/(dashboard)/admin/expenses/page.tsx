'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Badge,
  Input,
} from '@/components/ui';
import {
  Receipt,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Download,
  Filter,
  Users,
  DollarSign,
  Eye,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { useAdminOrHigher } from '@/hooks/useAdminAuth';

interface Expense {
  id: string;
  date: string;
  vendor?: string;
  description: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  is_reimbursable: boolean;
  is_reimbursed: boolean;
  is_billable: boolean;
  receipt_url?: string;
  payment_method?: string;
  category?: { id: string; name: string; icon?: string; color?: string };
  user?: { id: string; first_name: string; last_name: string; email: string };
  job?: { id: string; service_type: string; customer?: { name: string } };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function AdminExpensesPage() {
  const { loading: authLoading, isAuthorized } = useAdminOrHigher();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('submitted');
  const [error, setError] = useState<string | null>(null);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  // Auth gating handled after hooks

  const monthEnd = endOfMonth(monthStart);

  const fetchData = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start_date: format(monthStart, 'yyyy-MM-dd'),
        end_date: format(monthEnd, 'yyyy-MM-dd'),
      });
      if (selectedEmployee !== 'all') {
        params.set('user_id', selectedEmployee);
      }
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }

      const [expensesRes, employeesRes, summaryRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`),
        fetch('/api/users?role=technician'),
        fetch(`/api/expenses/report/summary?start_date=${format(monthStart, 'yyyy-MM-dd')}&end_date=${format(monthEnd, 'yyyy-MM-dd')}`),
      ]);

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.expenses || []);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.users || []);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, monthStart, monthEnd, selectedEmployee, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      submitted: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      reimbursed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Reimbursed' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  }

  async function handleApprove(expenseIds: string[]) {
    setActionLoading(true);
    try {
      if (expenseIds.length === 1) {
        await fetch(`/api/expenses/${expenseIds[0]}/approve`, { method: 'POST' });
      } else {
        await fetch('/api/expenses/bulk-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expense_ids: expenseIds }),
        });
      }
      setSelectedExpenses(new Set());
      fetchData();
    } catch (err) {
      setError('Failed to approve expenses');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(expenseId: string, reason?: string) {
    setActionLoading(true);
    try {
      await fetch(`/api/expenses/${expenseId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      fetchData();
    } catch (err) {
      setError('Failed to reject expense');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkReimbursed(expenseIds: string[]) {
    setActionLoading(true);
    try {
      await fetch('/api/expenses/bulk-reimburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expense_ids: expenseIds }),
      });
      setSelectedExpenses(new Set());
      fetchData();
    } catch (err) {
      setError('Failed to mark expenses as reimbursed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExport(format: 'csv' | 'json' = 'csv') {
    const params = new URLSearchParams({
      start_date: format === 'csv' ? monthStart.toISOString() : monthStart.toISOString(),
      end_date: monthEnd.toISOString(),
      format,
    });
    if (selectedEmployee !== 'all') {
      params.set('user_id', selectedEmployee);
    }
    window.open(`/api/expenses/export?${params.toString()}`, '_blank');
  }

  function toggleExpense(id: string) {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedExpenses(newSelected);
  }

  function toggleAll() {
    if (selectedExpenses.size === expenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(expenses.map((e) => e.id)));
    }
  }

  const pendingCount = expenses.filter((e) => e.status === 'submitted').length;
  const selectedTotal = expenses
    .filter((e) => selectedExpenses.has(e.id))
    .reduce((sum, e) => sum + e.total_amount, 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-text">Expense Approvals</h1>
          {pendingCount > 0 && (
            <Badge variant="warning">{pendingCount} pending</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-text-muted">Total This Month</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalAmount || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-text-muted">Expense Count</p>
                <p className="text-xl font-bold">{summary.expenseCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-text-muted">Pending Approval</p>
                <p className="text-xl font-bold text-yellow-600">{summary.pendingApproval || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-text-muted">Awaiting Reimbursement</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(summary.awaitingReimbursement || 0)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMonthStart(subMonths(monthStart, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium min-w-[120px] text-center">
                  {format(monthStart, 'MMMM yyyy')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonthStart(addMonths(monthStart, 1))}
                  disabled={monthStart >= startOfMonth(new Date())}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Employee Filter */}
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[180px]">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedExpenses.size > 0 && (
          <Card className="border-primary">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text">
                  {selectedExpenses.size} selected • {formatCurrency(selectedTotal)}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(Array.from(selectedExpenses))}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkReimbursed(Array.from(selectedExpenses))}
                    disabled={actionLoading}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Mark Reimbursed
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedExpenses(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expenses.length === 0 ? (
              <div className="py-12 text-center text-text-muted">
                No expenses found for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.size === expenses.length}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-left font-medium">Employee</th>
                      <th className="px-4 py-2 text-left font-medium">Category</th>
                      <th className="px-4 py-2 text-left font-medium">Vendor/Description</th>
                      <th className="px-4 py-2 text-right font-medium">Amount</th>
                      <th className="px-4 py-2 text-center font-medium">Receipt</th>
                      <th className="px-4 py-2 text-center font-medium">Status</th>
                      <th className="px-4 py-2 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.has(expense.id)}
                            onChange={() => toggleExpense(expense.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {format(new Date(expense.date), 'MMM d')}
                        </td>
                        <td className="px-4 py-2">
                          {expense.user?.first_name} {expense.user?.last_name}
                        </td>
                        <td className="px-4 py-2">
                          {expense.category?.name || '-'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{expense.vendor || expense.description}</p>
                            {expense.vendor && (
                              <p className="text-xs text-text-muted truncate">{expense.description}</p>
                            )}
                            {expense.job && (
                              <p className="text-xs text-blue-600">Job: {expense.job.service_type}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(expense.total_amount)}
                          {expense.is_reimbursable && !expense.is_reimbursed && (
                            <span className="block text-xs text-green-600">Reimbursable</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {expense.receipt_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setViewingReceipt(expense.receipt_url!)}
                            >
                              <ImageIcon className="h-4 w-4 text-blue-600" />
                            </Button>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {getStatusBadge(expense.status)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {expense.status === 'submitted' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove([expense.id])}
                                  disabled={actionLoading}
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleReject(expense.id)}
                                  disabled={actionLoading}
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {expense.status === 'approved' && expense.is_reimbursable && !expense.is_reimbursed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 p-1 text-blue-600"
                                onClick={() => handleMarkReimbursed([expense.id])}
                                disabled={actionLoading}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Reimburse
                              </Button>
                            )}
                            {expense.status === 'approved' && !expense.is_reimbursable && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {expense.status === 'reimbursed' && (
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            )}
                            {expense.status === 'rejected' && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Modal */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Receipt</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewingReceipt(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={viewingReceipt}
                alt="Receipt"
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
