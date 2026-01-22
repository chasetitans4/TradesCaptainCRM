'use client';

import { useState, useEffect } from 'react';
import {
  PhoneCall,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCcw,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  Send,
} from 'lucide-react';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RetentionTask {
  id: string;
  crm_account_id?: string;
  web_customer_id?: string;
  agent_id: string;
  month_3_call_completed: boolean;
  month_3_call_date?: string;
  month_3_call_notes?: string;
  month_3_audit_sent: boolean;
  month_3_bonus_paid: boolean;
  month_4_retained: boolean;
  month_4_bonus_paid: boolean;
  month_6_retained: boolean;
  month_6_bonus_paid: boolean;
  month_12_retained: boolean;
  month_12_bonus_paid: boolean;
  total_retention_bonus: number;
  created_at: string;
  crm_account?: { business_name: string; created_at: string };
  web_customer?: { business_name: string; created_at: string };
}

export default function RetentionPage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [tasks, setTasks] = useState<RetentionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<RetentionTask | null>(null);
  const [callNotes, setCallNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [auditConfirm, setAuditConfirm] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });

  useEffect(() => {
    if (isAuthorized) {
      fetchTasks();
    }
  }, [isAuthorized]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/retention');
      if (!res.ok) throw new Error('Failed to fetch retention tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch retention tasks');
    } finally {
      setLoading(false);
    }
  }

  async function completeMonth3Call(taskId: string) {
    if (!callNotes.trim()) {
      setError('Please enter call notes');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/retention/${taskId}/complete-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: callNotes }),
      });
      if (!res.ok) throw new Error('Failed to complete call');
      setSelectedTask(null);
      setCallNotes('');
      fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete call');
    } finally {
      setSubmitting(false);
    }
  }

  function openAuditConfirm(taskId: string) {
    setAuditConfirm({ open: true, taskId });
  }

  async function confirmSendAudit() {
    if (!auditConfirm.taskId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/retention/${auditConfirm.taskId}/send-audit`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to send audit');
      fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send audit');
    } finally {
      setSubmitting(false);
      setAuditConfirm({ open: false, taskId: null });
    }
  }

  function getCustomerAge(createdAt: string) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    return diffMonths;
  }

  function getTaskStatus(task: RetentionTask) {
    const account = task.crm_account || task.web_customer;
    if (!account) return 'unknown';

    const ageMonths = getCustomerAge(account.created_at);

    if (ageMonths < 3) {
      return 'upcoming';
    } else if (ageMonths < 4 && !task.month_3_call_completed) {
      return 'due_month_3';
    } else if (ageMonths >= 4 && ageMonths < 6 && !task.month_4_retained) {
      return 'check_month_4';
    } else if (ageMonths >= 6 && ageMonths < 12 && !task.month_6_retained) {
      return 'check_month_6';
    } else if (ageMonths >= 12 && !task.month_12_retained) {
      return 'check_month_12';
    }
    return 'completed';
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    upcoming: { label: 'Upcoming', color: 'bg-muted text-muted-foreground', icon: Clock },
    due_month_3: { label: 'Month 3 Call Due', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: PhoneCall },
    check_month_4: { label: 'Check Month 4', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Calendar },
    check_month_6: { label: 'Check Month 6', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Calendar },
    check_month_12: { label: 'Check Month 12', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Calendar },
    completed: { label: 'On Track', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
  };

  // Sort tasks by urgency
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = ['due_month_3', 'check_month_4', 'check_month_6', 'check_month_12', 'upcoming', 'completed', 'unknown'];
    return statusOrder.indexOf(getTaskStatus(a)) - statusOrder.indexOf(getTaskStatus(b));
  });

  if (authLoading) return null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border bg-background">
        <AdminPageHeader
          title="Retention Tasks"
          description="Month 3 calls and retention milestone tracking"
          icon={PhoneCall}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTasks}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Retention Bonuses Info */}
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900 dark:text-green-100">Retention Bonuses</h3>
              <div className="text-sm text-green-700 dark:text-green-300 mt-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="font-medium">Month 3 Call:</span> $15
                </div>
                <div>
                  <span className="font-medium">Month 4 Retained:</span> $25
                </div>
                <div>
                  <span className="font-medium">Month 6 Retained:</span> $50
                </div>
                <div>
                  <span className="font-medium">Month 12 Retained:</span> $100
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <Card>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sortedTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PhoneCall className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No retention tasks found</p>
              </div>
            ) : (
              sortedTasks.map((task) => {
                const account = task.crm_account || task.web_customer;
                const taskStatus = getTaskStatus(task);
                const config = statusConfig[taskStatus];
                const StatusIcon = config.icon;
                const ageMonths = account ? getCustomerAge(account.created_at) : 0;

                return (
                  <div key={task.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            {account?.business_name || 'Unknown'}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{task.crm_account ? 'CRM' : 'Web'}</span>
                            <span>•</span>
                            <span>Customer for {ageMonths} months</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                            {task.month_3_call_completed && (
                              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Month 3 call done
                              </span>
                            )}
                            {task.month_3_audit_sent && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Audit sent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Month 3 Call Button */}
                        {taskStatus === 'due_month_3' && !task.month_3_call_completed && (
                          <Button
                            size="sm"
                            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() => setSelectedTask(task)}
                          >
                            <PhoneCall className="h-4 w-4" />
                            Log Call
                          </Button>
                        )}
                        {/* Send Audit Button */}
                        {task.month_3_call_completed && !task.month_3_audit_sent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => openAuditConfirm(task.id)}
                          >
                            <Send className="h-4 w-4" />
                            Send Audit
                          </Button>
                        )}
                        <div className="text-right ml-2">
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${task.total_retention_bonus} earned
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Milestone Tracker */}
                    <div className="mt-4 flex items-center gap-2">
                      <div className={`flex-1 h-2 rounded-full ${task.month_3_call_completed ? 'bg-green-500' : 'bg-muted'}`} title="Month 3" />
                      <div className={`flex-1 h-2 rounded-full ${task.month_4_retained ? 'bg-green-500' : 'bg-muted'}`} title="Month 4" />
                      <div className={`flex-1 h-2 rounded-full ${task.month_6_retained ? 'bg-green-500' : 'bg-muted'}`} title="Month 6" />
                      <div className={`flex-1 h-2 rounded-full ${task.month_12_retained ? 'bg-green-500' : 'bg-muted'}`} title="Month 12" />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>M3</span>
                      <span>M4</span>
                      <span>M6</span>
                      <span>M12</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Month 3 Call</DialogTitle>
            <DialogDescription>
              Customer: {selectedTask?.crm_account?.business_name || selectedTask?.web_customer?.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Call Script:</h3>
            <ol className="list-decimal list-inside text-blue-800 dark:text-blue-200 space-y-1">
              <li>Ask how they're finding the software</li>
              <li>Identify any challenges or pain points</li>
              <li>Offer tips for features they might not be using</li>
              <li>Ask about business goals and how we can help</li>
              <li>Remind them of the audit review coming up</li>
            </ol>
          </div>

          <Textarea
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="Enter call notes and key takeaways..."
            className="h-32"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSelectedTask(null); setCallNotes(''); }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedTask && completeMonth3Call(selectedTask.id)}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Complete Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Audit Confirmation Dialog */}
      <AlertDialog open={auditConfirm.open} onOpenChange={(open) => !open && setAuditConfirm({ open: false, taskId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Month 3 Audit</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the Month 3 audit review to the customer. The audit includes usage insights and recommendations based on their activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSendAudit} disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Audit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
