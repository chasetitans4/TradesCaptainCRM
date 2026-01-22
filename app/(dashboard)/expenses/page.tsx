'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui';
import {
  Receipt,
  Loader2,
  Plus,
  Camera,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  X,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

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
  category?: { id: string; name: string; icon?: string; color?: string };
  job?: { id: string; service_type: string; customer?: { name: string } };
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    pendingApproval: 0,
    awaitingReimbursement: 0,
  });

  const monthEnd = endOfMonth(monthStart);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start_date: format(monthStart, 'yyyy-MM-dd'),
        end_date: format(monthEnd, 'yyyy-MM-dd'),
      });
      if (selectedCategory !== 'all') {
        params.set('category_id', selectedCategory);
      }
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }

      const [expensesRes, categoriesRes, summaryRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`),
        fetch('/api/expense-categories'),
        fetch(`/api/expenses/report/summary?start_date=${format(monthStart, 'yyyy-MM-dd')}&end_date=${format(monthEnd, 'yyyy-MM-dd')}`),
      ]);

      // Handle expenses response with proper error checking
      if (!expensesRes.ok) {
        console.error('Failed to load expenses:', expensesRes.status);
      } else {
        const data = await expensesRes.json();
        setExpenses(data.expenses || []);
      }

      // Handle categories response with proper error checking
      if (!categoriesRes.ok) {
        console.error('Failed to load categories:', categoriesRes.status);
      } else {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      // Handle summary response with proper error checking
      if (!summaryRes.ok) {
        console.error('Failed to load summary:', summaryRes.status);
      } else {
        const data = await summaryRes.json();
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error('Error fetching expenses:', err instanceof Error ? err.message : 'Unknown error');
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function getStatusBadge(expense: Expense) {
    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      submitted: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      reimbursed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Reimbursed' },
    };
    const style = statusStyles[expense.status] || statusStyles.pending;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  }

  function getCategoryIcon(category?: ExpenseCategory) {
    if (!category) return '📦';
    const iconMap: Record<string, string> = {
      Package: '📦',
      Wrench: '🔧',
      Hammer: '🔨',
      Fuel: '⛽',
      Car: '🚗',
      UtensilsCrossed: '🍴',
      ParkingCircle: '🅿️',
      Paperclip: '📎',
      FileCheck: '📋',
      Users: '👥',
      MoreHorizontal: '⋯',
    };
    return iconMap[category.icon || ''] || '📦';
  }

  // Group expenses by date
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const dateKey = expense.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));

  const pendingTotal = expenses
    .filter((e) => e.status === 'pending')
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
          <h1 className="text-lg font-semibold text-text">My Expenses</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/expenses/new?camera=true')}
          >
            <Camera className="h-4 w-4 mr-1" />
            Scan
          </Button>
          <Button size="sm" onClick={() => router.push('/expenses/new')}>
            <Plus className="h-4 w-4 mr-1" />
            Add
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
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-text-muted" />
                <div>
                  <p className="text-xs text-text-muted">This Month</p>
                  <p className="text-lg font-bold">{formatCurrency(summary.totalAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-text-muted">Pending</p>
                  <p className="text-lg font-bold">{summary.pendingApproval || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-text-muted">Reimbursable</p>
                  <p className="text-lg font-bold">{formatCurrency(summary.awaitingReimbursement || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setMonthStart(subMonths(monthStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium text-text">
              {format(monthStart, 'MMMM yyyy')}
            </p>
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

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {getCategoryIcon(cat)} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Draft</SelectItem>
              <SelectItem value="submitted">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="reimbursed">Reimbursed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expenses List */}
        {sortedDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No expenses this month</p>
              <Button className="mt-4" onClick={() => router.push('/expenses/new')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <div key={date}>
                <p className="text-xs text-text-muted font-medium mb-2 px-1">
                  {format(new Date(date), 'EEEE, MMM d')}
                </p>
                <Card>
                  <CardContent className="p-0 divide-y divide-border">
                    {groupedExpenses[date].map((expense) => (
                      <div
                        key={expense.id}
                        className="p-3 hover:bg-muted/30 cursor-pointer"
                        onClick={() => router.push(`/expenses/${expense.id}`)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                            style={{
                              backgroundColor: expense.category?.color
                                ? `${expense.category.color}20`
                                : '#f3f4f6',
                            }}
                          >
                            {getCategoryIcon(expense.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-text truncate">
                                  {expense.vendor || expense.description}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                  {expense.category?.name}
                                  {expense.job && (
                                    <span> • {expense.job.service_type}</span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-medium text-text">
                                  {formatCurrency(expense.total_amount)}
                                </p>
                                <div className="mt-0.5">
                                  {getStatusBadge(expense)}
                                </div>
                              </div>
                            </div>
                            {expense.receipt_url && (
                              <p className="text-xs text-blue-600 mt-1">📎 Receipt attached</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Submit All Button */}
        {pendingTotal > 0 && (
          <Card className="border-primary">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ready to Submit</p>
                  <p className="text-xs text-text-muted">
                    {expenses.filter((e) => e.status === 'pending').length} expenses • {formatCurrency(pendingTotal)}
                  </p>
                </div>
                <Button size="sm">Submit All</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
