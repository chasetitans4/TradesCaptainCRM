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
  Input,
  Badge,
} from '@/components/ui';
import {
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Download,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { useAdminOrHigher } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/page-header';

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in_time: string;
  clock_out_time?: string;
  break_minutes: number;
  total_hours: number;
  notes?: string;
  status: 'active' | 'completed' | 'submitted' | 'approved' | 'rejected' | 'edited';
  user?: { id: string; name: string; email: string };
  job?: { id: string; service_type: string; customer?: { name: string } };
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface WeeklySummary {
  user: Employee;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  days: Record<string, { hours: number; entries: TimeEntry[] }>;
}

export default function AdminTimesheetsPage() {
  const { loading: authLoading, isAuthorized } = useAdminOrHigher();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([]);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        week_of: weekStart.toISOString(),
      });
      if (selectedEmployee !== 'all') {
        params.set('user_id', selectedEmployee);
      }
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }

      const [entriesRes, employeesRes, summaryRes] = await Promise.all([
        fetch(`/api/timesheets?${params.toString()}`),
        fetch('/api/admin/users?role=technician'),
        fetch(`/api/timesheets/report/weekly?week_of=${weekStart.toISOString()}`),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries || []);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.users || []);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setWeeklySummary(data.summaries || []);
      }
    } catch (err) {
      console.error('Error fetching timesheets:', err);
      setError('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [weekStart, selectedEmployee, selectedStatus]);

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

  function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Active' },
      completed: { color: 'bg-muted text-muted-foreground', label: 'Completed' },
      submitted: { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', label: 'Pending' },
      approved: { color: 'bg-green-500/10 text-green-600 dark:text-green-400', label: 'Approved' },
      rejected: { color: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Rejected' },
      edited: { color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', label: 'Edited' },
    };
    const { color, label } = variants[status] || { color: 'bg-muted text-muted-foreground', label: status };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
  }

  async function handleApprove(entryIds: string[]) {
    setActionLoading(true);
    try {
      if (entryIds.length === 1) {
        await fetch(`/api/timesheets/${entryIds[0]}/approve`, { method: 'POST' });
      } else {
        await fetch('/api/timesheets/bulk-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry_ids: entryIds }),
        });
      }
      setSelectedEntries(new Set());
      fetchData();
    } catch (err) {
      setError('Failed to approve entries');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(entryId: string, reason?: string) {
    setActionLoading(true);
    try {
      await fetch(`/api/timesheets/${entryId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      fetchData();
    } catch (err) {
      setError('Failed to reject entry');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExport(format: 'csv' | 'json' = 'csv') {
    const params = new URLSearchParams({
      week_of: weekStart.toISOString(),
      format,
    });
    if (selectedEmployee !== 'all') {
      params.set('user_id', selectedEmployee);
    }
    window.open(`/api/timesheets/export?${params.toString()}`, '_blank');
  }

  function toggleEntry(id: string) {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  }

  function toggleAll() {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map((e) => e.id)));
    }
  }

  const pendingCount = entries.filter((e) => e.status === 'submitted').length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Timesheet Management"
        description="Review and approve employee time entries."
        icon={Clock}
        actions={
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        }
      />

      <div className="space-y-6">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium min-w-[200px] text-center">
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                  disabled={weekStart >= startOfWeek(new Date(), { weekStartsOn: 1 })}
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
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="edited">Edited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        {weeklySummary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Weekly Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Employee</th>
                      <th className="px-4 py-2 text-right font-medium">Regular</th>
                      <th className="px-4 py-2 text-right font-medium">Overtime</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySummary.map((summary) => (
                      <tr key={summary.user.id} className="border-t border-border">
                        <td className="px-4 py-2">
                          {summary.user.name}
                        </td>
                        <td className="px-4 py-2 text-right">{formatHours(summary.regularHours)}</td>
                        <td className="px-4 py-2 text-right text-orange-600">
                          {summary.overtimeHours > 0 ? formatHours(summary.overtimeHours) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatHours(summary.totalHours)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedEntries.size > 0 && (
          <Card className="border-primary">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text">
                  {selectedEntries.size} {selectedEntries.size === 1 ? 'entry' : 'entries'} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(Array.from(selectedEntries))}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEntries(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <div className="py-8 text-center text-text-muted">
                No time entries found for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={selectedEntries.size === entries.length}
                          onChange={toggleAll}
                          className="rounded"
                          aria-label="Select all timesheet entries"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Employee</th>
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-left font-medium">Time</th>
                      <th className="px-4 py-2 text-right font-medium">Break</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                      <th className="px-4 py-2 text-center font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Job</th>
                      <th className="px-4 py-2 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => toggleEntry(entry.id)}
                            className="rounded"
                            aria-label={`Select timesheet for ${entry.user?.name || ''}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          {entry.user?.name}
                        </td>
                        <td className="px-4 py-2">
                          {format(new Date(entry.clock_in_time), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-2">
                          {format(new Date(entry.clock_in_time), 'h:mm a')}
                          {entry.clock_out_time && (
                            <> - {format(new Date(entry.clock_out_time), 'h:mm a')}</>
                          )}
                          {!entry.clock_out_time && (
                            <span className="text-blue-600 ml-1">(active)</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">{entry.break_minutes || 0}m</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {entry.total_hours ? formatHours(entry.total_hours) : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">{getStatusBadge(entry.status)}</td>
                        <td className="px-4 py-2 truncate max-w-[150px]">
                          {entry.job?.service_type || '-'}
                          {entry.job?.customer?.name && (
                            <span className="text-text-muted block text-xs">
                              {entry.job.customer.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {(entry.status === 'submitted' || entry.status === 'completed' || entry.status === 'edited') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove([entry.id])}
                                  disabled={actionLoading}
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleReject(entry.id)}
                                  disabled={actionLoading}
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {entry.status === 'approved' && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {entry.status === 'rejected' && (
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
    </div>
  );
}
